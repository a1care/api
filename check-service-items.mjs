import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

async function run() {
    await mongoose.connect(MONGO_URI);
    const items = await mongoose.connection.db.collection("serviceitems").find().toArray();
    console.log("ServiceItems count:", items.length);
    if (items.length > 0) {
        console.log("Sample ServiceItem:", items[0]);
    }
    process.exit(0);
}

run();
