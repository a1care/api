import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

const ServiceSchema = new mongoose.Schema({ name: String, title: String, type: String, imageUrl: String }, { timestamps: true });
const SubServiceSchema = new mongoose.Schema({ name: String, description: String, serviceId: mongoose.Schema.Types.ObjectId, imageUrl: String }, { timestamps: true });
const ChildServiceSchema = new mongoose.Schema({ 
    name: String, description: String, serviceId: mongoose.Schema.Types.ObjectId, subServiceId: mongoose.Schema.Types.ObjectId, 
    price: Number, selectionType: String, fulfillmentMode: String, imageUrl: String
}, { timestamps: true });

const Service = mongoose.model("Service", ServiceSchema);
const SubService = mongoose.model("SubService", SubServiceSchema);
const ChildService = mongoose.model("ChildService", ChildServiceSchema);

async function run() {
    console.log("Connecting to DB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected.");

    // 1. Pharmacy Category (Type: pharma)
    const pharmacy = await Service.create({
        name: "Pharmacy",
        title: "Online Medicines",
        type: "pharma",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/883/883356.png"
    });
    console.log("Created Pharmacy category.");

    // Add subcategories for Pharmacy but NO child categories
    await SubService.create({ name: "Prescription Medicines", description: "Upload prescription to order", serviceId: pharmacy._id, imageUrl: pharmacy.imageUrl });
    await SubService.create({ name: "OTC & Wellness", description: "Over the counter health products", serviceId: pharmacy._id, imageUrl: pharmacy.imageUrl });

    // 2. Medical Equipment Rentals
    const rentals = await Service.create({
        name: "Medical Equipment Rentals",
        title: "Rent Hospital Gear",
        type: "service",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/1032/1032988.png"
    });
    console.log("Created Medical Equipment Rentals category.");

    const rentalData = [
        {
            sub: "Respiratory Support",
            desc: "Oxygen and breathing assistance machines.",
            img: "https://cdn-icons-png.flaticon.com/512/3209/3209935.png",
            items: [
                { name: "Oxygen Concentrator (5L)", price: 4000, desc: "Monthly rental for 5L concentrator" },
                { name: "BiPAP Machine", price: 5000, desc: "Monthly rental for BiPAP ST" }
            ]
        },
        {
            sub: "Hospital Beds",
            desc: "Manual and semi-electric beds for home care.",
            img: "https://cdn-icons-png.flaticon.com/512/3209/3209935.png",
            items: [
                { name: "Manual Hospital Bed", price: 2500, desc: "Monthly rental for 2-function bed" },
                { name: "Electric Hospital Bed", price: 4500, desc: "Monthly rental for fully auto bed" }
            ]
        },
        {
            sub: "Mobility Aids",
            desc: "Wheelchairs and walkers for daily mobility.",
            img: "https://cdn-icons-png.flaticon.com/512/3209/3209935.png",
            items: [
                { name: "Standard Wheelchair", price: 800, desc: "Monthly rental for foldable wheelchair" },
                { name: "Electric Wheelchair", price: 3500, desc: "Monthly rental for motorized wheelchair" }
            ]
        }
    ];

    for (const group of rentalData) {
        const sub = await SubService.create({
            name: group.sub,
            description: group.desc,
            serviceId: rentals._id,
            imageUrl: group.img
        });
        
        for (const item of group.items) {
            await ChildService.create({
                name: item.name,
                description: item.desc,
                price: item.price,
                selectionType: "SELECT",
                fulfillmentMode: "HOME_VISIT",
                serviceId: rentals._id,
                subServiceId: sub._id,
                imageUrl: group.img
            });
        }
    }

    console.log("New categories seeded successfully!");
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
