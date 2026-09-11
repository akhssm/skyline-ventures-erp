const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

const callLogSchema = tenantSchema({
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", index: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    phone: { type: String, required: true, trim: true },
    direction: { type: String, enum: ["inbound", "outbound"], default: "outbound" },
    status: {
        type: String,
        enum: ["answered", "missed", "busy", "no_answer", "rejected"],
        default: "answered",
    },
    // Seconds.
    duration: { type: Number, default: 0 },
    recordingUrl: { type: String, default: "" },
    notes: { type: String, default: "" },
    startedAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("CallLog", callLogSchema);
