const { tenantSchema } = require("./_base");

const projectSchema = tenantSchema({
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    city: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    reraNumber: { type: String, default: "", trim: true },
    // Towers are always read with their project, so they are embedded.
    towers: [
        {
            name: { type: String, required: true, trim: true },
            floors: { type: Number, default: 0 },
            unitsPerFloor: { type: Number, default: 0 },
        },
    ],
    status: {
        type: String,
        enum: ["planning", "under_construction", "ready", "completed"],
        default: "under_construction",
    },
    possessionDate: { type: Date },
    isActive: { type: Boolean, default: true },
});

projectSchema.index({ organization: 1, name: 1 }, { unique: true });

module.exports = require("mongoose").model("Project", projectSchema);
