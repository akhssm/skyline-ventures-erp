const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

const followUpSchema = tenantSchema({
    lead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lead",
        required: true,
        index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    dueAt: { type: Date, required: true, index: true },
    channel: {
        type: String,
        enum: ["call", "whatsapp", "email", "meeting", "site_visit"],
        default: "call",
    },
    status: {
        type: String,
        enum: ["pending", "done", "missed", "rescheduled"],
        default: "pending",
    },
    outcome: { type: String, default: "", trim: true },
    remarks: { type: String, default: "" },
    completedAt: { type: Date },
});

module.exports = mongoose.model("FollowUp", followUpSchema);
