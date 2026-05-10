import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

// Define schemas inline to avoid import issues
const ServiceSchema = new mongoose.Schema({
    name: String,
    title: String,
    type: String,
    imageUrl: String,
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const SubServiceSchema = new mongoose.Schema({
    name: String,
    description: String,
    serviceId: mongoose.Schema.Types.ObjectId,
    imageUrl: String,
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const childServiceSchema = new mongoose.Schema({
    name: String,
    description: String,
    serviceId: mongoose.Schema.Types.ObjectId,
    subServiceId: mongoose.Schema.Types.ObjectId,
    price: Number,
    selectionType: String,
    fulfillmentMode: String,
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    imageUrl: String,
    rating: { type: Number, default: 0 },
    completed: { type: Number, default: 0 }
}, { timestamps: true });

const Service = mongoose.model("Service", ServiceSchema);
const SubService = mongoose.model("SubService", SubServiceSchema);
const ChildService = mongoose.model("ChildService", childServiceSchema);

async function run() {
    console.log("Connecting to DB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected.");

    // 1. Find or Create Diagnostics Service
    let diagnostics = await Service.findOne({ name: /diagnostics/i });
    if (!diagnostics) {
        console.log("Diagnostics service not found, creating one...");
        diagnostics = await Service.create({
            name: "Diagnostics",
            title: "Expert Lab Tests",
            type: "lab",
            imageUrl: "https://cdn-icons-png.flaticon.com/512/1205/1205565.png",
            isActive: true
        });
    }

    // 2. Add New Subcategories for Diagnostics
    const subCats = [
        { name: "Full Body Packages", desc: "Comprehensive health checkups for the whole family", img: "https://cdn-icons-png.flaticon.com/512/3004/3004458.png" },
        { name: "Vital Organ Profiles", desc: "Targeted tests for Liver, Kidney, and Heart", img: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png" },
        { name: "Diabetes & Heart", desc: "Manage your chronic conditions with regular tracking", img: "https://cdn-icons-png.flaticon.com/512/2491/2491214.png" },
        { name: "Vitamins & Nutrition", desc: "Check for essential nutrient deficiencies", img: "https://cdn-icons-png.flaticon.com/512/3022/3022204.png" }
    ];

    for (const sc of subCats) {
        let sub = await SubService.findOne({ name: sc.name, serviceId: diagnostics._id });
        if (!sub) {
            sub = await SubService.create({
                name: sc.name,
                description: sc.desc,
                serviceId: diagnostics._id,
                imageUrl: sc.img,
                isActive: true
            });
            console.log(`Created subcategory: ${sc.name}`);
        }

        // Add Child Services for each subcategory
        if (sc.name === "Full Body Packages") {
            const items = [
                { name: "Basic Full Body Checkup", desc: "58 essential tests for overall wellness", price: 999 },
                { name: "Advanced Full Body Profile", desc: "82 tests including Vitamins & Iron", price: 1999 },
                { name: "Senior Citizen Wellness", desc: "100+ tests curated for 60+ age group", price: 2999 }
            ];
            for (const item of items) {
                const exists = await ChildService.findOne({ name: item.name, subServiceId: sub._id });
                if (!exists) {
                    await ChildService.create({
                        ...item,
                        serviceId: diagnostics._id,
                        subServiceId: sub._id,
                        selectionType: "SELECT",
                        fulfillmentMode: "HOME_VISIT",
                        isFeatured: item.name.includes("Advanced"),
                        imageUrl: sc.img
                    });
                }
            }
        } else if (sc.name === "Vital Organ Profiles") {
            const items = [
                { name: "Liver Function Test (LFT)", desc: "Checks bilirubin, SGOT, SGPT levels", price: 599 },
                { name: "Kidney Function Test (KFT)", desc: "Checks Urea, Creatinine, Electrolytes", price: 699 },
                { name: "Lipid Profile", desc: "Cholesterol, HDL, LDL, Triglycerides", price: 499 }
            ];
            for (const item of items) {
                const exists = await ChildService.findOne({ name: item.name, subServiceId: sub._id });
                if (!exists) {
                    await ChildService.create({
                        ...item,
                        serviceId: diagnostics._id,
                        subServiceId: sub._id,
                        selectionType: "SELECT",
                        fulfillmentMode: "HOME_VISIT",
                        imageUrl: sc.img
                    });
                }
            }
        } else if (sc.name === "Diabetes & Heart") {
            const items = [
                { name: "HbA1c (Diabetes Tracker)", desc: "3-month average glucose levels", price: 399 },
                { name: "Cardiac Risk Markers", desc: "Advanced markers for heart health", price: 1299 }
            ];
            for (const item of items) {
                const exists = await ChildService.findOne({ name: item.name, subServiceId: sub._id });
                if (!exists) {
                    await ChildService.create({
                        ...item,
                        serviceId: diagnostics._id,
                        subServiceId: sub._id,
                        selectionType: "SELECT",
                        fulfillmentMode: "HOME_VISIT",
                        imageUrl: sc.img
                    });
                }
            }
        } else if (sc.name === "Vitamins & Nutrition") {
            const items = [
                { name: "Vitamin D (25-OH)", desc: "Bone health and immunity marker", price: 1200 },
                { name: "Vitamin B12", desc: "Nerve function and energy levels", price: 800 },
                { name: "Iron Studies", desc: "Checks for anemia and iron levels", price: 700 }
            ];
            for (const item of items) {
                const exists = await ChildService.findOne({ name: item.name, subServiceId: sub._id });
                if (!exists) {
                    await ChildService.create({
                        ...item,
                        serviceId: diagnostics._id,
                        subServiceId: sub._id,
                        selectionType: "SELECT",
                        fulfillmentMode: "HOME_VISIT",
                        imageUrl: sc.img
                    });
                }
            }
        }
    }

    // 3. Add New Top-Level Category: Vaccinations
    let vaccinations = await Service.findOne({ name: /vaccination/i });
    if (!vaccinations) {
        vaccinations = await Service.create({
            name: "Vaccinations",
            title: "Immunity & Prevention",
            type: "service",
            imageUrl: "https://cdn-icons-png.flaticon.com/512/3209/3209935.png",
            isActive: true
        });
        console.log("Created Vaccinations service.");
    }

    const vSub = await SubService.findOne({ name: "General Immunity", serviceId: vaccinations._id });
    if (!vSub) {
        const sub = await SubService.create({
            name: "General Immunity",
            description: "Essential vaccines for adults and children",
            serviceId: vaccinations._id,
            imageUrl: "https://cdn-icons-png.flaticon.com/512/3209/3209935.png"
        });

        const vItems = [
            { name: "Flu Vaccine", desc: "Annual influenza protection", price: 1500 },
            { name: "Hepatitis B", desc: "Liver protection vaccine", price: 800 },
            { name: "HPV (Cervical Cancer)", desc: "Prevention for women's health", price: 3500 }
        ];

        for (const item of vItems) {
            await ChildService.create({
                ...item,
                serviceId: vaccinations._id,
                subServiceId: sub._id,
                selectionType: "SELECT",
                fulfillmentMode: "HOME_VISIT",
                imageUrl: sub.imageUrl
            });
        }
    }

    console.log("All data seeded successfully!");
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
