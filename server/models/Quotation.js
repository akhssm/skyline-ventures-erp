const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

const quotationSchema = tenantSchema({
    quoteNo: { type: String, required: true, trim: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
    // Base price, floor rise, parking, corpus fund and so on.
    lineItems: [
        {
            label: { type: String, required: true, trim: true },
            amount: { type: Number, required: true, default: 0 },
            taxable: { type: Boolean, default: true },
        },
    ],
    discount: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 5 },
    subTotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    validUntil: { type: Date },
    status: {
        type: String,
        enum: ["draft", "sent", "accepted", "rejected", "expired"],
        default: "draft",
    },
    sentAt: { type: Date },
});

quotationSchema.index({ organization: 1, quoteNo: 1 }, { unique: true });

// Totals are always derived from the line items so they cannot drift.
quotationSchema.pre("validate", function () {
    this.subTotal = this.lineItems.reduce((sum, item) => sum + item.amount, 0);

    const taxableBase = this.lineItems
        .filter((item) => item.taxable)
        .reduce((sum, item) => sum + item.amount, 0);

    this.taxAmount = Math.round((taxableBase * this.gstPercent) / 100);
    this.grandTotal = this.subTotal - this.discount + this.taxAmount;
});

module.exports = mongoose.model("Quotation", quotationSchema);
