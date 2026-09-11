const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

const LEAD_STAGES = [
    "new",
    "contacted",
    "prospect",
    "site_scheduled",
    "site_visited",
    "site_rescheduled",
    "negotiation",
    "booked",
    "lost",
    "not_qualified",
];

const LEAD_SOURCES = [
    "website",
    "walk_in",
    "facebook",
    "instagram",
    "google_ads",
    "magicbricks",
    "99acres",
    "housing",
    "channel_partner",
    "referral",
    "other",
];

const leadSchema = tenantSchema({
    name: { type: String, required: true, trim: true },
    phone: {
        type: String,
        required: true,
        trim: true,
        index: true,
        match: [/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"],
    },
    altPhone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    stage: { type: String, enum: LEAD_STAGES, default: "new" },
    source: { type: String, enum: LEAD_SOURCES },
    leadType: { type: String, enum: ["buyer", "investor", "tenant"] },
    category: {
        type: String,
        enum: ["hot", "warm", "cold", "negotiation", "closure"],
    },
    budgetMin: { type: Number, default: 0 },
    budgetMax: { type: Number, default: 0 },
    requirement: { type: String, default: "", trim: true },
    // 0-100. Recomputed by the scoring helper whenever the lead is written.
    score: { type: Number, default: 10, min: 0, max: 100 },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
    },
    lastContactedAt: { type: Date },
    nextFollowUpAt: { type: Date, index: true },
    responseStatus: {
        type: String,
        enum: ["answered", "no_answer", "busy", "switched_off", "invalid"],
    },
    notes: { type: String, default: "" },
    isQualified: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
});

leadSchema.index({ organization: 1, phone: 1 });
leadSchema.index({ organization: 1, stage: 1 });

// The score band drives the coloured pill in the leads table.
leadSchema.virtual("scoreBand").get(function () {
    if (this.score >= 80) return "hot";
    if (this.score >= 55) return "warm";
    if (this.score >= 30) return "cold";
    return "very_cold";
});

leadSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Lead", leadSchema);
module.exports.LEAD_STAGES = LEAD_STAGES;
module.exports.LEAD_SOURCES = LEAD_SOURCES;
