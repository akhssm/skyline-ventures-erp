const mongoose = require("mongoose");
const { ROLE_VALUES } = require("../config/roles");
const { tenantSchema } = require("./_base");

const userSchema = tenantSchema({
    name: { type: String, required: true, trim: true },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"],
    },
    email: { type: String, trim: true, lowercase: true, default: "" },
    role: { type: String, required: true, enum: ROLE_VALUES },
    // Managers own a team; each member points back at their manager.
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
    avatarColor: { type: String, default: "#2563eb" },
    lastLoginAt: { type: Date },
    isActive: { type: Boolean, default: true },
});

// Initials shown in the round avatar chip.
userSchema.virtual("initials").get(function () {
    return this.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");
});

userSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("User", userSchema);
