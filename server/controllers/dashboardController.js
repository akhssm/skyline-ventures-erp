const mongoose = require("mongoose");

const Unit = require("../models/Unit");
const Lead = require("../models/Lead");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const asyncHandler = require("../utils/asyncHandler");

const CRORE = 10000000;

// Resolves ?period=month|quarter|ytd into a start and the matching previous
// window, so every KPI can report a like-for-like comparison.
const resolvePeriod = (period = "quarter") => {
    const now = new Date();
    let start;
    let previousStart;

    if (period === "month") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    } else if (period === "ytd") {
        start = new Date(now.getFullYear(), 0, 1);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
    } else {
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), quarterMonth, 1);
        previousStart = new Date(now.getFullYear(), quarterMonth - 3, 1);
    }

    return { start, previousStart, previousEnd: start, now };
};

const sumOf = (rows) => (rows.length ? rows[0].total : 0);

// GET /api/dashboard/executive
const executiveOverview = asyncHandler(async (req, res) => {
    const organization = req.organizationId;
    const { period = "quarter", project } = req.query;
    const { start, previousStart, previousEnd } = resolvePeriod(period);

    const projectFilter = project
        ? { project: new mongoose.Types.ObjectId(project) }
        : {};

    const paidBetween = (from, to) => [
        {
            $match: {
                organization,
                status: "paid",
                paidAt: { $gte: from, $lt: to },
            },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
    ];

    const [
        revenueRows,
        previousRevenueRows,
        unitCounts,
        collectionRows,
        pipelineRows,
        lastPayment,
        momentum,
    ] = await Promise.all([
        Payment.aggregate(paidBetween(start, new Date())),
        Payment.aggregate(paidBetween(previousStart, previousEnd)),

        Unit.aggregate([
            { $match: { organization, isActive: true, ...projectFilter } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),

        // Collection efficiency looks at the milestones that fell due inside
        // this period and asks how much of that was actually collected. Both
        // halves come from the same set of rows, so the ratio cannot exceed
        // 100 percent the way a paid-vs-all-time comparison could.
        Payment.aggregate([
            {
                $match: {
                    organization,
                    status: { $in: ["due", "paid"] },
                    dueDate: { $gte: start, $lte: new Date() },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                    collected: {
                        $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] },
                    },
                },
            },
        ]),

        // Open deals: leads that are progressing but not yet booked.
        Lead.aggregate([
            {
                $match: {
                    organization,
                    isActive: true,
                    stage: { $nin: ["booked", "lost", "not_qualified"] },
                    ...projectFilter,
                },
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    total: { $sum: { $ifNull: ["$budgetMax", 0] } },
                },
            },
        ]),

        Payment.findOne({ organization, status: "paid" })
            .sort("-paidAt")
            .populate({ path: "booking", select: "bookingNo unit", populate: { path: "unit", select: "flatNo" } })
            .lean(),

        // Six buckets of bookings against collections for the momentum chart.
        Booking.aggregate([
            {
                $match: {
                    organization,
                    status: { $ne: "cancelled" },
                    bookingDate: {
                        $gte: new Date(new Date().setMonth(new Date().getMonth() - 5, 1)),
                    },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$bookingDate" },
                        month: { $month: "$bookingDate" },
                    },
                    bookings: { $sum: "$totalAmount" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
    ]);

    const statusCount = Object.fromEntries(unitCounts.map((r) => [r._id, r.count]));
    const totalUnits = unitCounts.reduce((sum, r) => sum + r.count, 0);
    const bookedUnits = (statusCount.booked || 0) + (statusCount.sold || 0);

    const revenue = sumOf(revenueRows);
    const previousRevenue = sumOf(previousRevenueRows);

    const dueInPeriod = collectionRows[0]?.total || 0;
    const collectedInPeriod = collectionRows[0]?.collected || 0;

    const collectionsByMonth = await Payment.aggregate([
        {
            $match: {
                organization,
                status: "paid",
                paidAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 5, 1)) },
            },
        },
        {
            $group: {
                _id: { year: { $year: "$paidAt" }, month: { $month: "$paidAt" } },
                collections: { $sum: "$amount" },
            },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthKey = (r) => `${r._id.year}-${r._id.month}`;
    const collectionMap = Object.fromEntries(
        collectionsByMonth.map((r) => [monthKey(r), r.collections])
    );

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    res.json({
        success: true,
        data: {
            period,
            revenue: {
                value: revenue,
                valueCr: +(revenue / CRORE).toFixed(2),
                deltaCr: +((revenue - previousRevenue) / CRORE).toFixed(2),
            },
            bookingRate: {
                percent: totalUnits ? +((bookedUnits / totalUnits) * 100).toFixed(1) : 0,
                bookedUnits,
                totalUnits,
            },
            collectionEfficiency: {
                percent: dueInPeriod
                    ? +((collectedInPeriod / dueInPeriod) * 100).toFixed(1)
                    : 0,
                collectedCr: +(collectedInPeriod / CRORE).toFixed(2),
                dueCr: +(dueInPeriod / CRORE).toFixed(2),
            },
            pipeline: {
                valueCr: +((pipelineRows[0]?.total || 0) / CRORE).toFixed(2),
                openDeals: pipelineRows[0]?.count || 0,
            },
            lastPayment: lastPayment
                ? {
                      amount: lastPayment.amount,
                      amountLakh: +(lastPayment.amount / 100000).toFixed(2),
                      flatNo: lastPayment.booking?.unit?.flatNo || "",
                      paidAt: lastPayment.paidAt,
                  }
                : null,
            inventoryMix: statusCount,
            momentum: momentum.map((row) => ({
                label: monthNames[row._id.month - 1],
                bookings: +(row.bookings / CRORE).toFixed(1),
                collections: +((collectionMap[monthKey(row)] || 0) / CRORE).toFixed(1),
            })),
        },
    });
});

module.exports = { executiveOverview };
