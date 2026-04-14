import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DoctorModel from '../Doctors/doctor.model.js';

dotenv.config();

async function checkPartnerById() {
    await mongoose.connect(process.env.MONGO_URI!);
    const partnerId = '699a7b66728083eed2ad8f12';
    const p = await DoctorModel.findById(partnerId);
    if (!p) {
        console.log('--- Partner NOT FOUND in local DB ---');
    } else {
        console.log('--- Partner Details ---');
        console.log(`Name: ${p.name}`);
        console.log(`Mobile: ${p.mobileNumber}`);
        console.log(`FCM: ${p.fcmToken}`);
        console.log(`Status: ${p.status}`);
    }
    console.log('-----------------------');
    mongoose.connection.close();
}

checkPartnerById();
