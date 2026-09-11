const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Unit = require("../models/Unit");
const Payment = require("../models/Payment");
const PaymentPlan = require("../models/PaymentPlan");
const Commission = require("../models/Commission");
const Configuration = require("../models/Configuration");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { collectionSummary } = require("./bookingQuery");

// Escapes a user-supplied search term before it becomes a regex.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * The same conditions the list applies, minus the payment chip, so the tiles
 * describe exactly the rows the table is showing. The payment chip is left
 * out on purpose: its own counts are measured over the unfiltered set, or
 * picking one chip would zero the other three.
 */
const scopeFilter = (req) => {
    const filter = {
        organization: req.organizationId,
        status: req.query.status || "pending",
    };

    if (req.query.project) filter.project = new mongoose.Types.ObjectId(req.query.project);
    if (req.query.saleType) filter.saleType = req.query.saleType;
    if (req.query.assignedTo === "null") filter.assignedTo = null;
    if (req.query.hasOwner === "true") filter.assignedTo = { $ne: null };

    if (req.query.search) {
        const term = new RegExp(escapeRegex(String(req.query.search)), "i");
        filter.$or = [{ customerName: term }, { customerPhone: term }, { bookingNo: term }];
    }

    return filter;
};

// GET /api/bookings/stats -> the header line, the money tiles and the chips
const stats = asyncHandler(async (req, res) => {
    const organization = req.organizationId;

    const [byStatus, summary] = await Promise.all([
        Booking.aggregate([
            { $match: { organization } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        collectionSummary(scopeFilter(req)),
    ]);

    res.json({
        success: true,
        data: {
            counts: Object.fromEntries(byStatus.map((r) => [r._id, r.count])),
            status: req.query.status || "pending",
            total: summary.count,
            amountInPlay: summary.amountInPlay,
            assigned: summary.assigned,
            unassigned: summary.count - summary.assigned,
            money: {
                scheduled: summary.scheduled,
                collected: summary.collected,
                outstanding: summary.outstanding,
                overdue: summary.overdue,
            },
            payment: {
                all: summary.count,
                paid: summary.paid,
                partpaid: summary.partpaid,
                unpaid: summary.unpaid,
                overdue: summary.overdueCount,
            },
        },
    });
});

// PATCH /api/bookings/:id/assign  body: { assignedTo }
const assign = asyncHandler(async (req, res) => {
    const booking = await Booking.findOneAndUpdate(
        { _id: req.params.id, organization: req.organizationId },
        { assignedTo: req.body.assignedTo || null, updatedBy: req.user._id },
        { returnDocument: "after" }
    ).populate("assignedTo", "name");

    if (!booking) throw ApiError.notFound("Booking not found");

    res.json({ success: true, data: booking });
});

// PATCH /api/bookings/:id/status  body: { status, reason, refundAmount }
// Confirming a booking also marks the unit sold and generates the schedule,
// so the three writes run inside one transaction.
const changeStatus = asyncHandler(async (req, res) => {
    const { status, reason = "", refundAmount = 0 } = req.body;

    if (!Booking.BOOKING_STATUSES.includes(status)) {
        throw ApiError.badRequest(`Unknown booking status "${status}"`);
    }

    const session = await mongoose.startSession();

    try {
        let booking;

        await session.withTransaction(async () => {
            booking = await Booking.findOne({
                _id: req.params.id,
                organization: req.organizationId,
            }).session(session);

            if (!booking) throw ApiError.notFound("Booking not found");

            booking.status = status;
            booking.updatedBy = req.user._id;

            if (status === "cancelled") {
                booking.cancelledAt = new Date();
                booking.cancelReason = reason;
            }

            if (status === "refund") booking.refundAmount = refundAmount;

            await booking.save({ session });

            // The unit follows the booking so inventory never goes stale.
            const unitStatus =
                status === "confirmed" || status === "completed"
                    ? "sold"
                    : status === "pending"
                      ? "booked"
                      : "available";

            await Unit.updateOne(
                { _id: booking.unit, organization: req.organizationId },
                { status: unitStatus },
                { session }
            );

            if (status === "confirmed") {
                await generateSchedule(booking, req, session);
            }
        });

        res.json({ success: true, data: booking });
    } finally {
        await session.endSession();
    }
});

// Turns the booking's payment plan into one due Payment row per milestone.
const generateSchedule = async (booking, req, session) => {
    const existing = await Payment.countDocuments({ booking: booking._id }).session(session);

    if (existing > 0) return;

    const plan = booking.paymentPlan
        ? await PaymentPlan.findById(booking.paymentPlan).session(session)
        : null;

    if (!plan || !plan.milestones.length) return;

    const net = booking.totalAmount - booking.discount;

    const rows = plan.milestones.map((milestone, index) => ({
        organization: req.organizationId,
        createdBy: req.user._id,
        receiptNo: `${booking.bookingNo}-M${index + 1}`,
        booking: booking._id,
        milestoneLabel: milestone.label,
        amount: Math.round((net * milestone.percentage) / 100),
        dueDate: new Date(
            booking.bookingDate.getTime() + milestone.dueAfterDays * 24 * 60 * 60 * 1000
        ),
        status: "due",
    }));

    await Payment.insertMany(rows, { session });
};

// POST /api/bookings/:id/receipt
// body: { payment, amount, paidAt, mode, referenceNo, remarks }
// Marks one milestone received and moves the booking's collected total with
// it, so the balance in the drawer and the collection KPIs never drift.
const receivePayment = asyncHandler(async (req, res) => {
    const { payment: paymentId, amount, paidAt, mode, referenceNo = "", remarks = "" } = req.body;

    if (!paymentId) throw ApiError.badRequest("Pick the milestone this receipt settles.");

    const received = Number(amount);

    if (!Number.isFinite(received) || received <= 0) {
        throw ApiError.badRequest("Enter the amount received.");
    }

    const session = await mongoose.startSession();

    try {
        let payment;

        await session.withTransaction(async () => {
            const booking = await Booking.findOne({
                _id: req.params.id,
                organization: req.organizationId,
            }).session(session);

            if (!booking) throw ApiError.notFound("Booking not found");

            payment = await Payment.findOne({
                _id: paymentId,
                booking: booking._id,
                organization: req.organizationId,
            }).session(session);

            if (!payment) throw ApiError.notFound("Milestone not found on this booking");

            if (payment.status === "paid") {
                throw ApiError.badRequest("That milestone is already receipted.");
            }

            payment.amount = received;
            payment.paidAt = paidAt ? new Date(paidAt) : new Date();
            payment.mode = mode || payment.mode;
            payment.referenceNo = referenceNo;
            payment.remarks = remarks;
            payment.status = "paid";
            payment.updatedBy = req.user._id;

            await payment.save({ session });

            booking.receivedAmount += received;
            booking.updatedBy = req.user._id;

            await booking.save({ session });
        });

        res.json({ success: true, data: payment });
    } finally {
        await session.endSession();
    }
});

// POST /api/bookings/:id/commission  body: { channelPartner, percentage }
const raiseCommission = asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({
        _id: req.params.id,
        organization: req.organizationId,
    });

    if (!booking) throw ApiError.notFound("Booking not found");

    // One ledger line per booking; raising it twice would pay twice.
    const existing = await Commission.findOne({
        booking: booking._id,
        organization: req.organizationId,
    });

    if (existing) {
        throw new ApiError(409, "A commission has already been raised on this booking.");
    }

    const config = await Configuration.findOne({ organization: req.organizationId }).lean();

    const commission = await Commission.create({
        organization: req.organizationId,
        createdBy: req.user._id,
        booking: booking._id,
        channelPartner: req.body.channelPartner || booking.channelPartner,
        agent: booking.soldBy,
        bookingValue: booking.totalAmount,
        percentage: req.body.percentage ?? config?.defaultCommissionPercent ?? 2,
        tdsPercent: req.body.tdsPercent ?? config?.defaultTdsPercent ?? 5,
    });

    res.status(201).json({ success: true, data: commission });
});

module.exports = { stats, assign, changeStatus, receivePayment, raiseCommission };
