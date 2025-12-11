const mongoose = require('mongoose');
const Service = require('./src/models/service.model');
const SubService = require('./src/models/subService.model');
const ChildService = require('./src/models/childService.model');

const MONGO_URI = "mongodb+srv://a1caresocialhub_db_user:P6Xu1TXxHTEQ41ZT@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

const HIERARCHY = [
    {
        name: "Doctor Services",
        type: "Doctor",
        subServices: [
            {
                name: "Doctor Home Visit",
                childServices: [
                    { name: "General Physician (MBBS)", price: 600, service_type: 'Doctor' },
                    { name: "Orthopaedic", price: 800, service_type: 'Doctor' },
                    { name: "Pulmonology", price: 800, service_type: 'Doctor' },
                    { name: "ICU / Critical Care", price: 1200, service_type: 'Doctor' }
                ]
            },
            {
                name: "Specialist Tele Consultation",
                childServices: [
                    { name: "Orthopaedic", price: 500, service_type: 'Doctor' },
                    { name: "Pulmonologist", price: 500, service_type: 'Doctor' },
                    { name: "Neurologist", price: 600, service_type: 'Doctor' }
                ]
            },
            {
                name: "Emergency (Doctor On Call)",
                childServices: [
                    { name: "Emergency Visit", price: 1500, service_type: 'Doctor' }
                ]
            }
        ]
    },
    {
        name: "Nursing Services",
        type: "Service",
        subServices: [
            {
                name: "Daily Injection",
                childServices: [
                    { name: "IV Fluid Administration", price: 300, service_type: 'Service' },
                    { name: "IV Antibiotics", price: 350, service_type: 'Service' },
                    { name: "IM Injection", price: 200, service_type: 'Service' }
                ]
            },
            {
                name: "Catheter Care",
                childServices: [
                    { name: "Catheter Insertion", price: 500, service_type: 'Service' },
                    { name: "Catheter Removal", price: 300, service_type: 'Service' }
                ]
            },
            {
                name: "Wound Care",
                childServices: [
                    { name: "Basic Dressing", price: 400, service_type: 'Service' },
                    { name: "Suture Removal", price: 400, service_type: 'Service' },
                    { name: "Post-Op Wound Care", price: 600, service_type: 'Service' }
                ]
            }
        ]
    },
    {
        name: "Diagnostics @ Home",
        type: "Service",
        subServices: [
            {
                name: "Lab Services",
                childServices: [
                    { name: "Complete Blood Picture (CBP)", price: 450, service_type: 'Service' },
                    { name: "Thyroid Profile", price: 600, service_type: 'Service' },
                    { name: "Lipid Profile", price: 700, service_type: 'Service' }
                ]
            },
            {
                name: "Imaging Services",
                childServices: [
                    { name: "Portable X-Ray", price: 1200, service_type: 'Service' },
                    { name: "ECG @ Home", price: 800, service_type: 'Service' },
                    { name: "Holter Monitor", price: 2500, service_type: 'Service' }
                ]
            }
        ]
    },
    {
        name: "Pharmacy",
        type: "Service",
        subServices: [
            {
                name: "Medicine Delivery",
                childServices: [
                    { name: "Upload Prescription", price: 0, service_type: 'Service' }
                ]
            }
        ]
    },
    {
        name: "Medical Rentals",
        type: "Service",
        subServices: [
            {
                name: "Beds & Furniture",
                childServices: [
                    { name: "Hospital Bed (Manual)", price: 3000, service_type: 'Service' },
                    { name: "Hospital Bed (Electric)", price: 5000, service_type: 'Service' },
                    { name: "Air Mattress", price: 1000, service_type: 'Service' }
                ]
            },
            {
                name: "Respiratory Support",
                childServices: [
                    { name: "Oxygen Concentrator (5L)", price: 4500, service_type: 'Service' },
                    { name: "BiPAP Machine", price: 6000, service_type: 'Service' }
                ]
            }
        ]
    },
    {
        name: "Ambulance",
        type: "Ambulance",
        subServices: [
            {
                name: "Emergency Transport",
                childServices: [
                    { name: "Basic Life Support (BLS)", price: 2000, service_type: 'Ambulance' },
                    { name: "Advanced Life Support (ALS)", price: 4000, service_type: 'Ambulance' }
                ]
            }
        ]
    }
];

async function seedDirect() {
    console.log("🔥 Starting Direct DB Clean & Seed...");

    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ MongoDB Connected");

        // 1. DELETE ALL
        console.log("🧹 Deleting all services...");
        await Service.deleteMany({});
        await SubService.deleteMany({});
        await ChildService.deleteMany({});
        console.log("✅ Database Cleared.");

        // 2. INSERT
        for (const sData of HIERARCHY) {
            console.log(`Processing: ${sData.name}`);

            const service = await Service.create({
                name: sData.name,
                type: sData.type,
                is_active: true,
                image_url: 'https://via.placeholder.com/150'
            });

            for (const subData of sData.subServices) {
                const subService = await SubService.create({
                    serviceId: service._id,
                    name: subData.name,
                    is_active: true,
                    image_url: 'https://via.placeholder.com/150'
                });

                for (const childData of subData.childServices) {
                    await ChildService.create({
                        subServiceId: subService._id,
                        serviceId: service._id, // Some schemas link back to parent
                        name: childData.name,
                        price: childData.price,
                        service_type: childData.service_type,
                        is_active: true,
                        image_url: 'https://via.placeholder.com/150'
                    });
                }
            }
        }

        console.log("✅ Seeding Complete! (Direct Mode)");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

seedDirect();
