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

    const extraExpansions = [
        {
            name: "Bone & Joint Health",
            desc: "Screening for Arthritis, Osteoporosis, and mineral deficiencies.",
            img: "https://cdn-icons-png.flaticon.com/512/2864/2864278.png",
            items: [
                { name: "Arthritis Screening (Basic)", price: 1500, desc: "RA Factor, Uric Acid, Calcium, and CBC." },
                { name: "Vitamin D & Calcium Combo", price: 950, desc: "Essential duo for bone density and strength." },
                { name: "Bone Mineral Profile", price: 1800, desc: "Phosphorus, Calcium, Alkaline Phosphatase, and Vitamin D." }
            ]
        },
        {
            name: "Immunity & Allergy",
            desc: "Tests to check your body's defense system and sensitivities.",
            img: "https://cdn-icons-png.flaticon.com/512/2818/2818313.png",
            items: [
                { name: "Immunity Profile", price: 2200, desc: "Immunoglobulin IgE, CBC, and Vitamin levels." },
                { name: "Comprehensive Allergy Test", price: 3500, desc: "Testing for 100+ food and environmental allergens." },
                { name: "Inflammation Markers (CRP/ESR)", price: 600, desc: "Checking for active inflammation in the body." }
            ]
        }
    ];

    for (const exp of extraExpansions) {
        const sub = await SubService.create({
            name: exp.name,
            description: exp.desc,
            serviceId: diagnostics._id,
            imageUrl: exp.img
        });

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

    console.log("Successfully added specialized Diagnostic categories!");
    process.exit(0);
}

run();
