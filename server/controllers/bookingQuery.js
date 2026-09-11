const Booking = require("../models/Booking");
const Payment = require("../models/Payment");

/**
 * Everything the bookings table needs that is not a plain field on a booking.
 *
 * A booking's collection state is not stored; it follows from what the
 * payment schedule says is payable and what has actually come in. The four
 * filter chips, the four money tiles and the per-row badge all read from the
 * one pipeline below, so they can never disagree with each other.
 *
 * The comparison is against the schedule rather than the booking's own net
 * value on purpose: a plan splits net across milestones with rounding, so a
 * fully collected booking is routinely a rupee or two under its net and would
 * otherwise be reported as part-paid forever.
 */

/** What is owed after discount, used when a booking has no schedule yet. */
const NET = { $subtract: ["$totalAmount", { $ifNull: ["$discount", 0] }] };

/**
 * Stages that attach scheduled, collected, outstanding and overdue to each
 * booking. Everything downstream works off these four fields.
 */
const collectionStages = (now = new Date()) => [
    {
        $lookup: {
            from: "payments",
            localField: "_id",
            foreignField: "booking",
            as: "milestones",
        },
    },
    {
        $addFields: {
            scheduled: {
                $cond: [
                    { $gt: [{ $size: "$milestones" }, 0] },
                    { $sum: "$milestones.amount" },
                    NET,
                ],
            },
            collected: { $ifNull: ["$receivedAmount", 0] },
            overdue: {
                $sum: {
                    $map: {
                        input: "$milestones",
                        as: "m",
                        in: {
                            $cond: [
                                {
                                    $and: [
                                        { $in: ["$$m.status", ["due", "bounced"]] },
                                        { $lt: ["$$m.dueDate", now] },
                                    ],
                                },
                                "$$m.amount",
                                0,
                            ],
                        },
                    },
                },
            },
        },
    },
    {
        $addFields: {
            outstanding: {
                $max: [{ $subtract: ["$scheduled", "$collected"] }, 0],
            },
        },
    },
    {
        $addFields: {
            paymentState: {
                $switch: {
                    branches: [
                        { case: { $lte: ["$collected", 0] }, then: "unpaid" },
                        { case: { $lte: ["$outstanding", 0] }, then: "paid" },
                    ],
                    default: "partpaid",
                },
            },
        },
    },
];

/** Booking ids in one collection state, for the list filter. */
const bookingIdsByPaymentState = async (organization, state) => {
    const match =
        state === "overdue" ? { overdue: { $gt: 0 } } : { paymentState: state };

    const rows = await Booking.aggregate([
        { $match: { organization } },
        ...collectionStages(),
        { $match: match },
        { $project: { _id: 1 } },
    ]);

    return rows.map((row) => row._id);
};

/**
 * Totals and per-state counts for one filtered set of bookings. `match` is
 * the same condition the table is listing under, so the tiles describe
 * exactly the rows underneath them.
 */
const collectionSummary = async (match) => {
    const [row] = await Booking.aggregate([
        { $match: match },
        ...collectionStages(),
        {
            $group: {
                _id: null,
                count: { $sum: 1 },
                amountInPlay: { $sum: "$totalAmount" },
                scheduled: { $sum: "$scheduled" },
                collected: { $sum: "$collected" },
                outstanding: { $sum: "$outstanding" },
                overdue: { $sum: "$overdue" },
                assigned: {
                    $sum: { $cond: [{ $ifNull: ["$assignedTo", false] }, 1, 0] },
                },
                paid: { $sum: { $cond: [{ $eq: ["$paymentState", "paid"] }, 1, 0] } },
                unpaid: { $sum: { $cond: [{ $eq: ["$paymentState", "unpaid"] }, 1, 0] } },
                partpaid: {
                    $sum: { $cond: [{ $eq: ["$paymentState", "partpaid"] }, 1, 0] },
                },
                overdueCount: { $sum: { $cond: [{ $gt: ["$overdue", 0] }, 1, 0] } },
            },
        },
    ]);

    return (
        row || {
            count: 0,
            amountInPlay: 0,
            scheduled: 0,
            collected: 0,
            outstanding: 0,
            overdue: 0,
            assigned: 0,
            paid: 0,
            unpaid: 0,
            partpaid: 0,
            overdueCount: 0,
        }
    );
};

/**
 * ?payment=paid|unpaid|partpaid|overdue
 * ?hasOwner=true  the Assigned chip; its opposite is ?assignedTo=null
 */
const extraFilter = async (query, req) => {
    const filter = {};

    if (query.hasOwner === "true") filter.assignedTo = { $ne: null };

    const state = query.payment;

    if (["paid", "unpaid", "partpaid", "overdue"].includes(state)) {
        filter._id = { $in: await bookingIdsByPaymentState(req.organizationId, state) };
    }

    return filter;
};

/**
 * Attaches each row's collection figures. Looked up only for the rows on the
 * current page, so the cost stays flat as the collection grows.
 */
const enrich = async (items, req) => {
    if (!items.length) return items;

    const ids = items.map((booking) => booking._id);
    const now = new Date();

    const rows = await Payment.aggregate([
        { $match: { organization: req.organizationId, booking: { $in: ids } } },
        {
            $group: {
                _id: "$booking",
                scheduled: { $sum: "$amount" },
                overdue: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $in: ["$status", ["due", "bounced"]] },
                                    { $lt: ["$dueDate", now] },
                                ],
                            },
                            "$amount",
                            0,
                        ],
                    },
                },
            },
        },
    ]);

    const byBooking = new Map(rows.map((row) => [String(row._id), row]));

    return items.map((booking) => {
        const found = byBooking.get(String(booking._id));

        // A booking with no schedule yet still owes its net value.
        const scheduled =
            found?.scheduled || booking.totalAmount - (booking.discount || 0);
        const collected = booking.receivedAmount || 0;
        const outstanding = Math.max(scheduled - collected, 0);

        return {
            ...booking,
            collection: {
                scheduled,
                collected,
                outstanding,
                overdue: found?.overdue || 0,
                state: collected <= 0 ? "unpaid" : outstanding <= 0 ? "paid" : "partpaid",
                isOverdue: Boolean(found?.overdue),
            },
        };
    });
};

module.exports = { extraFilter, enrich, collectionSummary };
