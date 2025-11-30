const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Service = require('./src/models/service.model');
const LabTest = require('./src/models/labTest.model');
const MedicalEquipment = require('./src/models/medicalEquipment.model');
const Ambulance = require('./src/models/ambulance.model');

dotenv.config();

const seedLiveData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Seeding');

        // 1. Seed Services
        const services = [
            { name: 'OPD Booking', title: 'Book Doctor Appointment', type: 'OPD', image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514707000-dummy.png' },
            { name: 'Lab Tests', title: 'Home Sample Collection', type: 'LabTest', image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514710930-dummy.png' },
            { name: 'Medical Equipment', title: 'Rent or Buy Equipment', type: 'MedicalEquipment', image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
            { name: 'Ambulance', title: 'Emergency & Transport', type: 'Ambulance', image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514716766-dummy.png' },
            { name: 'Video Consultation', title: 'Connect with Doctors Online', type: 'VideoConsultation', image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514718641-dummy.png' }
        ];

        // Upsert Services and get their IDs
        const serviceMap = {}; // name -> _id

        for (const service of services) {
            const updatedService = await Service.findOneAndUpdate(
                { name: service.name },
                service,
                { upsert: true, new: true }
            );
            serviceMap[service.type] = updatedService._id;
            console.log(`Service seeded/updated: ${service.name} (ID: ${updatedService._id})`);
        }

        // 2. Seed Lab Tests
        if (serviceMap['LabTest']) {
            const labTests = [
                { name: 'Full Body Checkup', description: 'Complete health checkup including 50+ tests', price: 1500, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' },
                { name: 'Thyroid Profile', description: 'T3, T4, TSH tests', price: 600, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' },
                { name: 'Diabetes Screen', description: 'HbA1c, Fasting Blood Sugar', price: 400, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' },
                { name: 'Vitamin D Test', description: 'Check Vitamin D levels', price: 800, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' },
                { name: 'CBC', description: 'Complete Blood Count', price: 300, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' },
                { name: 'Lipid Profile', description: 'Cholesterol, HDL, LDL', price: 700, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' },
                { name: 'Liver Function Test', description: 'Check liver health', price: 900, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' },
                { name: 'Kidney Function Test', description: 'Creatinine, Urea, etc.', price: 850, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' },
                { name: 'Iron Studies', description: 'Iron, TIBC, Ferritin', price: 1200, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' },
                { name: 'Calcium Test', description: 'Serum Calcium levels', price: 250, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' },
                { name: 'Urine Routine', description: 'Routine urine analysis', price: 150, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' },
                { name: 'Dengue NS1', description: 'Dengue antigen test', price: 600, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' },
                { name: 'Malaria Parasite', description: 'Smear test for Malaria', price: 200, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' },
                { name: 'Typhoid Widal', description: 'Test for Typhoid', price: 300, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' },
                { name: 'Hepatitis B', description: 'HBsAg test', price: 500, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514714883-dummy.png' }
            ];

            for (const test of labTests) {
                await LabTest.findOneAndUpdate(
                    { name: test.name },
                    { ...test, serviceId: serviceMap['LabTest'] },
                    { upsert: true }
                );
            }
            console.log('Lab Tests seeded with Service ID.');
        }

        // 3. Seed Medical Equipment
        if (serviceMap['MedicalEquipment']) {
            const equipment = [
                { name: 'Oxygen Concentrator', description: '5L Oxygen Concentrator', rental_price: 500, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
                { name: 'Wheelchair', description: 'Foldable Wheelchair', rental_price: 100, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
                { name: 'Hospital Bed', description: 'Semi-fowler Bed', rental_price: 300, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
                { name: 'Nebulizer', description: 'Portable Nebulizer', rental_price: 50, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
                { name: 'Suction Machine', description: 'Phlegm Suction Machine', rental_price: 200, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
                { name: 'Air Mattress', description: 'Anti-decubitus Air Mattress', rental_price: 80, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
                { name: 'Walker', description: 'Adjustable Walker', rental_price: 30, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
                { name: 'Commode Chair', description: 'Foldable Commode Chair', rental_price: 60, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
                { name: 'Pulse Oximeter', description: 'Fingertip Pulse Oximeter', rental_price: 20, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
                { name: 'BP Monitor', description: 'Digital BP Monitor', rental_price: 40, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
                { name: 'Glucometer', description: 'Blood Sugar Monitor', rental_price: 30, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
                { name: 'IV Stand', description: 'Adjustable IV Stand', rental_price: 20, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
                { name: 'BiPAP Machine', description: 'BiPAP for Sleep Apnea', rental_price: 800, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
                { name: 'CPAP Machine', description: 'CPAP for Sleep Apnea', rental_price: 700, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' },
                { name: 'Infusion Pump', description: 'Syringe Infusion Pump', rental_price: 400, image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514712891-dummy.png' }
            ];

            for (const item of equipment) {
                await MedicalEquipment.findOneAndUpdate(
                    { name: item.name },
                    { ...item, serviceId: serviceMap['MedicalEquipment'] },
                    { upsert: true }
                );
            }
            console.log('Medical Equipment seeded with Service ID.');
        }

        // 4. Seed Ambulances
        if (serviceMap['Ambulance']) {
            const ambulances = [
                { vehicle_number: 'KA-01-AB-1234', type: 'Basic', price_per_km: 20, base_fare: 500, driver_name: 'Ramesh', driver_phone: '9876543210' },
                { vehicle_number: 'KA-02-CD-5678', type: 'ICU', price_per_km: 50, base_fare: 1500, driver_name: 'Suresh', driver_phone: '9876543211' },
                { vehicle_number: 'KA-03-EF-9012', type: 'Advance', price_per_km: 40, base_fare: 1000, driver_name: 'Mahesh', driver_phone: '9876543212' },
                { vehicle_number: 'KA-04-GH-3456', type: 'Basic', price_per_km: 20, base_fare: 500, driver_name: 'Ganesh', driver_phone: '9876543213' },
                { vehicle_number: 'KA-05-IJ-7890', type: 'ICU', price_per_km: 50, base_fare: 1500, driver_name: 'Dinesh', driver_phone: '9876543214' }
            ];

            for (const amb of ambulances) {
                await Ambulance.findOneAndUpdate(
                    { vehicle_number: amb.vehicle_number },
                    { ...amb, serviceId: serviceMap['Ambulance'] },
                    { upsert: true }
                );
            }
            console.log('Ambulances seeded with Service ID.');
        }

        console.log('Live Data Seeding Completed Successfully!');
        process.exit();
    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    }
};

seedLiveData();
