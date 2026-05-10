import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

const Service = mongoose.model("Service", new mongoose.Schema({ name: String }));
const SubService = mongoose.model("SubService", new mongoose.Schema({ name: String, serviceId: mongoose.Schema.Types.ObjectId }));

async function run() {
    await mongoose.connect(MONGO_URI);
    const services = await Service.find();
    console.log("Categories:", services.map(s => s.name));
    
    for (const s of services) {
        const subs = await SubService.find({ serviceId: s._id });
        console.log(`Subcategories for ${s.name}:`, subs.map(i => i.name));
    }
    process.exit(0);
}

run();
