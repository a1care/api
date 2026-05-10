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
            name: "Premium Full Body Packages",
            desc: "Ultra-comprehensive checkups covering all vital organs.",
            img: "https://cdn-icons-png.flaticon.com/512/3063/3063183.png",
            items: [
                { name: "Full Body Checkup - Platinum", price: 4500, desc: "90+ parameters: Full Blood, Cardiac, LFT, KFT, Thyroid, Vitamin D & B12." },
                { name: "Senior Citizen Male Profile", price: 3200, desc: "Specialized for 60+: PSA, Cardiac Risk, KFT, LFT, and Bone Health." },
                { name: "Senior Citizen Female Profile", price: 3200, desc: "Specialized for 60+: Thyroid, Calcium, Bone Health, KFT, and LFT." },
                { name: "Women's Wellness Package", price: 2800, desc: "Thyroid Profile, Iron, Calcium, and Vitamin D3." }
            ]
        },
        {
            name: "Organ Specific Panels",
            desc: "Targeted testing for specific organ health.",
            img: "https://cdn-icons-png.flaticon.com/512/2818/2818313.png",
            items: [
                { name: "Liver Function Test (LFT)", price: 700, desc: "8+ parameters including Bilirubin, SGOT, SGPT." },
                { name: "Kidney Function Test (KFT)", price: 750, desc: "Urea, Creatinine, Uric Acid, and Electrolytes." },
                { name: "Thyroid Profile (Total T3, T4, TSH)", price: 550, desc: "Comprehensive thyroid function assessment." },
                { name: "Lipid Profile (Heart Health)", price: 650, desc: "Cholesterol, Triglycerides, HDL, LDL, VLDL." }
            ]
        },
        {
            name: "Routine Blood & Urine Tests",
            desc: "Essential everyday diagnostics.",
            img: "https://cdn-icons-png.flaticon.com/512/3063/3063200.png",
            items: [
                { name: "Complete Blood Count (CBC)", price: 350, desc: "In-depth analysis of RBC, WBC, and Platelets." },
                { name: "HBA1C (3 Month Sugar)", price: 500, desc: "Average blood glucose levels over the last 3 months." },
                { name: "Urine Routine & Micro", price: 250, desc: "Checking for infections and kidney function." }
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

    console.log("Successfully added comprehensive Diagnostics tests!");
    process.exit(0);
}

run();
