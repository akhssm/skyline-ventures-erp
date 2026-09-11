const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

// Support tickets raised from the Contact us screen.
const contactMessageSchema = tenantSchema({
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    category: {
        type: String,
        enum: ["bug", "feature", "billing", "training", "other"],
        default: "other",
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium",
    },
    status: {
        type: String,
        enum: ["open", "in_progress", "resolved", "closed"],
        default: "open",
        index: true,
    },
    response: { type: String, default: "" },
    resolvedAt: { type: Date },
});

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
