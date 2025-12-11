const axios = require('axios');

const API_URL = 'https://api-esf1.onrender.com/api';
const DATE = '2025-01-25';

async function run() {
    try {
        console.log('--- STARTING SLOT VERIFICATION ---');

        // 1. Doctor Login / Signup
        const doctorPhone = '99' + Math.floor(10000000 + Math.random() * 90000000);
        console.log(`\n1. logging in Doctor (${doctorPhone})...`);
        const docLogin = await axios.post(`${API_URL}/auth/login`, { mobile_number: doctorPhone, role: 'Doctor' });
        const docToken = docLogin.data.token;

        // Use the user ID from the token or login response
        // login response doesn't give ID directly usually, but let's check decoding or if it's in response
        // The auth controller returns: token, role, isRegistered. 
        // We might need to decode token OR use a profile endpoint to get the ID.
        // Actually, the user needs the doctor's USER ID to fetch slots.
        // Let's decode the token loosely without library if possible, or just hit /api/doctor/profile? 
        // No profile endpoint for just fetching ID? 
        // Wait, `login` returns `user` object? 
        // Code: `res.status(200).json({ success: true, ... token, role })`. No ID.
        // I'll use a hack: base64 decode the token payload.

        const base64Url = docToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const docPayload = JSON.parse(jsonPayload);
        const doctorUserId = docPayload.id;

        console.log('   Doctor ID:', doctorUserId);

        // 2. Create Slots
        console.log(`\n2. Creating Slots for ${DATE}...`);
        const slotsPayload = {
            date: DATE,
            slots: [
                { start: "10:00", end: "10:30" },
                { start: "11:00", end: "11:30" }
            ]
        };
        try {
            await axios.post(`${API_URL}/doctor/slots`, slotsPayload, {
                headers: { Authorization: `Bearer ${docToken}` }
            });
            console.log('   Slots created successfully.');
        } catch (e) {
            console.log('   Create Slots Failed:', e.response ? e.response.data : e.message);
            return; // Stop if this fails
        }

        // 3. User Login
        const userPhone = '98' + Math.floor(10000000 + Math.random() * 90000000);
        console.log(`\n3. logging in User (${userPhone})...`);
        const userLogin = await axios.post(`${API_URL}/auth/login`, { mobile_number: userPhone, role: 'User' });
        const userToken = userLogin.data.token;

        // Register user to ensure booking works
        if (!userLogin.data.isRegistered) {
            await axios.post(`${API_URL}/auth/register`, {
                name: 'Slot Tester',
                email: `slot${userPhone}@example.com`
            }, { headers: { Authorization: `Bearer ${userToken}` } });
        }

        // 4. Get Available Slots
        console.log(`\n4. User Fetching Slots for Doctor ${doctorUserId}...`);
        const slotsRes = await axios.get(`${API_URL}/booking/doctors/${doctorUserId}/slots?date=${DATE}`);
        const availableSlots = slotsRes.data.slots;
        console.log(`   Found ${availableSlots.length} slots.`);

        if (availableSlots.length === 0) {
            console.log('   ERROR: No slots found!');
            return;
        }

        const firstSlot = availableSlots[0];
        console.log('   Target Slot:', firstSlot.label, `(ID: ${firstSlot.id})`);

        // 5. Book the Slot
        console.log('\n5. Booking the Slot...');
        const bookingPayload = {
            itemType: "User",
            itemId: doctorUserId,
            booking_date: DATE,
            slotId: firstSlot.id,
            payment_method: "COD"
        };

        const bookingRes = await axios.post(`${API_URL}/booking/create`, bookingPayload, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('   Booking Result:', bookingRes.data.message);
        console.log('   Booking ID:', bookingRes.data.booking_details.booking_id);

        // 6. Verify Slot is now Booked
        console.log('\n6. Verifying Slot is Booked...');
        const verifyRes = await axios.get(`${API_URL}/booking/doctors/${doctorUserId}/slots?date=${DATE}`);
        const updatedSlots = verifyRes.data.slots;
        const targetSlot = updatedSlots.find(s => s.id === firstSlot.id);

        console.log('   Slot Status:', targetSlot.is_booked ? 'BOOKED (Correct)' : 'AVAILABLE (Fail)');

    } catch (error) {
        console.error('\n❌ ERROR:', error.response ? error.response.data : error.message);
    }
}

// Polyfill for atob in Node
function atob(str) {
    return Buffer.from(str, 'base64').toString('binary');
}

run();
