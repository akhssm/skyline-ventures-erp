const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

const notificationSchema = tenantSchema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    type: {
        type: String,
        enum: [
            "lead_assigned",
            "follow_up_due",
            "site_visit",
            "booking",
            "payment",
            "approval",
            "system",
        ],
        default: "system",
    },
    // Where the bell item navigates to when clicked.
    link: { type: String, default: "" },
    readAt: { type: Date, index: true },
});

module.exports = mongoose.model("Notification", notificationSchema);
