import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function listPatients() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const patients = await db.collection('patients').find().toArray();
    console.log(`Found ${patients.length} patients:`);
    patients.forEach(p => {
        console.log(`- ${p._id}: ${p.name || 'UNNAMED'}`);
    });
    await mongoose.disconnect();
}

listPatients().catch(console.error);
