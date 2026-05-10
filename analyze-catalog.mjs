import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

const Service = mongoose.model("Service", new mongoose.Schema({ name: String }));
const SubService = mongoose.model("SubService", new mongoose.Schema({ name: String, serviceId: mongoose.Schema.Types.ObjectId }));

async function analyze() {
    await mongoose.connect(MONGO_URI);
    
    const services = await Service.find({});
    console.log(`FOUND ${services.length} MASTER CATEGORIES\n`);

    for (const service of services) {
        const subs = await SubService.find({ serviceId: service._id });
        console.log(`[${service.name}] -> ${subs.length} sub-categories`);
        subs.forEach(s => console.log(`  - ${s.name}`));
        console.log("");
    }

    process.exit(0);
}

analyze();
