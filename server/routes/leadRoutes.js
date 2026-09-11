const express = require("express");

const Lead = require("../models/Lead");
const crudFactory = require("../utils/crudFactory");
const {
    stats,
    duplicates,
    merge,
    bulkAssign,
    importLeads,
} = require("../controllers/leadController");
const { extraFilter, enrich } = require("../controllers/leadQuery");

const router = express.Router();

const handlers = crudFactory(Lead, {
    searchFields: ["name", "phone", "email"],
    filterFields: [
        "stage",
        "source",
        "leadType",
        "category",
        "assignedTo",
        "project",
        "responseStatus",
        "isQualified",
        "isActive",
    ],
    populate: [
        { path: "assignedTo", select: "name role" },
        { path: "project", select: "name" },
    ],
    defaultSort: "-createdAt",
    // Executives see only their own book; managers and owners see everything.
    ownerField: "assignedTo",
    // ?overdue and ?minScore, plus the duplicate and site-visit columns.
    extraFilter,
    enrich,
});

// Declared before /:id so these words are not read as ids.
router.get("/stats", stats);
router.get("/duplicates", duplicates);
router.post("/bulk-assign", bulkAssign);
router.post("/import", importLeads);
router.post("/:id/merge", merge);

router.route("/").get(handlers.list).post(handlers.create);
router.post("/bulk-delete", handlers.bulkRemove);
router
    .route("/:id")
    .get(handlers.getOne)
    .patch(handlers.update)
    .put(handlers.update)
    .delete(handlers.remove);

module.exports = router;
