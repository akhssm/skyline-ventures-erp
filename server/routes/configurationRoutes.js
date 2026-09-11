const express = require("express");

const Configuration = require("../models/Configuration");
const asyncHandler = require("../utils/asyncHandler");
const { restrict } = require("../middleware/auth");
const { ROLES } = require("../config/roles");

const router = express.Router();

// One document per organization, created on first read.
const getConfig = asyncHandler(async (req, res) => {
    const config = await Configuration.findOneAndUpdate(
        { organization: req.organizationId },
        { $setOnInsert: { organization: req.organizationId, createdBy: req.user._id } },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({ success: true, data: config });
});

const updateConfig = asyncHandler(async (req, res) => {
    const payload = { ...req.body, updatedBy: req.user._id };
    delete payload.organization;

    const config = await Configuration.findOneAndUpdate(
        { organization: req.organizationId },
        payload,
        { returnDocument: "after", upsert: true, runValidators: true }
    ).lean();

    res.json({ success: true, data: config });
});

router.get("/", getConfig);
router.patch(
    "/",
    restrict(ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR, ROLES.ACCOUNTANT),
    updateConfig
);

module.exports = router;
