const Lead = require("../models/Lead");
const SiteVisit = require("../models/SiteVisit");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");
const asyncHandler = require("../utils/asyncHandler");

const dateRange = (query) => {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
        ? new Date(query.from)
        : new Date(new Date().setMonth(new Date().getMonth() - 5, 1));

    return { from, to };
};

// GET /api/reports/leads-site-visits
const leadsAndSiteVisits = asyncHandler(async (req, res) => {
    const organization = req.organizationId;
    const { from, to } = dateRange(req.query);

    const [bySource, byStage, byAgent, visitFunnel] = await Promise.all([
        Lead.aggregate([
            { $match: { organization, isActive: true, createdAt: { $gte: from, $lte: to } } },
            { $group: { _id: "$source", leads: { $sum: 1 } } },
            { $sort: { leads: -1 } },
        ]),
        Lead.aggregate([
            { $match: { organization, isActive: true, createdAt: { $gte: from, $lte: to } } },
            { $group: { _id: "$stage", leads: { $sum: 1 } } },
        ]),
        Lead.aggregate([
            { $match: { organization, isActive: true, createdAt: { $gte: from, $lte: to } } },
            {
                $group: {
                    _id: "$assignedTo",
                    leads: { $sum: 1 },
                    booked: { $sum: { $cond: [{ $eq: ["$stage", "booked"] }, 1, 0] } },
                    avgScore: { $avg: "$score" },
                },
            },
            { $sort: { leads: -1 } },
        ]),
        SiteVisit.aggregate([
            { $match: { organization, scheduledAt: { $gte: from, $lte: to } } },
            { $group: { _id: "$status", visits: { $sum: 1 } } },
        ]),
    ]);

    await Lead.populate(byAgent, { path: "_id", select: "name role", model: "User" });

    res.json({
        success: true,
        data: {
            range: { from, to },
            bySource,
            byStage,
            visitFunnel,
            byAgent: byAgent.map((row) => ({
                agent: row._id?.name || "Unassigned",
                leads: row.leads,
                booked: row.booked,
                conversion: row.leads ? +((row.booked / row.leads) * 100).toFixed(1) : 0,
                avgScore: Math.round(row.avgScore || 0),
            })),
        },
    });
});

// GET /api/reports/summary -> the All Reports screen
const summary = asyncHandler(async (req, res) => {
    const organization = req.organizationId;
    const { from, to } = dateRange(req.query);

    const [bookings, collections, expenses, pipeline] = await Promise.all([
        Booking.aggregate([
            { $match: { organization, bookingDate: { $gte: from, $lte: to } } },
            { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$totalAmount" } } },
        ]),
        Payment.aggregate([
            { $match: { organization, status: "paid", paidAt: { $gte: from, $lte: to } } },
            {
                $group: {
                    _id: { year: { $year: "$paidAt" }, month: { $month: "$paidAt" } },
                    collected: { $sum: "$amount" },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
        Expense.aggregate([
            { $match: { organization, paidAt: { $gte: from, $lte: to } } },
            { $group: { _id: "$category", spent: { $sum: "$amount" } } },
            { $sort: { spent: -1 } },
        ]),
        Lead.aggregate([
            {
                $match: {
                    organization,
                    isActive: true,
                    stage: { $nin: ["booked", "lost", "not_qualified"] },
                },
            },
            { $group: { _id: "$stage", count: { $sum: 1 }, value: { $sum: "$budgetMax" } } },
        ]),
    ]);

    res.json({
        success: true,
        data: { range: { from, to }, bookings, collections, expenses, pipeline },
    });
});

module.exports = { leadsAndSiteVisits, summary };
