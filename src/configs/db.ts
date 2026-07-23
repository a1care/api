import mongoose from "mongoose";

// NOTE: bufferCommands defaults to TRUE in Mongoose.
// Keeping it true so queries made during server startup are
// queued and executed once the connection is established.
// Setting it to false causes instant failures during reconnects.

mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
mongoose.connection.on("disconnected", () => console.warn("⚠️ MongoDB disconnected"));
mongoose.connection.on("error", (err) => console.error("❌ MongoDB error:", err.message));

const MONGO_OPTIONS = {
    serverSelectionTimeoutMS: 15000,  // Wait up to 15s to find a server
    connectTimeoutMS: 20000,          // Wait up to 20s for initial connection
    socketTimeoutMS: 45000,           // Close sockets after 45s of inactivity
    maxPoolSize: 10,                  // Maintain up to 10 connections in pool
    heartbeatFrequencyMS: 10000,      // Check server health every 10s
};

export async function connectDb(retries = 5, delay = 3000): Promise<void> {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error("CRITICAL ERROR: MONGO_URI not found in .env");
        if (process.env.NODE_ENV === "production") process.exit(1);
        return;
    }

    // Already connected — skip
    if (mongoose.connection.readyState === 1) {
        console.log("✅ MongoDB already connected");
        return;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await mongoose.connect(uri, MONGO_OPTIONS);
            console.log(`✅ MongoDB connected (attempt ${attempt})`);
            return;
        } catch (err: any) {
            console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}`);
            if (attempt < retries) {
                console.log(`⏳ Retrying in ${delay / 1000}s...`);
                await new Promise((r) => setTimeout(r, delay));
            }
        }
    }

    if (process.env.NODE_ENV === "production") {
        console.error("CRITICAL: Could not connect to MongoDB after all retries. Exiting...");
        process.exit(1);
    }

    console.warn("⚠️ Continuing in DEVELOPMENT mode without a DB connection. Some features will not work.");
}
