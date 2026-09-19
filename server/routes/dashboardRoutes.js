const express = require("express");

const { executiveOverview } = require("../controllers/dashboardController");
const { managerOverview } = require("../controllers/managerDashboard");
const { repOverview } = require("../controllers/repDashboard");
const { collectionsOverview } = require("../controllers/collectionsDashboard");
const { restrict } = require("../middleware/auth");
const { ROLES } = require("../config/roles");

const router = express.Router();

// Revenue, collections and the inventory mix across the whole business.
router.get("/executive", executiveOverview);

// The whole team's pipeline, which a single executive must not see.
router.get(
    "/manager",
    restrict(ROLES.MARKETING_MANAGER, ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR),
    managerOverview
);

// One person's own book. Scoped to the caller inside the controller, so no
// role can use it to read somebody else's leads.
router.get(
    "/rep",
    restrict(ROLES.MARKETING, ROLES.RECEPTIONIST, ROLES.MARKETING_MANAGER, ROLES.PROPERTY_OWNER),
    repOverview
);

// What is owed, how late it is, and what we owe partners.
router.get(
    "/collections",
    restrict(ROLES.ACCOUNTANT, ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR),
    collectionsOverview
);

module.exports = router;
