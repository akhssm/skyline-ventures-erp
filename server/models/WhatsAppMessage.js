const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

const whatsAppMessageSchema = tenantSchema({
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", index: true },
    phone: { type: String, required: true, trim: true },
    templateName: { type: String, default: "", trim: true },
    body: { type: String, default: "" },
    direction: { type: String, enum: ["inbound", "outbound"], default: "outbound" },
    status: {
        type: String,
        enum: ["queued", "sent", "delivered", "read", "failed"],
        default: "queued",
        index: true,
    },
    providerMessageId: { type: String, default: "" },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sentAt: { type: Date, default: Date.now },
    failureReason: { type: String, default: "" },
});

module.exports = mongoose.model("WhatsAppMessage", whatsAppMessageSchema);
