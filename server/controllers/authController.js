const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const OtpToken = require("../models/OtpToken");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { ROLE_LABELS } = require("../config/roles");

const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;

// With no SMS gateway wired up the demo build uses a fixed code and returns it
// in the response. Set OTP_MODE=live once a real gateway is connected.
const isDemoMode = () => process.env.OTP_MODE !== "live";

const generateCode = () =>
    isDemoMode()
        ? process.env.DEMO_OTP || "123456"
        : String(crypto.randomInt(100000, 999999));

const signToken = (user) =>
    jwt.sign(
        {
            userId: user._id,
            organizationId: user.organization._id || user.organization,
            role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

const shapeUser = (user) => ({
    id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role],
    initials: user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join(""),
    avatarColor: user.avatarColor,
    organization: user.organization,
});

// POST /api/auth/send-otp
const sendOtp = asyncHandler(async (req, res) => {
    const phone = String(req.body.phone || "").trim();

    if (!/^[6-9]\d{9}$/.test(phone)) {
        throw ApiError.badRequest("Enter a valid 10-digit mobile number");
    }

    const user = await User.findOne({ phone });

    if (!user) throw ApiError.notFound("This number is not registered");
    if (!user.isActive) throw ApiError.forbidden("This account is inactive");

    const code = generateCode();

    // Any earlier unused code for this number stops working immediately.
    await OtpToken.deleteMany({ phone });

    await OtpToken.create({
        phone,
        codeHash: await bcrypt.hash(code, 10),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    });

    res.json({
        success: true,
        message: `OTP sent to +91 ${phone}`,
        expiresInSeconds: OTP_TTL_MINUTES * 60,
        // Only ever present in demo mode.
        ...(isDemoMode() ? { demoOtp: code } : {}),
    });
});

// POST /api/auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
    const phone = String(req.body.phone || "").trim();
    const otp = String(req.body.otp || "").trim();

    if (!phone || !otp) throw ApiError.badRequest("Mobile number and OTP are required");

    const token = await OtpToken.findOne({ phone, consumedAt: null }).sort("-createdAt");

    if (!token) throw ApiError.unauthorized("No active OTP. Please request a new one");

    if (token.expiresAt < new Date()) {
        await token.deleteOne();
        throw ApiError.unauthorized("This OTP has expired. Please request a new one");
    }

    if (token.attempts >= MAX_ATTEMPTS) {
        await token.deleteOne();
        throw ApiError.unauthorized("Too many wrong attempts. Please request a new OTP");
    }

    if (!(await bcrypt.compare(otp, token.codeHash))) {
        token.attempts += 1;
        await token.save();

        throw ApiError.unauthorized(
            `Incorrect OTP. ${MAX_ATTEMPTS - token.attempts} attempts left`
        );
    }

    token.consumedAt = new Date();
    await token.save();

    const user = await User.findOne({ phone }).populate("organization", "name logo");

    if (!user) throw ApiError.notFound("User not found");

    user.lastLoginAt = new Date();
    await user.save();

    res.json({
        success: true,
        message: "Signed in successfully",
        token: signToken(user),
        user: shapeUser(user),
    });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
    res.json({ success: true, user: shapeUser(req.user) });
});

module.exports = { sendOtp, verifyOtp, me };
