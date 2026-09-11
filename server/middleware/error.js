const ApiError = require("../utils/ApiError");

const notFound = (req, res, next) => {
    next(ApiError.notFound(`Route ${req.originalUrl} does not exist`));
};

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Server error";

    if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors)
            .map((e) => e.message)
            .join(", ");
    }

    if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    if (err.code === 11000) {
        statusCode = 409;
        message = `Duplicate value for ${Object.keys(err.keyValue).join(", ")}`;
    }

    if (statusCode === 500) {
        console.error(err);
    }

    res.status(statusCode).json({ success: false, message });
};

module.exports = { notFound, errorHandler };
