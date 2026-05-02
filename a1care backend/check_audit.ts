import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function checkAudit() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const logs = await db.collection('auditlogs').find({ targetId: new mongoose.Types.ObjectId('69881d4910bc874aef4368bb') }).toArray();
    console.log('Audit logs for booking:', logs);
    await mongoose.disconnect();
}

checkAudit().catch(console.error);
