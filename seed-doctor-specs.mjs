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
    
    const docAtHome = await Service.findOne({ name: /doctor at home/i });
    if (!docAtHome) {
        console.error("Doctor At Home category not found!");
        process.exit(1);
    }

    const specializations = [
        {
            name: "Pediatrician",
            desc: "Specialized care for infants and children at home.",
            price: 1000,
            img: "https://cdn-icons-png.flaticon.com/512/3774/3774299.png"
        },
        {
            name: "Orthopaedic Specialist",
            desc: "Bone, joint, and fracture consultations at home.",
            price: 1200,
            img: "https://cdn-icons-png.flaticon.com/512/3209/3209110.png"
        },
        {
            name: "Cardiologist",
            desc: "Heart health checkups and recovery monitoring.",
            price: 1500,
            img: "https://cdn-icons-png.flaticon.com/512/4661/4661330.png"
        },
        {
            name: "Diabetologist",
            desc: "Diabetes management and hormonal health.",
            price: 1000,
            img: "https://cdn-icons-png.flaticon.com/512/2864/2864278.png"
        },
        {
            name: "Dermatologist",
            desc: "Skin, hair, and nail health consultations.",
            price: 900,
            img: "https://cdn-icons-png.flaticon.com/512/2818/2818366.png"
        },
        {
            name: "Geriatrician",
            desc: "Specialized medical care for senior citizens.",
            price: 1200,
            img: "https://cdn-icons-png.flaticon.com/512/2864/2864248.png"
        },
        {
            name: "Neurologist",
            desc: "Brain and nerve-related medical support.",
            price: 1500,
            img: "https://cdn-icons-png.flaticon.com/512/2818/2818313.png"
        },
        {
            name: "Psychiatrist",
            desc: "Home-based mental health and psychiatric support.",
            price: 1500,
            img: "https://cdn-icons-png.flaticon.com/512/3997/3997904.png"
        }
    ];

    for (const spec of specializations) {
        // Create SubService
        const sub = await SubService.create({
            name: spec.name,
            description: spec.desc,
            serviceId: docAtHome._id,
            imageUrl: spec.img
        });

        // Create one default Child Service for booking
        await ChildService.create({
            name: `${spec.name} Consultation`,
            description: `Home visit by a certified ${spec.name.toLowerCase()}.`,
            price: spec.price,
            selectionType: "SELECT",
            fulfillmentMode: "HOME_VISIT",
            serviceId: docAtHome._id,
            subServiceId: sub._id,
            imageUrl: spec.img
        });
    }

    console.log("Successfully seeded specialized doctor services!");
    process.exit(0);
}

run();
