import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

const ServiceSchema = new mongoose.Schema({ name: String });
const SubServiceSchema = new mongoose.Schema({ name: String, serviceId: mongoose.Schema.Types.ObjectId });
const ChildServiceSchema = new mongoose.Schema({ name: String, serviceId: mongoose.Schema.Types.ObjectId, subServiceId: mongoose.Schema.Types.ObjectId });

const Service = mongoose.model("Service", ServiceSchema);
const SubService = mongoose.model("SubService", SubServiceSchema);
const ChildService = mongoose.model("ChildService", ChildServiceSchema);

async function run() {
    console.log("Connecting to DB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected.");

    const subCatsToRemove = ["Full Body Packages", "Vital Organ Profiles", "Diabetes & Heart", "Vitamins & Nutrition"];
    
    // 1. Remove added subcategories and their children
    for (const name of subCatsToRemove) {
        const sub = await SubService.findOne({ name });
        if (sub) {
            console.log(`Removing children and subcategory: ${name}`);
            await ChildService.deleteMany({ subServiceId: sub._id });
            await SubService.deleteOne({ _id: sub._id });
        }
    }

    // 2. Remove Vaccinations service and all its children
    const vaccinations = await Service.findOne({ name: "Vaccinations" });
    if (vaccinations) {
        console.log("Removing Vaccinations service and all related data...");
        const subIds = (await SubService.find({ serviceId: vaccinations._id })).map(s => s._id);
        await ChildService.deleteMany({ subServiceId: { $in: subIds } });
        await SubService.deleteMany({ serviceId: vaccinations._id });
        await Service.deleteOne({ _id: vaccinations._id });
    }

    console.log("Undo completed successfully!");
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
