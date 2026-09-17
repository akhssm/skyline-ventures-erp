const mongoose = require("mongoose");

const Lead = require("../models/Lead");
const SiteVisit = require("../models/SiteVisit");
const Quotation = require("../models/Quotation");
const FollowUp = require("../models/FollowUp");
const CallLog = require("../models/CallLog");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

/* ---------------------------------------------------------
   The CRM Manager's "Team & Pipeline" dashboard.

   Everything is scoped by the same filter row: one project or
   all of them, and a period that runs from the start of the
   month, quarter or year up to now. Leads are counted by when
   they arrived, so "booked" means booked out of that intake and
   conversion is a true ratio of the same group.
   --------------------------------------------------------- */

// How likely an open lead in each stage is to close. The weighted forecast
// and the per-rep forecast both read this, so they always agree.
const WIN_PROBABILITY = {
    new: 0.05,
    contacted: 0.1,
    prospect: 0.2,
    site_scheduled: 0.3,
    site_rescheduled: 0.3,
    site_visited: 0.45,
    negotiation: 0.7,
};

const OPEN_STAGES = Object.keys(WIN_PROBABILITY);

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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const periodStart = (period, now) => {
    if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "ytd") return new Date(now.getFullYear(), 0, 1);

    return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
};

const round1 = (value) => Math.round(value * 10) / 10;
const ratio = (part, whole) => (whole ? round1((part / whole) * 100) : 0);

// A lead's worth is the top of its stated budget, falling back to the bottom.
const leadValue = { $cond: [{ $gt: ["$budgetMax", 0] }, "$budgetMax", "$budgetMin"] };

const probabilityExpr = {
    $switch: {
        branches: OPEN_STAGES.map((stage) => ({
            case: { $eq: ["$stage", stage] },
            then: WIN_PROBABILITY[stage],
        })),
        default: 0,
    },
};

const byCount = (rows) => [...rows].sort((a, b) => b.count - a.count);

// GET /api/dashboard/manager?period=month|quarter|ytd&project=<id>
const managerOverview = asyncHandler(async (req, res) => {
    const organization = req.organizationId;
    const { period = "quarter", project } = req.query;

    const now = new Date();
    const start = periodStart(period, now);

    const projectId =
        project && mongoose.isValidObjectId(project) ? new mongoose.Types.ObjectId(project) : null;
    const inProject = projectId ? { project: projectId } : {};

    const leadMatch = { organization, ...inProject, createdAt: { $gte: start, $lte: now } };
    const visitMatch = { organization, ...inProject, scheduledAt: { $gte: start, $lte: now } };

    // Six calendar months ending with this one, for the trend charts.
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthKeys = Array.from({ length: 6 }, (_, index) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
        return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` };
    });

    // Follow-ups and calls hang off a lead, so a project filter reaches them
    // through the leads that belong to it.
    const projectLeadIds = projectId
        ? (await Lead.find({ organization, project: projectId }).select("_id").lean()).map((l) => l._id)
        : null;
    const viaLead = projectLeadIds ? { lead: { $in: projectLeadIds } } : {};

    const [
        leadFacets,
        quotationCount,
        leadTrend,
        visitTrend,
        visitRows,
        followUps,
        calls,
        newLeads,
        recentVisits,
        people,
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
                                unassigned: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $in: ["$stage", OPEN_STAGES] },
                                                    { $not: ["$assignedTo"] },
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                                forecast: {
                                    $sum: { $multiply: [leadValue, probabilityExpr] },
                                },
                            },
                        },
                    ],
                    byStage: [
                        { $match: { stage: { $in: OPEN_STAGES } } },
                        { $group: { _id: "$stage", count: { $sum: 1 }, value: { $sum: leadValue } } },
                    ],
                    bySource: [{ $group: { _id: "$source", count: { $sum: 1 } } }],
                    byOutcome: [{ $group: { _id: "$responseStatus", count: { $sum: 1 } } }],
                    byOwner: [
                        {
                            $group: {
                                _id: "$assignedTo",
                                leads: { $sum: 1 },
                                booked: { $sum: { $cond: [{ $eq: ["$stage", "booked"] }, 1, 0] } },
                                openLeads: {
                                    $sum: { $cond: [{ $in: ["$stage", OPEN_STAGES] }, 1, 0] },
                                },
                                openValue: {
                                    $sum: { $cond: [{ $in: ["$stage", OPEN_STAGES] }, leadValue, 0] },
                                },
                                forecast: { $sum: { $multiply: [leadValue, probabilityExpr] } },
                                lost: {
                                    $sum: { $cond: [{ $eq: ["$stage", "lost"] }, leadValue, 0] },
                                },
                            },
                        },
                    ],
                },
            },
        ]),

        Quotation.countDocuments({ organization, ...inProject, createdAt: { $gte: start, $lte: now } }),

        Lead.aggregate([
            { $match: { organization, ...inProject, createdAt: { $gte: trendStart, $lte: now } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    leads: { $sum: 1 },
                    bookings: { $sum: { $cond: [{ $eq: ["$stage", "booked"] }, 1, 0] } },
                },
            },
        ]),

        SiteVisit.aggregate([
            { $match: { organization, ...inProject, scheduledAt: { $gte: trendStart, $lte: now } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$scheduledAt" } },
                    visits: { $sum: 1 },
                },
            },
        ]),

        SiteVisit.aggregate([
            { $match: visitMatch },
            {
                $group: {
                    _id: { agent: "$agent", status: "$status" },
                    count: { $sum: 1 },
                },
            },
        ]),

        FollowUp.find({ organization, ...viaLead, createdAt: { $gte: start, $lte: now } })
            .sort("-createdAt")
            .limit(40)
            .populate("lead", "name")
            .populate("assignedTo", "name")
            .lean(),

        CallLog.find({ organization, ...viaLead, startedAt: { $gte: start, $lte: now } })
            .sort("-startedAt")
            .limit(40)
            .populate("lead", "name")
            .populate("agent", "name")
            .lean(),

        Lead.find(leadMatch)
            .sort("-createdAt")
            .limit(40)
            .select("name source createdAt assignedTo createdBy")
            .populate("createdBy", "name")
            .lean(),

        SiteVisit.find(visitMatch)
            .sort("-scheduledAt")
            .limit(40)
            .populate("lead", "name")
            .populate("agent", "name")
            .populate("project", "name")
            .lean(),

        User.find({ organization }).select("name role").lean(),
    ]);

    const facets = leadFacets[0] || {};
    const totals = facets.totals?.[0] || { leads: 0, booked: 0, unassigned: 0, forecast: 0 };

    const nameOf = new Map(people.map((person) => [String(person._id), person.name]));
    const personName = (id) => (id ? nameOf.get(String(id)) || "Former employee" : "Unassigned");

    /* ---- trends ---- */

    const leadByMonth = new Map(leadTrend.map((row) => [row._id, row]));
    const visitByMonth = new Map(visitTrend.map((row) => [row._id, row.visits]));

    const leadGen = monthKeys.map(({ key, label }) => {
        const row = leadByMonth.get(key) || { leads: 0, bookings: 0 };
        return {
            month: label,
            leads: row.leads,
            visits: visitByMonth.get(key) || 0,
            bookings: row.bookings,
            conversion: ratio(row.bookings, row.leads),
        };
    });

    /* ---- sources, with month-on-month change ---- */

    const thisMonth = monthKeys[5].key;
    const lastMonth = monthKeys[4].key;

    const sourceMonths = await Lead.aggregate([
        {
            $match: {
                organization,
                ...inProject,
                createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1), $lte: now },
            },
        },
        {
            $group: {
                _id: {
                    source: "$source",
                    month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                },
                count: { $sum: 1 },
            },
        },
    ]);

    const monthCount = (source, month) =>
        sourceMonths.find((row) => row._id.source === source && row._id.month === month)?.count || 0;

    const sources = byCount(facets.bySource || []).map((row) => {
        const current = monthCount(row._id, thisMonth);
        const previous = monthCount(row._id, lastMonth);

        return {
            source: SOURCE_LABELS[row._id] || "Not set",
            leads: row.count,
            // A source with nothing last month has no meaningful percentage.
            mom: previous ? round1(((current - previous) / previous) * 100) : null,
        };
    });

    /* ---- outcomes ---- */

    const outcomes = byCount(facets.byOutcome || []).map((row) => ({
        outcome: OUTCOME_LABELS[row._id] || "Not set",
        leads: row.count,
    }));

    /* ---- pipeline ---- */

    const pipelineByStage = OPEN_STAGES.map((stage) => {
        const row = (facets.byStage || []).find((entry) => entry._id === stage);
        return { stage: STAGE_LABELS[stage], leads: row?.count || 0, value: row?.value || 0 };
    }).filter((row) => row.leads > 0);

    const owners = (facets.byOwner || []).map((row) => ({
        rep: personName(row._id),
        isUnassigned: !row._id,
        leads: row.leads,
        booked: row.booked,
        conversion: ratio(row.booked, row.leads),
        openLeads: row.openLeads,
        openValue: row.openValue,
        forecast: Math.round(row.forecast),
        lost: row.lost,
    }));

    const pipelineByOwner = owners
        .filter((row) => row.openLeads > 0)
        .sort((a, b) => b.openValue - a.openValue)
        .map((row) => ({ owner: row.rep, leads: row.openLeads, value: row.openValue }));

    const reps = owners.filter((row) => !row.isUnassigned);

    const repBreakdown = [...reps]
        .sort((a, b) => b.conversion - a.conversion || b.leads - a.leads)
        .map(({ rep, leads, booked, conversion }) => ({ rep, leads, booked, conversion }));

    const forecastByRep = [...reps]
        .sort((a, b) => b.forecast - a.forecast)
        .map(({ rep, forecast, lost }) => ({ rep, forecast, lost }));

    /* ---- visits ---- */

    const visitStatus = new Map();
    const visitExec = new Map();

    visitRows.forEach(({ _id, count }) => {
        const label = VISIT_LABELS[_id.status] || "Other";
        visitStatus.set(label, (visitStatus.get(label) || 0) + count);

        const exec = personName(_id.agent);
        const entry = visitExec.get(exec) || { executive: exec, scheduled: 0, completed: 0 };
        entry.scheduled += count;
        if (_id.status === "completed") entry.completed += count;
        visitExec.set(exec, entry);
    });

    const visitsByStatus = [...visitStatus.entries()]
        .map(([status, visits]) => ({ status, visits }))
        .sort((a, b) => b.visits - a.visits);

    const visitsByExecutive = [...visitExec.values()]
        .map((row) => ({ ...row, done: ratio(row.completed, row.scheduled) }))
        .sort((a, b) => b.scheduled - a.scheduled);

    const visitTotal = visitsByStatus.reduce((sum, row) => sum + row.visits, 0);

    /* ---- funnel ---- */

    const completedVisits = visitStatus.get(VISIT_LABELS.completed) || 0;

    const funnel = {
        leads: totals.leads,
        visits: visitTotal,
        completedVisits,
        quotations: quotationCount,
        booked: totals.booked,
    };

    /* ---- team feed ---- */

    const activity = [
        ...followUps.map((item) => ({
            kind: "followup",
            lead: item.lead?.name || "",
            what: [`${item.channel === "site_visit" ? "Visit" : item.channel} follow-up`, item.remarks]
                .filter(Boolean)
                .join(" · "),
            who: item.assignedTo?.name || "",
            at: item.createdAt,
        })),
        ...calls.map((item) => ({
            kind: "call",
            lead: item.lead?.name || "",
            what: `${item.direction === "inbound" ? "Inbound" : "Outbound"} call · ${
                OUTCOME_LABELS[item.status] || item.status.replace("_", " ")
            }`,
            who: item.agent?.name || "",
            at: item.startedAt,
        })),
        ...recentVisits.map((item) => ({
            kind: "visit",
            lead: item.lead?.name || "",
            what: `Site visit ${(VISIT_LABELS[item.status] || item.status).toLowerCase()}${
                item.project?.name ? ` · ${item.project.name}` : ""
            }`,
            who: item.agent?.name || "",
            at: item.scheduledAt,
        })),
        ...newLeads.map((item) => ({
            kind: "lead",
            lead: item.name,
            what: `New lead${item.source ? ` from ${SOURCE_LABELS[item.source] || item.source}` : ""}`,
            who: item.createdBy?.name || "",
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
            headline: {
                weightedForecast: Math.round(totals.forecast),
                teamLeads: totals.leads,
                teamBooked: totals.booked,
                teamConversion: ratio(totals.booked, totals.leads),
                unassignedBacklog: totals.unassigned,
                backlogShare: Math.min(100, ratio(totals.unassigned, totals.leads)),
            },
            funnel,
            leadGen,
            sources,
            outcomes,
            pipelineByStage,
            pipelineByOwner,
            forecastByRep,
            repBreakdown,
            visitsByStatus,
            visitsByExecutive,
            visitTotal,
            activity,
        },
    });
});

module.exports = { managerOverview, WIN_PROBABILITY };
