const axios = require('axios');
const API_URL = 'https://api-esf1.onrender.com/api';
const DATE = '2025-01-26';

async function run() {
    try {
        console.log('--- VERIFYING APPOINTMENTS ---');

        // 1. Doctor Login
        const dPh = '99' + Math.floor(1e7 + Math.random() * 9e7);
        // Using login directly, assuming it exists or handled
        let dRes = await axios.post(`${API_URL}/auth/login`, { mobile_number: dPh, role: 'Doctor' });
        const dTok = dRes.data.token;
        if (!dRes.data.isRegistered) await axios.post(`${API_URL}/auth/register`, { name: 'Dr. Verify', email: `dr${dPh}@v.com` }, { headers: { Authorization: `Bearer ${dTok}` } });

        // Get Doctor ID 
        // We need the ACTUAL Doctor Document ID (itemId), not just User ID.
        // Usually obtained via /doctors/profile or by decoding token (User ID) and assume backend fixed.
        // Let's get "My Details" or similar? No specific endpoint?
        // We can get it from "getMySlots" response if we create slots?
        // Or create slots and read "doctorId" from slot?

        // 2. Create Slot
        const slots = [{ start: "14:00", end: "14:15" }];
        const slRes = await axios.post(`${API_URL}/doctor/slots`, { date: DATE, slots }, { headers: { Authorization: `Bearer ${dTok}` } });
        const createdSlot = slRes.data.slots[0];
        const docId = createdSlot.doctorId; // Ideally returned

        console.log('Doc ID (from slot):', docId);

        // 3. User Login
        const uPh = '98' + Math.floor(1e7 + Math.random() * 9e7);
        const uRes = await axios.post(`${API_URL}/auth/login`, { mobile_number: uPh, role: 'User' });
        const uTok = uRes.data.token;
        if (!uRes.data.isRegistered) await axios.post(`${API_URL}/auth/register`, { name: 'User Verify', email: `u${uPh}@v.com` }, { headers: { Authorization: `Bearer ${uTok}` } });

        // 4. Book
        await axios.post(`${API_URL}/booking/create`, {
            itemType: "User", itemId: docId, booking_date: DATE, slotId: createdSlot._id, payment_method: "COD"
        }, { headers: { Authorization: `Bearer ${uTok}` } });
        console.log('Booked.');

        // 5. Doctor Check Appointments
        const appRes = await axios.get(`${API_URL}/doctor/appointments`, { headers: { Authorization: `Bearer ${dTok}` } });
        console.log('Appt Response:', JSON.stringify(appRes.data, null, 2));

        // Check "new" or "upcoming"
        const allApps = [...appRes.data.appointments.new, ...appRes.data.appointments.upcoming];
        const found = allApps.find(a => a.itemId === docId); // Actually itemId in booking is docId

        console.log('Appointments Found:', allApps.length);
        if (allApps.length > 0) {
            console.log('SUCCESS: Appointment visible!');
        } else {
            console.log('FAILURE: Appointment NOT visible.');
            console.log('New:', appRes.data.appointments.new.length);
        }

    } catch (e) {
        console.error('ERR:', e.message);
        if (e.response) console.error('Data:', JSON.stringify(e.response.data));
    }
}

run();
