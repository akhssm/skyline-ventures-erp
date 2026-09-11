const Lead = require("../models/Lead");
const Configuration = require("../models/Configuration");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { ORG_WIDE_ROLES } = require("../config/roles");

// Mirrors the crudFactory scope so the counters agree with the table.
const leadScope = (req) => {
    const base = { organization: req.organizationId, isActive: true };

    if (!ORG_WIDE_ROLES.includes(req.user.role)) {
        base.assignedTo = req.user._id;
    }

    return base;
};

// GET /api/leads/stats  -> the counter row above the leads table
const stats = asyncHandler(async (req, res) => {
    const scope = leadScope(req);

    const config = await Configuration.findOne({
        organization: req.organizationId,
    }).lean();

    const overdueBefore = new Date(
        Date.now() - (config?.followUpOverdueHours ?? 24) * 60 * 60 * 1000
    );

    const [total, followUpOverdue, hot, unqualified] = await Promise.all([
        Lead.countDocuments(scope),
        Lead.countDocuments({
            ...scope,
            stage: { $nin: ["booked", "lost", "not_qualified"] },
            nextFollowUpAt: { $lt: overdueBefore },
        }),
        Lead.countDocuments({ ...scope, score: { $gte: 80 } }),
        Lead.countDocuments({ ...scope, stage: "not_qualified" }),
    ]);

    res.json({
        success: true,
        data: { total, followUpOverdue, hot, unqualified },
    });
});

// GET /api/leads/duplicates -> leads sharing a phone number
const duplicates = asyncHandler(async (req, res) => {
    const groups = await Lead.aggregate([
        { $match: { organization: req.organizationId, isActive: true } },
        {
            $group: {
                _id: "$phone",
                count: { $sum: 1 },
                leads: {
                    $push: {
                        _id: "$_id",
                        name: "$name",
                        stage: "$stage",
                        score: "$score",
                        source: "$source",
                        assignedTo: "$assignedTo",
                        createdAt: "$createdAt",
                    },
                },
            },
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 200 },
    ]);

    await Lead.populate(groups, { path: "leads.assignedTo", select: "name" });

    res.json({
        success: true,
        data: groups.map((g) => ({ phone: g._id, count: g.count, leads: g.leads })),
    });
});

// POST /api/leads/:id/merge  body: { duplicateIds: [] }
const merge = asyncHandler(async (req, res) => {
    const { duplicateIds = [] } = req.body;

    const primary = await Lead.findOne({
        _id: req.params.id,
        organization: req.organizationId,
    });

    if (!primary) throw ApiError.notFound("Lead not found");

    // Losing records are retired rather than deleted so history survives.
    const result = await Lead.updateMany(
        { _id: { $in: duplicateIds }, organization: req.organizationId },
        { isActive: false, notes: `Merged into lead ${primary._id}` }
    );

    res.json({
        success: true,
        message: `${result.modifiedCount} duplicate leads merged`,
        data: primary,
    });
});

// POST /api/leads/bulk-assign  body: { ids: [], assignedTo }
const bulkAssign = asyncHandler(async (req, res) => {
    const { ids = [], assignedTo } = req.body;

    if (!ids.length) throw ApiError.badRequest("Select at least one lead");
    if (!assignedTo) throw ApiError.badRequest("Choose an agent to assign to");

    const result = await Lead.updateMany(
        { _id: { $in: ids }, organization: req.organizationId },
        { assignedTo, updatedBy: req.user._id }
    );

    res.json({ success: true, message: `${result.modifiedCount} leads assigned` });
});

// POST /api/leads/import  body: { fileName, rows: [] }
const importLeads = asyncHandler(async (req, res) => {
    const { rows = [], fileName = "upload.csv" } = req.body;

    if (!Array.isArray(rows) || !rows.length) {
        throw ApiError.badRequest("No rows to import");
    }

    const ImportJob = require("../models/ImportJob");

    const job = await ImportJob.create({
        organization: req.organizationId,
        createdBy: req.user._id,
        fileName,
        totalRows: rows.length,
        status: "processing",
    });

    const existing = await Lead.find({
        organization: req.organizationId,
        phone: { $in: rows.map((r) => String(r.phone || "").trim()) },
    })
        .select("phone")
        .lean();

    const seen = new Set(existing.map((l) => l.phone));
    const errors = [];
    const toInsert = [];

    rows.forEach((row, index) => {
        const phone = String(row.phone || "").trim();

        if (!/^[6-9]\d{9}$/.test(phone)) {
            errors.push({ row: index + 1, message: `Invalid phone "${row.phone}"` });
            return;
        }

        if (seen.has(phone)) return;

        seen.add(phone);

        toInsert.push({
            organization: req.organizationId,
            createdBy: req.user._id,
            name: String(row.name || "Unnamed lead").trim(),
            phone,
            email: row.email || "",
            source: row.source || "other",
            requirement: row.requirement || "",
        });
    });

    if (toInsert.length) await Lead.insertMany(toInsert, { ordered: false });

    job.importedRows = toInsert.length;
    job.failedRows = errors.length;
    job.duplicateRows = rows.length - toInsert.length - errors.length;
    job.rowErrors = errors.slice(0, 100);
    job.status = "completed";
    job.completedAt = new Date();
    await job.save();

    res.status(201).json({ success: true, data: job });
});

module.exports = { stats, duplicates, merge, bulkAssign, importLeads };
