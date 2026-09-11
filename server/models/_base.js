const mongoose = require("mongoose");

// Every tenant-scoped collection carries the same organization pointer and
// the same audit stamps, so they are declared once here.
const orgField = {
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
    },
};

const audit = {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
};

// Builds a schema with the tenant field, audit stamps and timestamps applied.
const tenantSchema = (definition, options = {}) =>
    new mongoose.Schema(
        { ...orgField, ...definition, ...audit },
        { timestamps: true, ...options }
    );

module.exports = { tenantSchema, orgField, audit };
