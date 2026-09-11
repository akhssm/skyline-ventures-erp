const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

// One ledger line: what a partner or agent earned on a booking.
const commissionSchema = tenantSchema({
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
        index: true,
    },
    channelPartner: { type: mongoose.Schema.Types.ObjectId, ref: "ChannelPartner", index: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    bookingValue: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    grossAmount: { type: Number, default: 0 },
    tdsPercent: { type: Number, default: 5 },
    tdsAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ["accrued", "approved", "on_hold", "paid", "reversed"],
        default: "accrued",
        index: true,
    },
    payoutRun: { type: mongoose.Schema.Types.ObjectId, ref: "PayoutRun" },
    earnedAt: { type: Date, default: Date.now },
});

// Gross, TDS and net always follow from booking value and percentage.
commissionSchema.pre("validate", function () {
    this.grossAmount = Math.round((this.bookingValue * this.percentage) / 100);
    this.tdsAmount = Math.round((this.grossAmount * this.tdsPercent) / 100);
    this.netAmount = this.grossAmount - this.tdsAmount;
});

module.exports = mongoose.model("Commission", commissionSchema);
