import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function cleanupOrphanedRecords() {
    try {
        await mongoose.connect(mongoUri);
        const db = mongoose.connection.db;
        if (!db) throw new Error('Database connection failed');

        console.log('--- STARTING CLEANUP OF ORPHANED RECORDS ---');

        // 1. Get all valid IDs for Patients and Staffs
        const patients = await db.collection('patients').find({}, { projection: { _id: 1 } }).toArray();
        const validPatientIds = new Set(patients.map(p => p._id.toString()));
        console.log(`Valid Patients: ${validPatientIds.size}`);

        const staffs = await db.collection('staffs').find({}, { projection: { _id: 1 } }).toArray();
        const validStaffIds = new Set(staffs.map(s => s._id.toString()));
        console.log(`Valid Staffs (Doctors): ${validStaffIds.size}`);

        // 2. Cleanup Doctor Appointments
        const doctorAppointments = await db.collection('doctorappointments').find().toArray();
        let daDeleted = 0;
        for (const da of doctorAppointments) {
            const pId = da.patientId?.toString();
            const dId = da.doctorId?.toString();

            const pExists = pId ? validPatientIds.has(pId) : false;
            const dExists = dId ? validStaffIds.has(dId) : false;

            if (!pExists || !dExists) {
                await db.collection('doctorappointments').deleteOne({ _id: da._id });
                // Also delete from hospitalbookings if it exists
                await db.collection('hospitalbookings').deleteMany({ bookingId: da._id });
                daDeleted++;
            }
        }
        console.log(`Doctor Appointments cleaned: ${daDeleted}`);

        // 3. Cleanup Service Requests
        const serviceRequests = await db.collection('servicerequests').find().toArray();
        let srDeleted = 0;
        for (const sr of serviceRequests) {
            const uId = sr.userId?.toString();
            // assignedProviderId is optional, but if it exists it should be valid
            const pId = sr.assignedProviderId?.toString();

            const uExists = uId ? validPatientIds.has(uId) : false;
            const pExists = pId ? validStaffIds.has(pId) : true; // true if missing (broadcasted)

            if (!uExists || !pExists) {
                await db.collection('servicerequests').deleteOne({ _id: sr._id });
                srDeleted++;
            }
        }
        console.log(`Service Requests cleaned: ${srDeleted}`);

        // 4. Cleanup Hospital Bookings (Direct entries)
        const hospitalBookings = await db.collection('hospitalbookings').find().toArray();
        let hbDeleted = 0;
        for (const hb of hospitalBookings) {
            const pId = hb.patientId?.toString();
            if (pId && !validPatientIds.has(pId)) {
                await db.collection('hospitalbookings').deleteOne({ _id: hb._id });
                hbDeleted++;
            }
        }
        console.log(`Hospital Bookings cleaned: ${hbDeleted}`);

        // 5. Cleanup generic 'bookings' collection
        const genericBookings = await db.collection('bookings').find().toArray();
        let gbDeleted = 0;
        for (const gb of genericBookings) {
            const uId = gb.userId?.toString() || gb.patientId?.toString();
            if (uId && !validPatientIds.has(uId)) {
                await db.collection('bookings').deleteOne({ _id: gb._id });
                gbDeleted++;
            }
        }
        console.log(`Generic Bookings cleaned: ${gbDeleted}`);

        console.log('--- CLEANUP COMPLETED ---');

    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await mongoose.disconnect();
    }
}

cleanupOrphanedRecords().catch(console.error);
