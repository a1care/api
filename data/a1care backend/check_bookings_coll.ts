import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function checkBookingsCollection() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const b = await db.collection('bookings').find().limit(5).toArray();
    console.log('Bookings Collection Sample:', JSON.stringify(b, null, 2));
    await mongoose.disconnect();
}

checkBookingsCollection().catch(console.error);
