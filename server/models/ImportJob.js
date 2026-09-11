const { tenantSchema } = require("./_base");

// One bulk lead upload, kept so partial failures can be reviewed later.
const importJobSchema = tenantSchema({
    fileName: { type: String, required: true, trim: true },
    source: { type: String, default: "csv", trim: true },
    totalRows: { type: Number, default: 0 },
    importedRows: { type: Number, default: 0 },
    duplicateRows: { type: Number, default: 0 },
    failedRows: { type: Number, default: 0 },
    rowErrors: [{ row: Number, message: String }],
    status: {
        type: String,
        enum: ["queued", "processing", "completed", "failed"],
        default: "queued",
    },
    completedAt: { type: Date },
});

module.exports = require("mongoose").model("ImportJob", importJobSchema);
