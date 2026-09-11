const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

// The five tabs on the Pending Bookings screen.
const BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled", "refund"];

const bookingSchema = tenantSchema({
    bookingNo: { type: String, required: true, trim: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", index: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerEmail: { type: String, default: "", trim: true, lowercase: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true, index: true },
    paymentPlan: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentPlan" },
    // Whoever closed the sale, shown as "sold by" in the ownership column.
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Post-sales owner. Null renders the "Unassigned" pill plus Assign button.
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    channelPartner: { type: mongoose.Schema.Types.ObjectId, ref: "ChannelPartner" },
    totalAmount: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    receivedAmount: { type: Number, default: 0 },
    bookingDate: { type: Date, default: Date.now },
    status: { type: String, enum: BOOKING_STATUSES, default: "pending", index: true },
    saleType: { type: String, enum: ["sale", "resale", "rental"], default: "sale" },
    cancelledAt: { type: Date },
    cancelReason: { type: String, default: "" },
    refundAmount: { type: Number, default: 0 },
});

bookingSchema.index({ organization: 1, bookingNo: 1 }, { unique: true });

bookingSchema.virtual("balanceAmount").get(function () {
    return Math.max(this.totalAmount - this.discount - this.receivedAmount, 0);
});

bookingSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Booking", bookingSchema);
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
