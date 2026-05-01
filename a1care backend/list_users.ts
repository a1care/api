import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function listUsers() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const users = await db.collection('users').find().toArray();
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
        console.log(`- ${u._id}: ${u.name || u.username || 'UNNAMED'}`);
    });
    await mongoose.disconnect();
}

listUsers().catch(console.error);
