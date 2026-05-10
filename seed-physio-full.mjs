import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

const ServiceSchema = new mongoose.Schema({ name: String, title: String, type: String, imageUrl: String }, { timestamps: true });
const SubServiceSchema = new mongoose.Schema({ name: String, description: String, serviceId: mongoose.Schema.Types.ObjectId, imageUrl: String }, { timestamps: true });
const ChildServiceSchema = new mongoose.Schema({ 
    name: String, description: String, serviceId: mongoose.Schema.Types.ObjectId, subServiceId: mongoose.Schema.Types.ObjectId, 
    price: Number, selectionType: String, fulfillmentMode: String, allowedRoleIds: [String], imageUrl: String
}, { timestamps: true });
const RoleSchema = new mongoose.Schema({ name: String, code: String, capabilities: [String] }, { timestamps: true });

const Service = mongoose.model("Service", ServiceSchema);
const SubService = mongoose.model("SubService", SubServiceSchema);
const ChildService = mongoose.model("ChildService", ChildServiceSchema);
const Role = mongoose.model("Role", RoleSchema);

async function run() {
    console.log("Connecting to DB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected.");

    // 1. Ensure Role Exists
    let physioRole = await Role.findOne({ code: 'PHYSIO' });
    if (!physioRole) {
        physioRole = await Role.create({
            name: 'Physiotherapist',
            code: 'PHYSIO',
            capabilities: ["HOME_VISIT", "HOSPITAL_VISIT"]
        });
        console.log("Created Physiotherapist role.");
    }

    // 2. Ensure Physiotherapy Service Exists
    let physio = await Service.findOne({ name: /physiotherapy/i });
    if (!physio) {
        physio = await Service.create({
            name: "Physiotherapy",
            title: "Expert Rehabilitation",
            type: "service",
            imageUrl: "https://cdn-icons-png.flaticon.com/512/3209/3209935.png"
        });
        console.log("Created Physiotherapy category.");
    }

    const data = [
        {
            sub: "Elderly Physiotherapy",
            desc: "Dedicated care for senior citizens focused on mobility and fall prevention.",
            items: [
                { name: "Fall Prevention Training", price: 800 },
                { name: "Balance & Mobility Exercise", price: 750 },
                { name: "Geriatric Strength Training", price: 900 }
            ]
        },
        {
            sub: "Chest / Pulmonary",
            desc: "Specialized respiratory rehab for COPD and post-COVID recovery.",
            items: [
                { name: "Post-COVID Rehab", price: 1200 },
                { name: "Breathing Exercises", price: 700 },
                { name: "COPD Physiotherapy", price: 1500 }
            ]
        },
        {
            sub: "Neuro Physiotherapy",
            desc: "Rehabilitation for stroke, paralysis, and Parkinsonism.",
            items: [
                { name: "Stroke Rehabilitation", price: 1500 },
                { name: "Paralysis Care", price: 1800 },
                { name: "Parkinsonism Mobility", price: 1200 }
            ]
        },
        {
            sub: "Orthopedic / Post-Surgical",
            desc: "Recovery support for fractures, knee/hip replacements, and spine rehab.",
            items: [
                { name: "Knee Replacement Rehab", price: 1300 },
                { name: "Hip Replacement Rehab", price: 1400 },
                { name: "Spine & Fracture Rehab", price: 1100 }
            ]
        },
        {
            sub: "Treatments",
            desc: "Advanced physical therapy using medical equipment.",
            items: [
                { name: "IFT Therapy", price: 600 },
                { name: "TENS Treatment", price: 500 },
                { name: "Ultrasound Therapy", price: 700 },
                { name: "Wax Therapy", price: 550 }
            ]
        },
        {
            sub: "Pain Relief Physiotherapy",
            desc: "Targeted relief for acute and chronic body pains.",
            items: [
                { name: "Back Pain / Sciatica Relief", price: 850 },
                { name: "Neck & Frozen Shoulder Relief", price: 750 },
                { name: "Cervical Spondylosis Care", price: 850 },
                { name: "Knee / Heel Pain Relief", price: 700 },
                { name: "Muscle Spasm Treatment", price: 650 }
            ]
        }
    ];

    for (const group of data) {
        let sub = await SubService.findOne({ name: group.sub, serviceId: physio._id });
        if (!sub) {
            sub = await SubService.create({
                name: group.sub,
                description: group.desc,
                serviceId: physio._id,
                imageUrl: physio.imageUrl
            });
            console.log(`Created subcategory: ${group.sub}`);
        }

        for (const item of group.items) {
            const exists = await ChildService.findOne({ name: item.name, subServiceId: sub._id });
            if (!exists) {
                await ChildService.create({
                    name: item.name,
                    description: `${group.sub} - ${item.name}`,
                    price: item.price,
                    selectionType: "SELECT",
                    fulfillmentMode: "HOME_VISIT",
                    allowedRoleIds: [physioRole._id.toString()],
                    serviceId: physio._id,
                    subServiceId: sub._id,
                    imageUrl: sub.imageUrl
                });
            }
        }
    }

    console.log("Physiotherapy expansion completed successfully!");
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
