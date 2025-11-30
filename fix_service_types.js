const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Service = require('./src/models/service.model');

dotenv.config();

const updates = [
    { name: 'Lab Tests', type: 'LabTest' },
    { name: 'Medical Equipment', type: 'MedicalEquipment' },
    { name: 'Ambulance', type: 'Ambulance' },
    { name: 'Video Consultation', type: 'VideoConsultation' },
    { name: 'OPD Booking', type: 'OPD' }
];

async function fixTypes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        for (const update of updates) {
            const res = await Service.updateOne(
                { name: update.name },
                { $set: { type: update.type } }
            );
            console.log(`Updated ${update.name}: ${res.modifiedCount > 0 ? 'Changed' : 'No Change'} (Matched: ${res.matchedCount})`);
        }

        console.log('Done');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixTypes();
