const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const Commission = require("../models/Commission");
const asyncHandler = require("../utils/asyncHandler");

/* ---------------------------------------------------------
   "Collections & Finance" — the Post-Sales Manager's view.

   The owner's dashboard asks what the business earned. This one
   asks what is owed, how late it is, and what we owe partners.
   Every figure is derived from the payment schedule rather than
   stored, so it cannot drift from the receipts behind it.
   --------------------------------------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DAY = 24 * 60 * 60 * 1000;

const periodStart = (period, now) => {
    if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "ytd") return new Date(now.getFullYear(), 0, 1);

    return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
};

const previousStart = (period, now) => {
    if (period === "month") return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (period === "ytd") return new Date(now.getFullYear() - 1, 0, 1);

    return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
};

const round1 = (value) => Math.round(value * 10) / 10;
const ratio = (part, whole) => (whole ? round1((part / whole) * 100) : 0);

// GET /api/dashboard/collections?period=month|quarter|ytd&project=<id>
const collectionsOverview = asyncHandler(async (req, res) => {
    const organization = req.organizationId;
    const { period = "quarter", project } = req.query;

    const now = new Date();
    const start = periodStart(period, now);
    const prevStart = previousStart(period, now);

    const projectId =
        project && mongoose.isValidObjectId(project) ? new mongoose.Types.ObjectId(project) : null;

    /* A payment points at a booking, and only the booking knows the project,
       so a project filter has to join before it can count. */
    const withBooking = [
        {
            $lookup: {
                from: "bookings",
                localField: "booking",
                foreignField: "_id",
                as: "bookingDoc",
            },
        },
        { $unwind: { path: "$bookingDoc", preserveNullAndEmptyArrays: true } },
        ...(projectId ? [{ $match: { "bookingDoc.project": projectId } }] : []),
    ];

    const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const monthKeys = Array.from({ length: 6 }, (_, index) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
        return {
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        };
    });

    const [rows, trendRows, lastPaymentRows, commissionRows, partnerRows] = await Promise.all([
        Payment.aggregate([
            { $match: { organization } },
            ...withBooking,
            {
                $facet: {
                    // Anything still unpaid whose due date has passed.
                    overdue: [
                        { $match: { status: "due", dueDate: { $lt: now } } },
                        {
                            $group: {
                                _id: null,
                                amount: { $sum: "$amount" },
                                count: { $sum: 1 },
                            },
                        },
                    ],
                    // Overdue split by how late it is.
                    aging: [
                        { $match: { status: "due", dueDate: { $lt: now } } },
                        {
                            $project: {
                                amount: 1,
                                daysLate: {
                                    $divide: [{ $subtract: [now, "$dueDate"] }, DAY],
                                },
                            },
                        },
                        {
                            $bucket: {
                                groupBy: "$daysLate",
                                boundaries: [0, 31, 61, 91],
                                default: "90+",
                                output: { amount: { $sum: "$amount" }, count: { $sum: 1 } },
                            },
                        },
                    ],
                    // Milestones that fell due inside the period, and how much
                    // of that was actually collected. One set of rows, so the
                    // ratio can never exceed 100 percent.
                    thisPeriod: [
                        {
                            $match: {
                                status: { $in: ["due", "paid"] },
                                dueDate: { $gte: start, $lte: now },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                due: { $sum: "$amount" },
                                collected: {
                                    $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] },
                                },
                            },
                        },
                    ],
                    previousPeriod: [
                        {
                            $match: {
                                status: { $in: ["due", "paid"] },
                                dueDate: { $gte: prevStart, $lt: start },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                due: { $sum: "$amount" },
                                collected: {
                                    $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] },
                                },
                            },
                        },
                    ],
                    upcoming: [
                        {
                            $match: {
                                status: "due",
                                dueDate: { $gte: now, $lte: new Date(now.getTime() + 30 * DAY) },
                            },
                        },
                        { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
                    ],
                    // How far from its due date a receipt actually lands.
                    compliance: [
                        { $match: { status: "paid", paidAt: { $ne: null }, dueDate: { $ne: null } } },
                        {
                            $project: {
                                variance: {
                                    $divide: [{ $subtract: ["$paidAt", "$dueDate"] }, DAY],
                                },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                avgVariance: { $avg: "$variance" },
                                onTime: { $sum: { $cond: [{ $lte: ["$variance", 0] }, 1, 0] } },
                                total: { $sum: 1 },
                            },
                        },
                    ],
                    collectedInPeriod: [
                        { $match: { status: "paid", paidAt: { $gte: start, $lte: now } } },
                        { $group: { _id: null, amount: { $sum: "$amount" } } },
                    ],
                },
            },
        ]),

        Payment.aggregate([
            { $match: { organization } },
            ...withBooking,
            /* Both series are bucketed by the month the milestone fell due,
               not the month a cheque happened to clear. That is the same set
               of rows the efficiency figure divides, so the chart and the
               headline can never tell different stories. */
            {
                $match: {
                    status: { $in: ["due", "paid"] },
                    dueDate: { $gte: trendStart, $lte: now },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$dueDate" } },
                    due: { $sum: "$amount" },
                    collected: {
                        $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] },
                    },
                },
            },
        ]),

        Payment.aggregate([
            { $match: { organization, status: "paid", paidAt: { $ne: null } } },
            ...withBooking,
            { $sort: { paidAt: -1 } },
            { $limit: 1 },
            {
                $lookup: {
                    from: "units",
                    localField: "bookingDoc.unit",
                    foreignField: "_id",
                    as: "unitDoc",
                },
            },
            { $unwind: { path: "$unitDoc", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    amount: 1,
                    paidAt: 1,
                    unit: "$unitDoc.flatNo",
                    tower: "$unitDoc.tower",
                    customer: "$bookingDoc.customerName",
                },
            },
        ]),

        Commission.aggregate([
            { $match: { organization } },
            { $group: { _id: "$status", gross: { $sum: "$grossAmount" }, net: { $sum: "$netAmount" } } },
        ]),

        Commission.aggregate([
            { $match: { organization } },
            {
                $group: {
                    _id: "$channelPartner",
                    gross: { $sum: "$grossAmount" },
                    net: { $sum: "$netAmount" },
                    lines: { $sum: 1 },
                    paid: {
                        $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$netAmount", 0] },
                    },
                    pending: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["accrued", "approved"]] }, "$netAmount", 0],
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: "channelpartners",
                    localField: "_id",
                    foreignField: "_id",
                    as: "partner",
                },
            },
            { $unwind: { path: "$partner", preserveNullAndEmptyArrays: true } },
            { $sort: { gross: -1 } },
            { $limit: 12 },
        ]),
    ]);

    const f = rows[0] || {};
    const first = (list, fallback = {}) => list?.[0] || fallback;

    const overdue = first(f.overdue, { amount: 0, count: 0 });
    const thisPeriod = first(f.thisPeriod, { due: 0, collected: 0 });
    const prevPeriod = first(f.previousPeriod, { due: 0, collected: 0 });
    const upcoming = first(f.upcoming, { amount: 0, count: 0 });
    const compliance = first(f.compliance, { avgVariance: 0, onTime: 0, total: 0 });
    const collectedInPeriod = first(f.collectedInPeriod, { amount: 0 }).amount;

    // Days sales outstanding: how long the money owed would take to arrive at
    // the rate it is currently arriving.
    const daysInPeriod = Math.max(1, Math.round((now - start) / DAY));
    const dsoDays = collectedInPeriod
        ? Math.round((overdue.amount / collectedInPeriod) * daysInPeriod)
        : 0;

    const AGING_LABELS = { 0: "0-30 days", 31: "31-60 days", 61: "61-90 days", "90+": "90+ days" };

    const aging = (f.aging || []).map((bucket) => ({
        bucket: AGING_LABELS[bucket._id] ?? String(bucket._id),
        amount: bucket.amount,
        count: bucket.count,
        isCritical: bucket._id === "90+",
    }));

    const trendByMonth = new Map(trendRows.map((row) => [row._id, row]));

    const trend = monthKeys.map(({ key, label }) => {
        const row = trendByMonth.get(key) || { due: 0, collected: 0 };
        return { month: label, due: row.due, collected: row.collected };
    });

    const byStatus = Object.fromEntries(
        commissionRows.map((row) => [row._id, { gross: row.gross, net: row.net }])
    );
    const statusOf = (status, key = "net") => byStatus[status]?.[key] || 0;

    const lastPayment = lastPaymentRows[0] || null;

    res.json({
        success: true,
        data: {
            period,
            from: start,
            to: now,
            headline: {
                outstandingDues: overdue.amount,
                overdueMilestones: overdue.count,
                collectionEfficiency: ratio(thisPeriod.collected, thisPeriod.due),
                collectionEfficiencyPrev: ratio(prevPeriod.collected, prevPeriod.due),
                collected: thisPeriod.collected,
                amountDue: thisPeriod.due,
                dsoDays,
                upcomingAmount: upcoming.amount,
                upcomingCount: upcoming.count,
                lastPaymentAmount: lastPayment?.amount || 0,
                lastPaymentUnit: lastPayment
                    ? [lastPayment.tower, lastPayment.unit].filter(Boolean).join(" ")
                    : "",
                lastPaymentCustomer: lastPayment?.customer || "",
                lastPaymentDate: lastPayment?.paidAt || null,
            },
            compliance: {
                avgVarianceDays: round1(compliance.avgVariance || 0),
                onTimePercent: ratio(compliance.onTime, compliance.total),
                receiptsMeasured: compliance.total,
            },
            aging,
            trend,
            commission: {
                earned: statusOf("accrued", "gross") + statusOf("approved", "gross") + statusOf("paid", "gross"),
                dueForPayout: statusOf("approved"),
                heldOnHold: statusOf("on_hold"),
                netPaid: statusOf("paid"),
                underClawback: statusOf("reversed"),
            },
            commissionByPartner: partnerRows.map((row) => ({
                partner: row.partner?.name || row.partner?.firmName || "In-house agent",
                lines: row.lines,
                gross: row.gross,
                paid: row.paid,
                pending: row.pending,
            })),
        },
    });
});

module.exports = { collectionsOverview };
