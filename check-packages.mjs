import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

const HealthPackage = mongoose.model("HealthPackage", new mongoose.Schema({ name: String }));

async function run() {
    await mongoose.connect(MONGO_URI);
    const items = await HealthPackage.find();
    console.log("Health Packages count:", items.length);
    console.log("Health Packages:", items.map(i => i.name));
    process.exit(0);
}

run();
