const mongoose = require("mongoose");

// Serverless invocations reuse the same container, so the connection is
// cached on the module rather than reopened per request.
let cached = global.__mongoose;

if (!cached) cached = global.__mongoose = { conn: null, promise: null };

const connectDB = async () => {
    if (cached.conn) return cached.conn;

    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI is not set. Add it to server/.env");
        process.exit(1);
    }

    mongoose.set("strictQuery", true);

    if (!cached.promise) {
        cached.promise = mongoose
            .connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 10000,
                maxPoolSize: 10,
            })
            .then((mongooseInstance) => {
                console.log(
                    `MongoDB connected: ${mongooseInstance.connection.host}/${mongooseInstance.connection.name}`
                );
                return mongooseInstance;
            });
    }

    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (error) {
        cached.promise = null;
        console.error(`MongoDB connection failed: ${error.message}`);

        if (!process.env.VERCEL) process.exit(1);
        throw error;
    }
};

module.exports = connectDB;
