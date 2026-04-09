import mongoose from "mongoose";
import { Service } from "./src/modules/Services/service.model.js";
import { SubService } from "./src/modules/Services/subService.model.js";
import { ChildServiceModel } from "./src/modules/Services/childService.model.js";
import doctorModel from "./src/modules/Doctors/doctor.model.js";
import { RoleModel as Role } from "./src/modules/roles/role.model.js";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.sluef25.mongodb.net/a1care?retryWrites=true&w=majority";

async function seed() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected!");

    console.log("Clearing old data...");
    await Service.deleteMany({});
    await SubService.deleteMany({});
    await ChildServiceModel.deleteMany({});
    await Role.deleteMany({});
    await doctorModel.deleteMany({});

    // 1. Ensure Roles exist
    let doctorRole = await Role.findOne({ code: 'DOCTOR' });
    if (!doctorRole) {
        doctorRole = await Role.create({
            name: 'Doctor',
            code: 'DOCTOR',
            description: 'Medical Professional',
            capabilities: ["HOME_VISIT", "HOSPITAL_VISIT", "VIRTUAL"]
        });
    }

    let nurseRole = await Role.findOne({ code: 'NURSE' });
    if (!nurseRole) {
        nurseRole = await Role.create({
            name: 'Nurse',
            code: 'NURSE',
            description: 'Nursing Staff',
            capabilities: ["HOME_VISIT", "HOSPITAL_VISIT"]
        });
    }

    let paramedicalRole = await Role.findOne({ code: 'PARAMEDICAL' });
    if (!paramedicalRole) {
        paramedicalRole = await Role.create({
            name: 'Paramedical',
            code: 'PARAMEDICAL',
            description: 'Ambulance & Emergency',
            capabilities: ["HOME_VISIT"]
        });
    }

    // --- DOCTOR CREATION POOL ---
    const specialtyPool = [
        "Cardiologist", "Neurologist", "Orthopedic", "Pulmonologist",
        "General Physician", "Pediatrician", "Dermatologist", "Gastroenterologist",
        "Gynecologist", "ENT Specialist", "Psychiatrist"
    ];

    const generateDoctors = async (spec: string, count: number) => {
        const docs = [];
        for (let i = 1; i <= count; i++) {
            const doc = await doctorModel.create({
                name: `Dr. ${spec} ${i}`,
                mobileNumber: `+91 ${Math.floor(6000000000 + Math.random() * 4000000000)}`,
                gender: i % 2 === 0 ? "Male" : "Female",
                specialization: [spec],
                status: "Active",
                consultationFee: 400 + Math.floor(Math.random() * 600),
                homeConsultationFee: 800 + Math.floor(Math.random() * 500),
                onlineConsultationFee: 300 + Math.floor(Math.random() * 300),
                about: `Dr. ${spec} ${i} is a highly qualified specialist with extensive experience in ${spec}.`,
                rating: 4 + Math.random(),
                roleId: doctorRole!._id,
                isRegistered: true,
                startExperience: new Date(2010 + Math.floor(Math.random() * 10), 0, 1)
            });
            docs.push(doc);
        }
        return docs;
    };

    console.log("Generating Doctors...");
    for (const spec of specialtyPool) {
        await generateDoctors(spec, 3); // 3 doctors for each specialty
    }

    // 2. DOCTOR CONSULT SERVICES
    const doctorConsult = await Service.create({
        name: "Doctor Consult",
        title: "Expert Doctors",
        type: "SELECT",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/3774/3774299.png"
    });

    const subModes = [
        { name: "Home Visit", desc: "Consult at your doorstep", mode: "HOME_VISIT" },
        { name: "Online Consult", desc: "Virtual video call", mode: "VIRTUAL" },
        { name: "Hospital Visit", desc: "OP at A1Care Hospital", mode: "HOSPITAL_VISIT" }
    ];

    for (const mode of subModes) {
        const sub = await SubService.create({
            name: mode.name,
            description: mode.desc,
            serviceId: doctorConsult._id,
            imageUrl: "https://cdn-icons-png.flaticon.com/512/3774/3774299.png"
        });

        for (const spec of specialtyPool) {
            await ChildServiceModel.create({
                name: spec,
                description: `${mode.name} for ${spec}`,
                price: mode.mode === "HOME_VISIT" ? 800 : mode.mode === "VIRTUAL" ? 400 : 200,
                selectionType: "SELECT",
                fulfillmentMode: mode.mode,
                allowedRoleIds: [doctorRole!._id.toString()],
                serviceId: doctorConsult._id,
                subServiceId: sub._id
            });
        }
    }

    // 3. HOME NURSING
    const nursingService = await Service.create({
        name: "Home Nursing",
        title: "Trained Caregivers",
        type: "ASSIGN",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/3209/3209935.png"
    });

    const nursingSubs = ["Standard Care", "Critical Care", "Elderly Care"];
    for (const nsubName of nursingSubs) {
        const sub = await SubService.create({
            name: nsubName,
            description: `${nsubName} by certified nurses`,
            serviceId: nursingService._id,
            imageUrl: "https://cdn-icons-png.flaticon.com/512/3209/3209935.png"
        });

        await ChildServiceModel.create({
            name: "12-Hour Shift",
            description: "Daytime patient management",
            price: 1500,
            selectionType: "ASSIGN",
            fulfillmentMode: "HOME_VISIT",
            allowedRoleIds: [nurseRole!._id.toString()],
            serviceId: nursingService._id,
            subServiceId: sub._id
        });

        await ChildServiceModel.create({
            name: "24-Hour Shift",
            description: "Round the clock intensive care",
            price: 2800,
            selectionType: "ASSIGN",
            fulfillmentMode: "HOME_VISIT",
            allowedRoleIds: [nurseRole!._id.toString()],
            serviceId: nursingService._id,
            subServiceId: sub._id
        });
    }

    // 4. AMBULANCE
    const ambulanceService = await Service.create({
        name: "Ambulance",
        title: "Emergency Response",
        type: "ASSIGN",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/1032/1032988.png"
    });

    const ambSub = await SubService.create({
        name: "Instant Dispatch",
        description: "Emergency ambulance service",
        serviceId: ambulanceService._id,
        imageUrl: "https://cdn-icons-png.flaticon.com/512/1032/1032988.png"
    });

    const ambTypes = [
        { name: "BLS Ambulance", desc: "Oxygen & Stretcher", price: 1500 },
        { name: "ALS Ambulance", desc: "ICU & Ventilator", price: 4000 },
        { name: "Cardiac Ambulance", desc: "Defibrillator & ECG", price: 5500 }
    ];

    for (const atype of ambTypes) {
        await ChildServiceModel.create({
            name: atype.name,
            description: atype.desc,
            price: atype.price,
            selectionType: "ASSIGN",
            fulfillmentMode: "HOME_VISIT",
            allowedRoleIds: [paramedicalRole!._id.toString()],
            serviceId: ambulanceService._id,
            subServiceId: ambSub._id
        });
    }

    // 5. LAB TESTS
    const labService = await Service.create({
        name: "Lab Tests",
        title: "Home Sample Collection",
        type: "ASSIGN",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/1205/1205565.png"
    });

    const labSubs = ["Heart Health", "Fever Panels", "Senior Citizen", "Thyroid Profile"];
    for (const lsub of labSubs) {
        const sub = await SubService.create({
            name: lsub,
            description: `Comprehensive ${lsub} testing`,
            serviceId: labService._id,
            imageUrl: "https://cdn-icons-png.flaticon.com/512/1205/1205565.png"
        });

        await ChildServiceModel.create({
            name: `${lsub} Basic`,
            description: "Essential markers included",
            price: 499,
            selectionType: "ASSIGN",
            fulfillmentMode: "HOME_VISIT",
            allowedRoleIds: [paramedicalRole!._id.toString()],
            serviceId: labService._id,
            subServiceId: sub._id
        });

        await ChildServiceModel.create({
            name: `${lsub} Premium`,
            description: "Advanced diagnostic markers",
            price: 1499,
            selectionType: "ASSIGN",
            fulfillmentMode: "HOME_VISIT",
            allowedRoleIds: [paramedicalRole!._id.toString()],
            serviceId: labService._id,
            subServiceId: sub._id
        });
    }

    console.log("Done seeding massive healthcare data!");
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
