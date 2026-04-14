import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DoctorModel from '../Doctors/doctor.model.js';

dotenv.config();

async function checkPartnerByMobile() {
    await mongoose.connect(process.env.MONGO_URI!);
    const mobile = '9701677607';
    const p = await DoctorModel.findOne({ mobileNumber: { $regex: mobile } });
    if (!p) {
        console.log(`--- Partner [${mobile}] NOT FOUND in local DB ---`);
    } else {
        console.log('--- Partner Details ---');
        console.log(`Name: ${p.name}`);
        console.log(`ID: ${p._id}`);
        console.log(`Mobile: ${p.mobileNumber}`);
        console.log(`FCM: ${p.fcmToken}`);
        console.log(`Status: ${p.status}`);
    }
    console.log('-----------------------');
    mongoose.connection.close();
}

checkPartnerByMobile();
