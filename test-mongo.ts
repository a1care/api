import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI;

console.log("Testing MongoDB Connection...");
console.log(`URI length: ${uri?.length}`);
// Don't log the full URI to avoid leaking secrets in logs, but maybe log the host.
const host = uri?.split('@')[1]?.split('/')[0];
console.log(`Target Host: ${host}`);

if (!uri) {
    console.error("MONGO_URI is missing");
    process.exit(1);
}

mongoose.connect(uri)
    .then(() => {
        console.log("Successfully connected to MongoDB!");
        process.exit(0);
    })
    .catch((err) => {
        console.error("Connection failed:", err.message);
        console.error("Full error:", JSON.stringify(err, null, 2));
        process.exit(1);
    });
