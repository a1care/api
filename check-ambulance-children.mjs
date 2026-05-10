import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

const SubService = mongoose.model("SubService", new mongoose.Schema({ name: String }));
const ChildService = mongoose.model("ChildService", new mongoose.Schema({ name: String, subServiceId: mongoose.Schema.Types.ObjectId }));

async function run() {
    await mongoose.connect(MONGO_URI);
    const sub = await SubService.findOne({ name: "Basic Life Support (BLS)" });
    if (sub) {
        const children = await ChildService.find({ subServiceId: sub._id });
        console.log(`Child services for ${sub.name}:`, children.map(c => c.name));
    }
    process.exit(0);
}

run();
