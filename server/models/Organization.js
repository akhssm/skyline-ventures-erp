const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        logo: { type: String, default: "" },
        gstin: { type: String, default: "", trim: true },
        address: { type: String, default: "", trim: true },
        city: { type: String, default: "", trim: true },
        currency: { type: String, default: "INR" },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Organization", organizationSchema);
