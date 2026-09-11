const express = require("express");
const { leadsAndSiteVisits, summary } = require("../controllers/reportController");

const router = express.Router();

router.get("/leads-site-visits", leadsAndSiteVisits);
router.get("/summary", summary);

module.exports = router;
