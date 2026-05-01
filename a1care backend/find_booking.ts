import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function findBooking() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;

    // Search for the booking ending in ef4368bb
    const bookings = await db.collection('doctorappointments').find().toArray();
    const targeted = bookings.find(b => b._id.toString().toLowerCase().endsWith('ef4368bb'));

    if (targeted) {
        console.log('FOUND BOOKING:', JSON.stringify(targeted, null, 2));
        if (targeted.patientId) {
            const patient = await db.collection('patients').findOne({ _id: targeted.patientId });
            console.log('PATIENT Search result:', patient);
        }
    } else {
        console.log('Booking not found');
    }

    await mongoose.disconnect();
}

findBooking().catch(console.error);
