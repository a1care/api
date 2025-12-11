const axios = require('axios');

const API_URL = 'https://api-esf1.onrender.com/api';
// Doctor ID from the user's token
const DOCTOR_ID = '6934dd8379c636c5210b960d';
// The user provided this doctor token, we use it to mark bookings as completed
const DOCTOR_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzRkZDgzNzljNjM2YzUyMTBiOTYwZCIsInJvbGUiOiJEb2N0b3IiLCJpYXQiOjE3NjUwNzIyNjAsImV4cCI6MTc5NjYwODI2MH0.KYkhcfufAHaNppImlzLzoa6hMs4P529QDnrGCsckpQw';

async function seedBookings() {
    try {
        console.log('--- Starting Seed Script ---');

        // 1. Identify Dates
        // Need to use valid dates. 'New' = Future. 'Upcoming' = Future. 'Completed' = Past.
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
        // Past date is tricky for booking creation, might need to book future then force update date+status if needed, 
        // OR rely on just status update.
        // Let's stick to future booking + status update for simplicity unless API blocks it.

        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        // 2. Login as a Generic User
        const randomPhone = '98' + Math.floor(10000000 + Math.random() * 90000000);
        console.log(`1. Authenticating as User (Phone: ${randomPhone})...`);

        const loginRes = await axios.post(`${API_URL}/auth/login`, { mobile_number: randomPhone, role: 'User' });

        if (!loginRes.data.success) {
            throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
        }

        const userToken = loginRes.data.token;
        console.log('   User Authenticated.');

        if (!loginRes.data.isRegistered) {
            // CHANGED TO POST
            await axios.post(`${API_URL}/auth/register`, {
                name: 'Test Patient',
                email: `testpatient${randomPhone}@example.com`
            }, { headers: { Authorization: `Bearer ${userToken}` } });
        }

        // 3. Create 'New' Booking (Pending Payment)
        const min1 = Math.floor(Math.random() * 30);
        const slot1Start = `${nextWeekStr}T10:${min1 < 10 ? '0' + min1 : min1}:00.000Z`;
        const slot1End = `${nextWeekStr}T10:${min1 + 30}:00.000Z`;

        console.log('2. Creating "New" Booking...');
        try {
            await axios.post(`${API_URL}/booking/create`, {
                itemType: 'User',
                itemId: DOCTOR_ID,
                booking_date: nextWeekStr,
                slotStartTime: slot1Start,
                slotEndTime: slot1End,
                slotId: slot1Start,
                payment_method: 'Online'
            }, { headers: { Authorization: `Bearer ${userToken}` } });
            console.log('   "New" Booking Created.');
        } catch (e) {
            console.log('   Failed to create New booking (Slot taken?): ' + e.message);
        }

        // 4. Create 'Upcoming' Booking (Confirmed)
        const min2 = Math.floor(Math.random() * 30);
        const slot2Start = `${nextWeekStr}T11:${min2 < 10 ? '0' + min2 : min2}:00.000Z`;
        const slot2End = `${nextWeekStr}T11:${min2 + 30}:00.000Z`;

        console.log('3. Creating "Upcoming" Booking...');
        try {
            await axios.post(`${API_URL}/booking/create`, {
                itemType: 'User',
                itemId: DOCTOR_ID,
                booking_date: nextWeekStr,
                slotStartTime: slot2Start,
                slotEndTime: slot2End,
                slotId: slot2Start,
                payment_method: 'COD'
            }, { headers: { Authorization: `Bearer ${userToken}` } });
            console.log('   "Upcoming" Booking Created.');
        } catch (e) {
            console.log('   Failed to create Upcoming booking: ' + e.message);
        }

        // 5. Create 'Completed' Booking
        const min3 = Math.floor(Math.random() * 30);
        const slot3Start = `${nextWeekStr}T12:${min3 < 10 ? '0' + min3 : min3}:00.000Z`;
        const slot3End = `${nextWeekStr}T12:${min3 + 30}:00.000Z`;

        console.log('4. Creating Booking to mark as Completed...');
        const completedRes = await axios.post(`${API_URL}/booking/create`, {
            itemType: 'User',
            itemId: DOCTOR_ID,
            booking_date: nextWeekStr,
            slotStartTime: slot3Start,
            slotEndTime: slot3End,
            slotId: slot3Start,
            payment_method: 'COD'
        }, { headers: { Authorization: `Bearer ${userToken}` } });

        const bookingId = completedRes.data.booking_details.booking_id;
        console.log(`   Booking Created (ID: ${bookingId}). Marking as Completed...`);

        // Doctor marks it as Completed
        try {
            await axios.put(`${API_URL}/doctor/appointments/${bookingId}/status`, {
                status: 'Completed'
            }, { headers: { Authorization: `Bearer ${DOCTOR_TOKEN}` } });
            console.log('   Marked as Completed.');
        } catch (err) {
            console.error('   Failed to mark completed (User might see it as New/Upcoming):', err.response?.data?.message || err.message);
        }

        console.log('\n--- SUCCESS: Bookings Seeded ---');
        console.log('Check the Doctor App to see 1 "New" (Pending), 1 "Upcoming", and 1 "Completed".');

    } catch (error) {
        console.error('Script Error:', error.response?.data || error.message);
    }
}

seedBookings();
