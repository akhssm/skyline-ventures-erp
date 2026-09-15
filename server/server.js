require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const mongoose = require("mongoose");

const connectDB = require("./config/db");

// Registers every schema so populate() resolves regardless of request path.
require("./models");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

// Render, and every other managed host, terminates TLS on a proxy in front of
// the app. Without this the rate limiter sees one shared proxy address for
// every visitor and express-rate-limit refuses to start.
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Local dev plus every deployed front end. CLIENT_URL takes a comma separated
// list so a preview URL can be added without a code change.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

// Preview deployments get a generated subdomain, so the platform's own domain
// is trusted as a whole rather than listed URL by URL.
const TRUSTED_HOSTS = [/\.onrender\.com$/, /\.vercel\.app$/];

const isAllowedOrigin = (origin) => {
    if (allowedOrigins.includes(origin)) return true;

    try {
        const { hostname } = new URL(origin);
        return TRUSTED_HOSTS.some((pattern) => pattern.test(hostname));
    } catch {
        // A header that is not a URL is not an origin we know.
        return false;
    }
};

app.use(
    cors({
        origin(origin, callback) {
            // Server-to-server calls and curl send no Origin header.
            if (!origin) return callback(null, true);

            const allowed = isAllowedOrigin(origin);

            callback(allowed ? null : new Error(`Origin ${origin} is not allowed`), allowed);
        },
        credentials: true,
    })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

// Render polls this to decide whether the deploy is live, so it answers
// without touching the database. The db field is for humans reading it.
app.get("/api/health", (req, res) => {
    const states = ["disconnected", "connected", "connecting", "disconnecting"];

    res.json({
        success: true,
        message: "Skyline Ventures ERP API is running",
        db: states[mongoose.connection.readyState] || "unknown",
        uptime: Math.round(process.uptime()),
    });
});

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 9000;

// Vercel imports the app rather than starting it. Everywhere else the port is
// bound first and the database dialled alongside, so a slow Atlas handshake
// cannot stall the platform's health check past its deadline.
if (process.env.VERCEL) {
    connectDB();
} else {
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });

    connectDB();
}

module.exports = app;
