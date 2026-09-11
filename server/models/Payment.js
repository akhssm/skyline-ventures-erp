const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

// One receipt against a booking milestone. Drives revenue and collection KPIs.
const paymentSchema = tenantSchema({
    receiptNo: { type: String, required: true, trim: true },
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
        index: true,
    },
    milestoneLabel: { type: String, default: "", trim: true },
    amount: { type: Number, required: true, default: 0 },
    dueDate: { type: Date },
    paidAt: { type: Date, index: true },
    mode: {
        type: String,
        enum: ["cash", "cheque", "neft", "rtgs", "upi", "card", "loan"],
        default: "neft",
    },
    referenceNo: { type: String, default: "", trim: true },
    status: {
        type: String,
        enum: ["due", "paid", "bounced", "cancelled"],
        default: "due",
        index: true,
    },
    remarks: { type: String, default: "" },
});

paymentSchema.index({ organization: 1, receiptNo: 1 }, { unique: true });

module.exports = mongoose.model("Payment", paymentSchema);
