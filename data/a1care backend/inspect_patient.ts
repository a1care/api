import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function inspectPatient() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const p = await db.collection('patients').findOne();
    console.log('Patient Structure:', JSON.stringify(p, null, 2));

    // Also check for family members
    const members = await db.collection('members').find().toArray();
    console.log('Members count:', members.length);

    await mongoose.disconnect();
}

inspectPatient().catch(console.error);
