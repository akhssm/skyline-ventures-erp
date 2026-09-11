const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

// A reusable construction-linked or time-linked schedule template.
const paymentPlanSchema = tenantSchema({
    name: { type: String, required: true, trim: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    planType: {
        type: String,
        enum: ["construction_linked", "time_linked", "down_payment", "custom"],
        default: "construction_linked",
    },
    milestones: [
        {
            label: { type: String, required: true, trim: true },
            percentage: { type: Number, required: true, default: 0 },
            dueAfterDays: { type: Number, default: 0 },
        },
    ],
    isActive: { type: Boolean, default: true },
});

// A plan that does not add up to 100 percent would silently under-bill.
paymentPlanSchema.pre("validate", function () {
    const total = this.milestones.reduce((sum, m) => sum + m.percentage, 0);

    if (this.milestones.length && Math.round(total) !== 100) {
        // invalidate() produces a ValidationError, which the error handler
        // reports as a 400 rather than an unexplained 500.
        this.invalidate(
            "milestones",
            `Milestones must total 100 percent, got ${total} percent`
        );
    }
});

module.exports = mongoose.model("PaymentPlan", paymentPlanSchema);
