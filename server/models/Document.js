const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

const documentSchema = tenantSchema({
    title: { type: String, required: true, trim: true },
    category: {
        type: String,
        enum: [
            "agreement",
            "allotment_letter",
            "kyc",
            "brochure",
            "floor_plan",
            "rera",
            "receipt",
            "noc",
            "other",
        ],
        default: "other",
    },
    fileUrl: { type: String, default: "" },
    fileType: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    // A document hangs off exactly one of these.
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
    status: {
        type: String,
        enum: ["pending", "uploaded", "verified", "rejected", "expired"],
        default: "uploaded",
        index: true,
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model("Document", documentSchema);
