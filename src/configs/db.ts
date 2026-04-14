import mongoose from "mongoose";

// Best practice: Disable buffering to avoid long timeouts when DB is down
mongoose.set("bufferCommands", false);

export async function connectDb() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error("CRITICAL ERROR: MONGO_URI not found in .env");
        if (process.env.NODE_ENV === "production") {
            process.exit(1);
        }
        return;
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000, // Fail fast if connection cannot be established
            connectTimeoutMS: 10000,
        });
        console.log("✅ MongoDB connected successfully");
    } catch (err: any) {
        console.error("❌ MongoDB connection failed:", err.message);

        if (process.env.NODE_ENV === "production") {
            console.error("CRITICAL: Database connection required in production. Exiting...");
            process.exit(1);
        }

        console.warn("⚠️ Continuing in DEVELOPMENT mode with limited functionality.");
    }
}
