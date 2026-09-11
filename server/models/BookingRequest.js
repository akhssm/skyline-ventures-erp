const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

// A sales agent raises a request; post-sales approves it into a Booking.
const bookingRequestSchema = tenantSchema({
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    requestedAmount: { type: Number, default: 0 },
    tokenAmount: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
        index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    remarks: { type: String, default: "" },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
});

module.exports = mongoose.model("BookingRequest", bookingRequestSchema);
