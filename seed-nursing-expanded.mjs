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
    
    const homeNursing = await Service.findOne({ name: /home nursing/i });
    if (!homeNursing) {
        console.error("Home Nursing category not found!");
        process.exit(1);
    }

    const nursingExpansions = [
        {
            name: "Nursing Procedures",
            desc: "On-call nursing visits for injections, dressing, and clinical tasks.",
            img: "https://cdn-icons-png.flaticon.com/512/3063/3063200.png",
            items: [
                { name: "Injection Administration (IM/IV)", price: 300, desc: "Professional injection administration at home." },
                { name: "Wound Dressing (Minor/Major)", price: 500, desc: "Sterile dressing for wounds or post-surgical stitches." },
                { name: "IV Drip / Infusion Setup", price: 600, desc: "Setting up and monitoring IV fluids or medications." },
                { name: "Urinary Catheterization", price: 700, desc: "Insertion or change of urinary catheter by a trained nurse." }
            ]
        },
        {
            name: "Mother & Baby Care",
            desc: "Post-delivery care for mother and newborn baby.",
            img: "https://cdn-icons-png.flaticon.com/512/3209/3209044.png",
            items: [
                { name: "Newborn Baby Care (12 hrs)", price: 1500, desc: "Specialized massage, bathing, and vitals monitoring for newborns." },
                { name: "Post-Delivery Mother Care", price: 1200, desc: "Lactation support and recovery monitoring for new mothers." }
            ]
        },
        {
            name: "Onco-Nursing",
            desc: "Specialized nursing support for cancer patients.",
            img: "https://cdn-icons-png.flaticon.com/512/3063/3063176.png",
            items: [
                { name: "Chemotherapy Support (at Home)", price: 2000, desc: "Clinical monitoring and support during recovery phases." }
            ]
        }
    ];

    for (const exp of nursingExpansions) {
        // Create SubService
        const sub = await SubService.create({
            name: exp.name,
            description: exp.desc,
            serviceId: homeNursing._id,
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
                serviceId: homeNursing._id,
                subServiceId: sub._id,
                imageUrl: exp.img
            });
        }
    }

    console.log("Successfully expanded Home Nursing catalog!");
    process.exit(0);
}

run();
