import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

const Service = mongoose.model("Service", new mongoose.Schema({ name: String }));
const SubService = mongoose.model("SubService", new mongoose.Schema({ name: String, description: String, serviceId: mongoose.Schema.Types.ObjectId, imageUrl: String }));
const ChildService = mongoose.model("ChildService", new mongoose.Schema({ 
    name: String, description: String, serviceId: mongoose.Schema.Types.ObjectId, subServiceId: mongoose.Schema.Types.ObjectId, 
    price: Number, selectionType: String, fulfillmentMode: String, imageUrl: String
}));

async function run() {
    await mongoose.connect(MONGO_URI);
    
    const diagnostics = await Service.findOne({ name: /diagnostics/i });
    if (!diagnostics) {
        console.error("Diagnostics category not found!");
        process.exit(1);
    }

    const diagExpansions = [
        {
            name: "Health Screening Packages",
            desc: "Comprehensive health checkup bundles for the whole family.",
            img: "https://cdn-icons-png.flaticon.com/512/3063/3063183.png",
            items: [
                { name: "Basic Health Screen", price: 1200, desc: "CBC, Blood Sugar, Cholesterol, and Urine analysis." },
                { name: "Executive Full Body Profile", price: 2500, desc: "Comprehensive 60+ parameters including LFT, KFT, Thyroid." },
                { name: "Diabetes Monitoring Profile", price: 900, desc: "HbA1c, Fasting Glucose, and Lipid Profile." }
            ]
        },
        {
            name: "Vitamin & Mineral Profile",
            desc: "Checking essential vitamin levels for energy and immunity.",
            img: "https://cdn-icons-png.flaticon.com/512/2864/2864278.png",
            items: [
                { name: "Vitamin D3 (25-OH)", price: 800, desc: "Essential for bone health and immunity." },
                { name: "Vitamin B12", price: 600, desc: "Crucial for nerve function and energy levels." },
                { name: "Iron Studies", price: 750, desc: "Checking for Anaemia and iron deficiency." }
            ]
        },
        {
            name: "Home Imaging",
            desc: "Portable medical imaging services at your doorstep.",
            img: "https://cdn-icons-png.flaticon.com/512/2818/2818313.png",
            items: [
                { name: "Home ECG", price: 500, desc: "Resting ECG taken by a certified technician at home." },
                { name: "Portable X-Ray (Home Visit)", price: 1500, desc: "Digital X-ray service for bedridden or elderly patients." }
            ]
        },
        {
            name: "Fever & Infection Panel",
            desc: "Rapid screening for common infections and fevers.",
            img: "https://cdn-icons-png.flaticon.com/512/3063/3063200.png",
            items: [
                { name: "Fever Profile (Basic)", price: 850, desc: "Malaria, Dengue, Typhoid, and CBC screening." },
                { name: "Allergy Screening (Food/Env)", price: 2000, desc: "Testing for common allergens." }
            ]
        }
    ];

    for (const exp of diagExpansions) {
        // Create SubService
        const sub = await SubService.create({
            name: exp.name,
            description: exp.desc,
            serviceId: diagnostics._id,
            imageUrl: exp.img
        });

        // Create Child Services
        for (const item of exp.items) {
            await ChildService.create({
                name: item.name,
                description: item.desc,
                price: item.price,
                selectionType: "SELECT",
                fulfillmentMode: "HOME_VISIT",
                serviceId: diagnostics._id,
                subServiceId: sub._id,
                imageUrl: exp.img
            });
        }
    }

    console.log("Successfully expanded Diagnostics catalog!");
    process.exit(0);
}

run();
