import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DoctorModel from '../Doctors/doctor.model.js';

dotenv.config();

async function checkPartners() {
    await mongoose.connect(process.env.MONGO_URI!);
    const partners = await DoctorModel.find({ status: 'Active' }).select('name mobileNumber fcmToken roleId status');
    console.log('--- Active Partners ---');
    partners.forEach(p => {
        console.log(`- ID: ${p._id} | ${p.name || 'N/A'} [${p.mobileNumber}] FCM: ${p.fcmToken ? 'Yes' : 'No'} (${p.fcmToken?.substring(0, 10)}...) Status: ${p.status}`);
    });
    console.log('-----------------------');
    mongoose.connection.close();
}

checkPartners();
