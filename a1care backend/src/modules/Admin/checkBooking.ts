import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkLatestBooking() {
    await mongoose.connect(process.env.MONGO_URI!);
    const db = mongoose.connection.db;
    const latest = await db?.collection('servicerequests').find().sort({ createdAt: -1 }).limit(1).toArray();
    console.log('--- Latest Booking ---');
    console.log(JSON.stringify(latest, null, 2));
    console.log('-----------------------');
    mongoose.connection.close();
}

checkLatestBooking();
