const axios = require('axios');
const API_URL = 'https://api-esf1.onrender.com/api';
const DATE = '2025-01-25';

async function run() {
    try {
        console.log('--- START ---');

        // 1. Doctor Login
        const dPh = '99' + Math.floor(1e7 + Math.random() * 9e7);
        const dRes = await axios.post(`${API_URL}/auth/login`, { mobile_number: dPh, role: 'Doctor' });
        const dTok = dRes.data.token;
        // Decode ID
        const dId = JSON.parse(decodeURIComponent(atob(dTok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))).id;
        console.log('Doc:', dId);

        // 2. Create Slots
        await axios.post(`${API_URL}/doctor/slots`, { date: DATE, slots: [{ start: "10:00", end: "10:30" }] }, { headers: { Authorization: `Bearer ${dTok}` } });
        console.log('Slots Created.');

        // 3. User Login
        const uPh = '98' + Math.floor(1e7 + Math.random() * 9e7);
        const uRes = await axios.post(`${API_URL}/auth/login`, { mobile_number: uPh, role: 'User' });
        const uTok = uRes.data.token;
        if (!uRes.data.isRegistered) await axios.post(`${API_URL}/auth/register`, { name: 'T', email: `t${uPh}@e.com` }, { headers: { Authorization: `Bearer ${uTok}` } });

        // 4. Get Slots
        const sgRes = await axios.get(`${API_URL}/booking/doctors/${dId}/slots?date=${DATE}`);
        const slot = sgRes.data.slots[0];
        console.log('Slot:', slot.id);

        // 5. Book
        console.log('Booking...');
        await axios.post(`${API_URL}/booking/create`, {
            itemType: "User", itemId: dId, booking_date: DATE, slotId: slot.id, payment_method: "COD"
        }, { headers: { Authorization: `Bearer ${uTok}` } });
        console.log('Booked!');

        // 6. Verify
        const vRes = await axios.get(`${API_URL}/booking/doctors/${dId}/slots?date=${DATE}`);
        console.log('Status:', vRes.data.slots[0].is_booked);

    } catch (e) {
        if (e.response && e.response.data) {
            console.log('ERR MSG:', e.response.data.error);
            console.log('STACK:', e.response.data.stack ? e.response.data.stack.split('\n').slice(0, 3).join('\n') : 'No Stack');
        } else {
            console.log('ERR:', e.message);
        }
    }
}

function atob(str) {
    return Buffer.from(str, 'base64').toString('binary');
}

run();
