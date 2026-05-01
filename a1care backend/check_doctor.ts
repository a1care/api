import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function checkDoctor() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const d = await db.collection('staffs').findOne({ _id: new mongoose.Types.ObjectId('696dbc41f6e571ea244efb4b') });
    console.log('Doctor Search result:', d);
    await mongoose.disconnect();
}

checkDoctor().catch(console.error);
