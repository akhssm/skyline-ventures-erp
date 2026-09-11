const { tenantSchema } = require("./_base");

const channelPartnerSchema = tenantSchema({
    name: { type: String, required: true, trim: true },
    firmName: { type: String, default: "", trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    reraNumber: { type: String, default: "", trim: true },
    panNumber: { type: String, default: "", trim: true, uppercase: true },
    gstin: { type: String, default: "", trim: true, uppercase: true },
    // Default commission on booking value.
    commissionPercent: { type: Number, default: 2 },
    bankName: { type: String, default: "", trim: true },
    accountNumber: { type: String, default: "", trim: true },
    ifsc: { type: String, default: "", trim: true, uppercase: true },
    status: {
        type: String,
        enum: ["pending", "active", "suspended"],
        default: "pending",
    },
    isActive: { type: Boolean, default: true },
});

channelPartnerSchema.index({ organization: 1, phone: 1 }, { unique: true });

module.exports = require("mongoose").model("ChannelPartner", channelPartnerSchema);
