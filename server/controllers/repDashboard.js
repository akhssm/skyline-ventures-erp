const mongoose = require("mongoose");

const Lead = require("../models/Lead");
const SiteVisit = require("../models/SiteVisit");
const Quotation = require("../models/Quotation");
const FollowUp = require("../models/FollowUp");
const CallLog = require("../models/CallLog");
const asyncHandler = require("../utils/asyncHandler");

/* ---------------------------------------------------------
   "My Dashboard" — the CRM Executive's own book.

   Everything here is narrowed to the signed-in user before it
   is counted. A manager's dashboard answers "how is the team
   doing"; this one answers "what needs me today".
   --------------------------------------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const OPEN_STAGES = [
    "new",
    "contacted",
    "prospect",
    "site_scheduled",
    "site_rescheduled",
    "site_visited",
    "negotiation",
];

const STAGE_LABELS = {
    new: "New",
    contacted: "Contacted",
    prospect: "Prospect",
    site_scheduled: "Site scheduled",
    site_rescheduled: "Site rescheduled",
    site_visited: "Site visited",
    negotiation: "Negotiation",
    booked: "Booked",
    lost: "Lost",
    not_qualified: "Not qualified",
};

const SOURCE_LABELS = {
    website: "Website",
    walk_in: "Walk-in",
    facebook: "Facebook",
    instagram: "Instagram",
    google_ads: "Google Ads",
    magicbricks: "MagicBricks",
    "99acres": "99acres",
    housing: "Housing.com",
    channel_partner: "Channel partner",
    referral: "Referral",
    other: "Other",
};

const OUTCOME_LABELS = {
    answered: "Answered",
    no_answer: "No answer",
    busy: "Busy",
    switched_off: "Switched off",
    invalid: "Invalid number",
};

const VISIT_LABELS = {
    pending: "Pending",
    scheduled: "Scheduled",
    rescheduled: "Rescheduled",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No show",
};

const periodStart = (period, now) => {
    if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "ytd") return new Date(now.getFullYear(), 0, 1);

    return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const round1 = (value) => Math.round(value * 10) / 10;
const ratio = (part, whole) => (whole ? round1((part / whole) * 100) : 0);

const labelled = (rows, labels, fallback = "Not set") =>
    rows
        .map((row) => ({ name: labels[row._id] || (row._id ? String(row._id) : fallback), value: row.count }))
        .sort((a, b) => b.value - a.value);

// GET /api/dashboard/rep?period=month|quarter|ytd&project=<id>
const repOverview = asyncHandler(async (req, res) => {
    const organization = req.organizationId;
    const me = req.user._id;
    const { period = "quarter", project } = req.query;

    const now = new Date();
    const start = periodStart(period, now);
    const today = startOfDay(now);

    const projectId =
        project && mongoose.isValidObjectId(project) ? new mongoose.Types.ObjectId(project) : null;
    const inProject = projectId ? { project: projectId } : {};

    // Everything below is pinned to this user, not just to the organisation.
    const mine = { organization, assignedTo: me, ...inProject };
    const leadMatch = { ...mine, createdAt: { $gte: start, $lte: now } };

    const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const monthKeys = Array.from({ length: 6 }, (_, index) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
        return {
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        };
    });

    // The week the visit counter talks about: Monday to Sunday around today.
    const weekStart = addDays(today, -((today.getDay() + 6) % 7));
    const weekEnd = addDays(weekStart, 7);

    // Follow-up buckets, exactly the ones the Follow-ups module offers.
    const bucketRanges = [
        { name: "Overdue", from: null, to: today, urgent: true },
        { name: "Today", from: today, to: addDays(today, 1) },
        { name: "Tomorrow", from: addDays(today, 1), to: addDays(today, 2) },
        { name: "This week", from: today, to: addDays(today, 7) },
        { name: "Next week", from: addDays(today, 7), to: addDays(today, 14) },
    ];

    const [
        facets,
        quotationCount,
        visitFacets,
        weekVisits,
        bookVisits,
        leadTrend,
        buckets,
        pendingFollowUps,
        bookRows,
        followUps,
        calls,
        newLeads,
        recentVisits,
    ] = await Promise.all([
        Lead.aggregate([
            { $match: leadMatch },
            {
                $facet: {
                    totals: [
                        {
                            $group: {
                                _id: null,
                                leads: { $sum: 1 },
                                booked: { $sum: { $cond: [{ $eq: ["$stage", "booked"] }, 1, 0] } },
                                hot: { $sum: { $cond: [{ $gte: ["$score", 80] }, 1, 0] } },
                                unqualified: {
                                    $sum: { $cond: [{ $eq: ["$stage", "not_qualified"] }, 1, 0] },
                                },
                            },
                        },
                    ],
                    byStage: [{ $group: { _id: "$stage", count: { $sum: 1 } } }],
                    bySource: [{ $group: { _id: "$source", count: { $sum: 1 } } }],
                    byOutcome: [{ $group: { _id: "$responseStatus", count: { $sum: 1 } } }],
                },
            },
        ]),

        // A quotation points at a lead, and only the lead knows who owns it.
        Quotation.aggregate([
            { $match: { organization, ...inProject, createdAt: { $gte: start, $lte: now } } },
            { $lookup: { from: "leads", localField: "lead", foreignField: "_id", as: "leadDoc" } },
            { $unwind: "$leadDoc" },
            { $match: { "leadDoc.assignedTo": me } },
            { $count: "count" },
        ]),

        SiteVisit.aggregate([
            {
                $match: {
                    organization,
                    agent: me,
                    ...inProject,
                    scheduledAt: { $gte: start, $lte: now },
                },
            },
            {
                $facet: {
                    byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
                    byFeedback: [
                        { $match: { status: "completed", feedback: { $nin: ["", null] } } },
                        { $group: { _id: "$feedback", count: { $sum: 1 } } },
                    ],
                },
            },
        ]),

        SiteVisit.countDocuments({
            organization,
            agent: me,
            ...inProject,
            scheduledAt: { $gte: weekStart, $lt: weekEnd },
        }),

        SiteVisit.countDocuments({ organization, agent: me, ...inProject }),

        Lead.aggregate([
            { $match: { ...mine, createdAt: { $gte: trendStart, $lte: now } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    leads: { $sum: 1 },
                    booked: { $sum: { $cond: [{ $eq: ["$stage", "booked"] }, 1, 0] } },
                },
            },
        ]),

        Promise.all(
            bucketRanges.map((bucket) =>
                FollowUp.countDocuments({
                    organization,
                    assignedTo: me,
                    status: "pending",
                    dueAt: {
                        ...(bucket.from ? { $gte: bucket.from } : {}),
                        $lt: bucket.to,
                    },
                })
            )
        ),

        FollowUp.countDocuments({
            organization,
            assignedTo: me,
            status: "pending",
            dueAt: { $lt: addDays(today, 1) },
        }),

        /* The Leads screen counts the whole assigned book, not a period
           slice, so these four agree with what the executive sees there. */
        Lead.aggregate([
            { $match: mine },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    overdue: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $lt: ["$nextFollowUpAt", now] },
                                        { $in: ["$stage", OPEN_STAGES] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                    booked: { $sum: { $cond: [{ $eq: ["$stage", "booked"] }, 1, 0] } },
                    hot: { $sum: { $cond: [{ $gte: ["$score", 80] }, 1, 0] } },
                    unqualified: {
                        $sum: { $cond: [{ $eq: ["$stage", "not_qualified"] }, 1, 0] },
                    },
                    open: { $sum: { $cond: [{ $in: ["$stage", OPEN_STAGES] }, 1, 0] } },
                },
            },
        ]),

        FollowUp.find({ organization, assignedTo: me, createdAt: { $gte: start, $lte: now } })
            .sort("-createdAt")
            .limit(30)
            .populate("lead", "name")
            .lean(),

        CallLog.find({ organization, agent: me, startedAt: { $gte: start, $lte: now } })
            .sort("-startedAt")
            .limit(30)
            .populate("lead", "name")
            .lean(),

        Lead.find(leadMatch).sort("-createdAt").limit(30).select("name source createdAt").lean(),

        SiteVisit.find({
            organization,
            agent: me,
            ...inProject,
            scheduledAt: { $gte: start, $lte: now },
        })
            .sort("-scheduledAt")
            .limit(30)
            .populate("lead", "name")
            .populate("project", "name")
            .lean(),
    ]);

    const f = facets[0] || {};
    const totals = f.totals?.[0] || { leads: 0, booked: 0, hot: 0, unqualified: 0 };

    const book = bookRows[0] || { total: 0, booked: 0, overdue: 0, hot: 0, unqualified: 0, open: 0 };
    const quotations = quotationCount[0]?.count || 0;

    const visits = visitFacets[0] || {};
    const visitsByStatus = labelled(visits.byStatus || [], VISIT_LABELS, "Other").map((row) => ({
        status: row.name,
        visits: row.value,
    }));

    const visitTotal = visitsByStatus.reduce((sum, row) => sum + row.visits, 0);
    const completedVisits =
        visitsByStatus.find((row) => row.status === VISIT_LABELS.completed)?.visits || 0;

    const leadByMonth = new Map(leadTrend.map((row) => [row._id, row]));

    const trend = monthKeys.map(({ key, label }) => {
        const row = leadByMonth.get(key) || { leads: 0, booked: 0 };
        return { month: label, leads: row.leads, booked: row.booked };
    });

    const activity = [
        ...followUps.map((item) => ({
            kind: "followup",
            lead: item.lead?.name || "",
            what: [`${item.channel === "site_visit" ? "Visit" : item.channel} follow-up`, item.remarks]
                .filter(Boolean)
                .join(" · "),
            at: item.createdAt,
        })),
        ...calls.map((item) => ({
            kind: "call",
            lead: item.lead?.name || "",
            what: `${item.direction === "inbound" ? "Inbound" : "Outbound"} call · ${
                OUTCOME_LABELS[item.status] || item.status.replace("_", " ")
            }`,
            at: item.startedAt,
        })),
        ...recentVisits.map((item) => ({
            kind: "visit",
            lead: item.lead?.name || "",
            what: `Site visit ${(VISIT_LABELS[item.status] || item.status).toLowerCase()}${
                item.project?.name ? ` · ${item.project.name}` : ""
            }`,
            at: item.scheduledAt,
        })),
        ...newLeads.map((item) => ({
            kind: "lead",
            lead: item.name,
            what: `New lead${item.source ? ` from ${SOURCE_LABELS[item.source] || item.source}` : ""}`,
            at: item.createdAt,
        })),
    ]
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, 60);

    res.json({
        success: true,
        data: {
            period,
            from: start,
            to: now,
            /* "My leads · assigned to me" and "my assigned leads have reached
               Booked" both describe the whole book, which is also what Lead
               health counts. Scoping them to the period made the same screen
               report two different totals. The analytical cards below stay
               period-scoped. */
            headline: {
                myLeads: book.total,
                conversions: book.booked,
                siteVisitsWeek: weekVisits,
                pendingFollowUps,
                followUpShare: Math.min(100, ratio(pendingFollowUps, book.total)),
            },
            quality: {
                personalConversionRate: ratio(book.booked, book.total),
                siteVisitToBooking: ratio(totals.booked, completedVisits),
                // The share of my open book whose follow-up has not slipped.
                followUpOnTime: round1(100 - Math.min(100, ratio(book.overdue, book.open))),
            },
            myFunnel: {
                leads: book.total,
                visits: bookVisits,
                quotations,
                booked: book.booked,
            },
            // The four counts on my Leads screen: the whole book, not the period.
            health: [
                { name: "Total leads", value: book.total },
                { name: "Follow-up overdue", value: book.overdue },
                { name: "Hot", value: book.hot },
                { name: "Unqualified", value: book.unqualified },
            ],
            buckets: bucketRanges.map((bucket, index) => ({
                name: bucket.name,
                value: buckets[index],
                urgent: Boolean(bucket.urgent),
            })),
            trend,
            outcomes: labelled(f.byOutcome || [], OUTCOME_LABELS).map((row) => ({
                outcome: row.name,
                leads: row.value,
            })),
            sources: labelled(f.bySource || [], SOURCE_LABELS).map((row) => ({
                source: row.name,
                leads: row.value,
            })),
            stages: labelled(f.byStage || [], STAGE_LABELS).map((row) => ({
                stage: row.name,
                leads: row.value,
            })),
            visitOutcomes: (visits.byFeedback || [])
                .map((row) => ({ outcome: row._id, visits: row.count }))
                .sort((a, b) => b.visits - a.visits),
            visitsByStatus,
            visitTotal,
            activity,
        },
    });
});

module.exports = { repOverview };
