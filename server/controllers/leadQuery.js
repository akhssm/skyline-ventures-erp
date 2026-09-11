const Lead = require("../models/Lead");
const SiteVisit = require("../models/SiteVisit");
const Configuration = require("../models/Configuration");

/**
 * Query parameters the leads table offers that do not map onto a plain field.
 *
 * ?overdue=true   leads whose next follow-up has already passed
 * ?minScore=80    the "Hot" pill
 * ?maxScore=29
 */
const extraFilter = async (query, req) => {
    const filter = {};

    if (query.overdue === "true") {
        const config = await Configuration.findOne({
            organization: req.organizationId,
        })
            .select("followUpOverdueHours")
            .lean();

        const cutoff = new Date(
            Date.now() - (config?.followUpOverdueHours ?? 24) * 60 * 60 * 1000
        );

        filter.nextFollowUpAt = { $lt: cutoff };
        filter.stage = { $nin: ["booked", "lost", "not_qualified"] };
    }

    if (query.minScore || query.maxScore) {
        filter.score = {};
        if (query.minScore) filter.score.$gte = Number(query.minScore);
        if (query.maxScore) filter.score.$lte = Number(query.maxScore);
    }

    return filter;
};

/**
 * Adds the two columns the table shows that are not stored on the lead:
 * how many other leads share its phone number, and the latest site visit.
 *
 * Both are looked up only for the rows on the current page, so the cost stays
 * flat no matter how large the collection grows.
 */
const enrich = async (items, req) => {
    if (!items.length) return items;

    const ids = items.map((lead) => lead._id);
    const phones = [...new Set(items.map((lead) => lead.phone))];

    const [duplicateGroups, visits] = await Promise.all([
        Lead.aggregate([
            {
                $match: {
                    organization: req.organizationId,
                    isActive: true,
                    phone: { $in: phones },
                },
            },
            { $group: { _id: "$phone", count: { $sum: 1 } } },
        ]),

        SiteVisit.aggregate([
            { $match: { organization: req.organizationId, lead: { $in: ids } } },
            { $sort: { scheduledAt: -1 } },
            { $group: { _id: "$lead", status: { $first: "$status" } } },
        ]),
    ]);

    const duplicateByPhone = Object.fromEntries(
        duplicateGroups.map((row) => [row._id, row.count])
    );
    const visitByLead = Object.fromEntries(
        visits.map((row) => [String(row._id), row.status])
    );

    return items.map((lead) => ({
        ...lead,
        duplicateCount: duplicateByPhone[lead.phone] || 1,
        siteVisitStatus: visitByLead[String(lead._id)] || null,
    }));
};

module.exports = { extraFilter, enrich };
