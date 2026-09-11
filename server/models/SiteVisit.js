const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

const siteVisitSchema = tenantSchema({
    lead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lead",
        required: true,
        index: true,
    },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    scheduledAt: { type: Date, required: true, index: true },
    status: {
        type: String,
        enum: ["pending", "scheduled", "rescheduled", "completed", "cancelled", "no_show"],
        default: "scheduled",
    },
    visitedAt: { type: Date },
    feedback: { type: String, default: "" },
    // 1-5 stars captured after the visit.
    rating: { type: Number, min: 0, max: 5, default: 0 },
    pickupRequired: { type: Boolean, default: false },
});

module.exports = mongoose.model("SiteVisit", siteVisitSchema);
