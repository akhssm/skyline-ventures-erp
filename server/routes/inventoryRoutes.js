const express = require("express");

const Unit = require("../models/Unit");
const crudFactory = require("../utils/crudFactory");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { restrict } = require("../middleware/auth");
const { ROLES } = require("../config/roles");

const router = express.Router();

/* The bulk builder refuses to create more than this in one go, so a slip in
   the floor range cannot write tens of thousands of rows. */
const BATCH_MAX = 1000;

const handlers = crudFactory(Unit, {
    searchFields: ["flatNo", "tower", "unitType"],
    filterFields: [
        "status",
        "project",
        "tower",
        "unitType",
        "facing",
        "view",
        "floor",
        "isActive",
    ],
    populate: [{ path: "project", select: "name" }],
    defaultSort: "tower flatNo",
});

/* ---------------------------------------------------------
   FACETS
   Powers the status chips, the statline and every filter
   dropdown. Deliberately unfiltered, so the counts stay put
   while the user narrows the table.
   --------------------------------------------------------- */

const facets = asyncHandler(async (req, res) => {
    const match = { organization: req.organizationId, isActive: true };

    const [rows] = await Unit.aggregate([
        { $match: match },
        {
            $lookup: {
                from: "projects",
                localField: "project",
                foreignField: "_id",
                as: "projectDoc",
            },
        },
        { $unwind: { path: "$projectDoc", preserveNullAndEmptyArrays: true } },
        {
            $facet: {
                project: [
                    {
                        $group: {
                            _id: { id: "$project", name: "$projectDoc.name" },
                            cnt: { $sum: 1 },
                        },
                    },
                    { $sort: { "_id.name": 1 } },
                ],
                tower: [{ $group: { _id: "$tower", cnt: { $sum: 1 } } }, { $sort: { _id: 1 } }],
                unitType: [{ $group: { _id: "$unitType", cnt: { $sum: 1 } } }, { $sort: { _id: 1 } }],
                status: [{ $group: { _id: "$status", cnt: { $sum: 1 } } }, { $sort: { _id: 1 } }],
                facing: [{ $group: { _id: "$facing", cnt: { $sum: 1 } } }, { $sort: { _id: 1 } }],
                view: [{ $group: { _id: "$view", cnt: { $sum: 1 } } }, { $sort: { _id: 1 } }],
            },
        },
    ]);

    // A blank facing or view is "not set", not a value worth offering.
    const named = (group) =>
        (group || [])
            .filter((entry) => entry._id !== null && entry._id !== "")
            .map((entry) => ({ name: String(entry._id), cnt: entry.cnt }));

    const project = (rows?.project || [])
        .filter((entry) => entry._id?.id)
        .map((entry) => ({
            id: String(entry._id.id),
            name: entry._id.name || "Unassigned",
            cnt: entry.cnt,
        }));

    res.json({
        success: true,
        data: {
            project,
            tower: named(rows?.tower),
            unitType: named(rows?.unitType),
            status: named(rows?.status),
            facing: named(rows?.facing),
            view: named(rows?.view),
            total: project.reduce((sum, entry) => sum + entry.cnt, 0),
            projectCount: project.length,
        },
    });
});

/* ---------------------------------------------------------
   GRID
   One entry per project tower, used by the bookings drilldown.
   --------------------------------------------------------- */

const grid = asyncHandler(async (req, res) => {
    const filter = { organization: req.organizationId, isActive: true };
    if (req.query.project) filter.project = req.query.project;

    const units = await Unit.find(filter)
        .select("project tower flatNo floor status unitType totalPrice")
        .populate("project", "name")
        .sort("tower floor flatNo")
        .lean();

    // Two projects can both have a "Tower A", so the key carries the project.
    const towers = units.reduce((acc, unit) => {
        const projectName = unit.project?.name || "Unassigned";
        const key = `${projectName}|${unit.tower}`;

        (acc[key] ||= { project: projectName, tower: unit.tower, units: [] }).units.push(unit);

        return acc;
    }, {});

    const mix = units.reduce((acc, unit) => {
        acc[unit.status] = (acc[unit.status] || 0) + 1;
        return acc;
    }, {});

    res.json({
        success: true,
        data: { towers: Object.values(towers), mix, total: units.length },
    });
});

/* ---------------------------------------------------------
   BULK GENERATE
   Writes a whole floor plate at once. The client previews the
   same rows before sending them.
   --------------------------------------------------------- */

const bulkCreate = asyncHandler(async (req, res) => {
    const { project, tower, units } = req.body;

    if (!project) throw new ApiError(400, "Pick the project these units belong to.");
    if (!tower) throw new ApiError(400, "Pick the tower these units belong to.");
    if (!Array.isArray(units) || !units.length) throw new ApiError(400, "Nothing to create.");

    if (units.length > BATCH_MAX) {
        throw new ApiError(400, `Create at most ${BATCH_MAX} units in one batch.`);
    }

    const names = units.map((unit) => String(unit.flatNo || "").trim());

    if (names.some((name) => !name)) throw new ApiError(400, "Every unit needs a number.");

    const repeated = names.filter((name, index) => names.indexOf(name) !== index);
    if (repeated.length) {
        throw new ApiError(400, `Repeated in this batch: ${[...new Set(repeated)].join(", ")}`);
    }

    const clash = await Unit.find({
        organization: req.organizationId,
        project,
        tower,
        flatNo: { $in: names },
    })
        .select("flatNo")
        .lean();

    if (clash.length) {
        throw new ApiError(
            409,
            `Already in this tower: ${clash.map((unit) => unit.flatNo).join(", ")}`
        );
    }

    const created = await Unit.insertMany(
        units.map((unit) => ({
            organization: req.organizationId,
            project,
            tower,
            flatNo: String(unit.flatNo).trim(),
            floor: Number(unit.floor) || 0,
            unitType: unit.unitType || "",
            unitCategory: unit.unitCategory || "Flat / Apartment",
            builtUpArea: Number(unit.builtUpArea) || 0,
            carpetArea: Number(unit.carpetArea) || 0,
            facing: unit.facing || "",
            view: unit.view || "",
            ratePerSqft: Number(unit.ratePerSqft) || 0,
            basePrice: Number(unit.basePrice) || 0,
            totalPrice: Number(unit.totalPrice) || Number(unit.basePrice) || 0,
            isFacingChargeApplicable: Boolean(unit.isFacingChargeApplicable),
            isCornerChargeApplicable: Boolean(unit.isCornerChargeApplicable),
            status: "available",
        })),
        { ordered: true }
    );

    res.status(201).json({ success: true, data: { created: created.length } });
});

router.get("/facets", facets);
router.get("/grid", grid);

router.post(
    "/bulk",
    restrict(ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR),
    bulkCreate
);

router.route("/").get(handlers.list).post(handlers.create);
router.post("/bulk-delete", handlers.bulkRemove);
router
    .route("/:id")
    .get(handlers.getOne)
    .patch(handlers.update)
    .put(handlers.update)
    .delete(handlers.remove);

module.exports = router;
