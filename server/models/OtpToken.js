const mongoose = require("mongoose");

// One-time passwords live in their own collection and are removed by a TTL
// index the moment they expire, so nothing has to sweep them manually.
const otpTokenSchema = new mongoose.Schema(
    {
        phone: { type: String, required: true, index: true },
        codeHash: { type: String, required: true },
        attempts: { type: Number, default: 0 },
        consumedAt: { type: Date },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpToken", otpTokenSchema);
