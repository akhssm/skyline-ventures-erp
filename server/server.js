require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");

// Registers every schema so populate() resolves regardless of request path.
require("./models");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Local dev plus every Vercel preview and production URL you deploy to.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin(origin, callback) {
            // Server-to-server calls and curl send no Origin header.
            if (!origin) return callback(null, true);

            const allowed =
                allowedOrigins.includes(origin) || /\.vercel\.app$/.test(new URL(origin).hostname);

            callback(allowed ? null : new Error(`Origin ${origin} is not allowed`), allowed);
        },
        credentials: true,
    })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "Skyline Ventures ERP API is running" });
});

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 9000;

// Vercel imports the app; a normal host starts it. Connecting first means the
// first request never races an unopened connection.
if (process.env.VERCEL) {
    connectDB();
} else {
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    });
}

module.exports = app;
