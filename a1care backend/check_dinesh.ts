import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function checkDinesh() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const b = await db.collection('doctorappointments').findOne({ patientId: new mongoose.Types.ObjectId('69dae7b49a09eb68213820d4') });
    console.log('Booking for Dinesh:', b);
    await mongoose.disconnect();
}

checkDinesh().catch(console.error);
