import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function checkMedical() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const r = await db.collection('medicalrecords').findOne({ patientId: new mongoose.Types.ObjectId('6979eb07ab1df5715edbd7a9') });
    console.log('Medical record:', r);
    await mongoose.disconnect();
}

checkMedical().catch(console.error);
