const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

// A batch that pays out many commission lines in one go.
const payoutRunSchema = tenantSchema({
    runNo: { type: String, required: true, trim: true },
    periodFrom: { type: Date, required: true },
    periodTo: { type: Date, required: true },
    commissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Commission" }],
    totalGross: { type: Number, default: 0 },
    totalTds: { type: Number, default: 0 },
    totalNet: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ["draft", "approved", "processing", "paid", "failed"],
        default: "draft",
        index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    paidAt: { type: Date },
    utrNumber: { type: String, default: "", trim: true },
});

payoutRunSchema.index({ organization: 1, runNo: 1 }, { unique: true });

module.exports = mongoose.model("PayoutRun", payoutRunSchema);
