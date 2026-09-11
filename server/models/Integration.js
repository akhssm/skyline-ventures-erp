const { tenantSchema } = require("./_base");

const integrationSchema = tenantSchema({
    provider: {
        type: String,
        required: true,
        enum: [
            "whatsapp_cloud",
            "twilio",
            "exotel",
            "facebook_leads",
            "google_ads",
            "magicbricks",
            "99acres",
            "housing",
            "razorpay",
            "tally",
        ],
    },
    displayName: { type: String, required: true, trim: true },
    // Never returned to the client; see the sanitising controller.
    credentials: { type: Map, of: String, default: {}, select: false },
    webhookUrl: { type: String, default: "" },
    status: {
        type: String,
        enum: ["not_connected", "connected", "error"],
        default: "not_connected",
    },
    lastSyncAt: { type: Date },
    lastError: { type: String, default: "" },
    isActive: { type: Boolean, default: false },
});

integrationSchema.index({ organization: 1, provider: 1 }, { unique: true });

module.exports = require("mongoose").model("Integration", integrationSchema);
