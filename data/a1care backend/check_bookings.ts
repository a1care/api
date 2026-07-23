import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function checkBookings() {
    console.log('Connecting to:', mongoUri);
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        if (!db) throw new Error('Database connection failed');

        const bookings = await db.collection('doctorappointments').find().limit(5).toArray();

        console.log('Sample Bookings:');
        console.log(JSON.stringify(bookings, null, 2));

        for (const b of bookings) {
            if (b.patientId) {
                const patient = await db.collection('patients').findOne({ _id: b.patientId });
                console.log(`Booking ${b._id}: Patient ID ${b.patientId} -> ${patient ? patient.name : 'NOT FOUND'}`);
            } else {
                console.log(`Booking ${b._id}: patientId MISSING`);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkBookings().catch(console.error);
