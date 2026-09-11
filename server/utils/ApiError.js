class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }

    static badRequest(message) {
        return new ApiError(400, message);
    }

    static unauthorized(message = "Not authenticated") {
        return new ApiError(401, message);
    }

    static forbidden(message = "You do not have access to this resource") {
        return new ApiError(403, message);
    }

    static notFound(message = "Resource not found") {
        return new ApiError(404, message);
    }
}

module.exports = ApiError;
