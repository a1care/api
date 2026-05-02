import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function checkType() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const b = await db.collection('doctorappointments').findOne({ _id: new mongoose.Types.ObjectId('69881d4910bc874aef4368bb') });
    console.log('patientId value:', b.patientId);
    console.log('patientId type:', typeof b.patientId);
    console.log('is ObjectId Instance:', b.patientId instanceof mongoose.Types.ObjectId);
    console.log('Constructor Name:', b.patientId?.constructor?.name);
    await mongoose.disconnect();
}

checkType().catch(console.error);
