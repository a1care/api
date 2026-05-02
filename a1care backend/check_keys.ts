import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function checkKeys() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const b = await db.collection('doctorappointments').findOne();
    console.log('Fields:', Object.keys(b));
    await mongoose.disconnect();
}

checkKeys().catch(console.error);
