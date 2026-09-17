const express = require("express");

const { executiveOverview } = require("../controllers/dashboardController");
const { managerOverview } = require("../controllers/managerDashboard");
const { restrict } = require("../middleware/auth");
const { ROLES } = require("../config/roles");

const router = express.Router();

router.get("/executive", executiveOverview);

// The whole team's pipeline, which a single executive must not see.
router.get(
    "/manager",
    restrict(ROLES.MARKETING_MANAGER, ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR),
    managerOverview
);

module.exports = router;
