import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function checkUser() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const u = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId('6979eb07ab1df5715edbd7a9') });
    console.log('User Search result in users collection:', u);
    await mongoose.disconnect();
}

checkUser().catch(console.error);
