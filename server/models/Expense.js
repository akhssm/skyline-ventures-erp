const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

const expenseSchema = tenantSchema({
    title: { type: String, required: true, trim: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true },
    category: {
        type: String,
        enum: [
            "marketing",
            "construction",
            "salary",
            "commission",
            "utilities",
            "legal",
            "office",
            "travel",
            "other",
        ],
        default: "other",
    },
    vendor: { type: String, default: "", trim: true },
    amount: { type: Number, required: true, default: 0 },
    gstAmount: { type: Number, default: 0 },
    paidAt: { type: Date, default: Date.now, index: true },
    mode: {
        type: String,
        enum: ["cash", "cheque", "neft", "rtgs", "upi", "card"],
        default: "neft",
    },
    invoiceNo: { type: String, default: "", trim: true },
    attachmentUrl: { type: String, default: "" },
    status: {
        type: String,
        enum: ["draft", "submitted", "approved", "rejected", "paid"],
        default: "submitted",
        index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    remarks: { type: String, default: "" },
});

module.exports = mongoose.model("Expense", expenseSchema);
