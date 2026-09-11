const express = require("express");
const { executiveOverview } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/executive", executiveOverview);

module.exports = router;
