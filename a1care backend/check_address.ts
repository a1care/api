import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function checkAddress() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const p = await db.collection('patient_addresses').findOne({ patientId: new mongoose.Types.ObjectId('6979eb07ab1df5715edbd7a9') });
    console.log('Address search result:', p);
    await mongoose.disconnect();
}

checkAddress().catch(console.error);
