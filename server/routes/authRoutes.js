const express = require("express");
const rateLimit = require("express-rate-limit");

const { sendOtp, verifyOtp, me } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Keeps a single IP from walking the 6-digit space.
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many attempts. Try again in 10 minutes" },
});

router.post("/send-otp", otpLimiter, sendOtp);
router.post("/verify-otp", otpLimiter, verifyOtp);
router.get("/me", protect, me);

module.exports = router;
