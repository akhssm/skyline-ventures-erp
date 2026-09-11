const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// Reads the bearer token, loads the user and pins the request to one
// organization so no query can ever reach another tenant's data.
const protect = asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
        throw ApiError.unauthorized("No token provided");
    }

    let payload;

    try {
        payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    } catch {
        throw ApiError.unauthorized("Session expired, please sign in again");
    }

    const user = await User.findById(payload.userId)
        .populate("organization", "name logo")
        .lean();

    if (!user) throw ApiError.unauthorized("User no longer exists");
    if (!user.isActive) throw ApiError.forbidden("User account is inactive");

    req.user = user;
    req.organizationId = user.organization._id;

    next();
});

// Route guard: restrict(ROLES.ACCOUNTANT, ROLES.PROPERTY_OWNER)
const restrict =
    (...roles) =>
    (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(ApiError.forbidden());
        }
        next();
    };

module.exports = { protect, restrict };
