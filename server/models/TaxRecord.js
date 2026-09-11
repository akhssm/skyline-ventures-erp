const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

// GST and TDS filings tracked per period.
const taxRecordSchema = tenantSchema({
    taxType: {
        type: String,
        enum: ["gst_output", "gst_input", "tds", "stamp_duty", "registration"],
        required: true,
    },
    period: { type: String, required: true, trim: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    taxableValue: { type: Number, default: 0 },
    ratePercent: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    dueDate: { type: Date },
    filedAt: { type: Date },
    challanNo: { type: String, default: "", trim: true },
    status: {
        type: String,
        enum: ["pending", "filed", "paid", "overdue"],
        default: "pending",
        index: true,
    },
});

module.exports = mongoose.model("TaxRecord", taxRecordSchema);
