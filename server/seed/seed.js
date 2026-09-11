require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const seedCore = require("./seedCore");
const seedOperations = require("./seedOperations");

// Registers every schema so seedCore can clear collections by model name.
require("../models");

const run = async () => {
    await connectDB();

    console.log("\nSeeding Skyline Ventures demo data\n");

    const context = await seedCore();
    await seedOperations(context);

    console.log("\nSeed complete. Sign in with OTP 123456 using any of:\n");
    console.log("  9700000001   Venkat Prasad     Property Owner");
    console.log("  9700000002   Srinivas Naidu    CRM Manager");
    console.log("  9700000011   Venkat Patel      CRM Executive");
    console.log("  9700000017   Venkat Achary     Post-Sales Manager");
    console.log("  9700000021   Saanvi Gupta      System Operator\n");
};

run()
    .then(() => mongoose.connection.close())
    .then(() => process.exit(0))
    .catch(async (error) => {
        console.error("\nSeed failed:", error);
        await mongoose.connection.close().catch(() => {});
        process.exit(1);
    });
