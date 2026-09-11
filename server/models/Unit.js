const mongoose = require("mongoose");
const { tenantSchema } = require("./_base");

// The five states drawn in the tower grid on the login hero.
const UNIT_STATUSES = ["available", "hold", "reserved", "booked", "sold"];

const unitSchema = tenantSchema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true,
    },
    tower: { type: String, required: true, trim: true },
    flatNo: { type: String, required: true, trim: true },
    floor: { type: Number, default: 0 },
    unitType: { type: String, default: "2BHK", trim: true },
    carpetArea: { type: Number, default: 0 },
    builtUpArea: { type: Number, default: 0 },
    facing: { type: String, default: "", trim: true },
    view: { type: String, default: "", trim: true },
    // What the unit is: a flat, a shop, a plot. Drives which fields apply.
    unitCategory: { type: String, default: "Flat / Apartment", trim: true },
    isFacingChargeApplicable: { type: Boolean, default: false },
    isCornerChargeApplicable: { type: Boolean, default: false },
    ratePerSqft: { type: Number, default: 0 },
    basePrice: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    status: { type: String, enum: UNIT_STATUSES, default: "available" },
    heldUntil: { type: Date },
    isActive: { type: Boolean, default: true },
});

unitSchema.index(
    { organization: 1, project: 1, tower: 1, flatNo: 1 },
    { unique: true }
);

module.exports = mongoose.model("Unit", unitSchema);
module.exports.UNIT_STATUSES = UNIT_STATUSES;
