const axios = require('axios');

const API_URL = 'https://api-esf1.onrender.com/api';
const DATE = '2025-01-25';

async function run() {
    try {
        console.log('--- GENERATING LIVE DATA ---');

        // 1. Doctor Login (using a random number to avoid collision or reuse if possible, or just a hardcoded one if we want consistency. Let's make a new one or login existing if we knew credentials. I'll register/login a random one to be safe)
        const dPh = '99' + Math.floor(1e7 + Math.random() * 9e7);
        // We'll try to login, if fail (404), we register. Actually, auth/login checks number. If not found, we can't login.
        // But for "User" role, login creates if not exists? User model says yes?
        // Wait, Doctor login requires existing doctor profile?
        // Let's use the Verify script logic:
        // "const dRes = await axios.post(`${API_URL}/auth/login`, { mobile_number: dPh, role: 'Doctor' });"
        // If this works and returns a token, great.

        // Actually, let's use a "known" pattern or just register.
        // The previous verify script used "99..." and it worked, assuming the backend "login" handles "create if not exist" or "isRegistered" flow.
        // Actually, the backend `auth.controller.js` `login` usually finds user or creates.
        // Let's assume login creates user.

        const dRes = await axios.post(`${API_URL}/auth/login`, { mobile_number: dPh, role: 'Doctor' });
        const dTok = dRes.data.token;
        const dId = JSON.parse(decodeURIComponent(atob(dTok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))).id;

        // Ensure Doctor Profile exists (if new user)
        if (!dRes.data.isRegistered) {
            await axios.post(`${API_URL}/auth/register`, { name: 'Dr. Test', email: `dr${dPh}@test.com` }, { headers: { Authorization: `Bearer ${dTok}` } });
        }

        // 2. Create Slots (Idempotent-ish, if they overlap it errors but we just catch and ignore or use valid times)
        // We'll use a random time to avoid collision if run multiple times for same date
        const startHour = 10 + Math.floor(Math.random() * 5);
        const slots = [{ start: `${startHour}:00`, end: `${startHour}:15` }];

        try {
            await axios.post(`${API_URL}/doctor/slots`, { date: DATE, slots }, { headers: { Authorization: `Bearer ${dTok}` } });
            console.log('Slots created.');
        } catch (e) {
            console.log('Slot creation note:', e.response?.data?.message || e.message);
        }

        // 3. User Login
        const uPh = '98' + Math.floor(1e7 + Math.random() * 9e7);
        const uRes = await axios.post(`${API_URL}/auth/login`, { mobile_number: uPh, role: 'User' });
        const uTok = uRes.data.token;
        if (!uRes.data.isRegistered) {
            await axios.post(`${API_URL}/auth/register`, { name: 'User Test', email: `u${uPh}@test.com` }, { headers: { Authorization: `Bearer ${uTok}` } });
        }

        // 4. Fetch Slots to get ID
        const sRes = await axios.get(`${API_URL}/booking/doctors/${dId}/slots?date=${DATE}`);
        const validSlot = sRes.data.slots.find(s => !s.is_booked);

        if (!validSlot) {
            console.log('No valid slots found! Something went wrong.');
            return;
        }

        const fs = require('fs');
        let output = '';
        output += `### 1. Check Slots for Doctor (GET)\n`;
        output += `curl --location '${API_URL}/booking/doctors/${dId}/slots?date=${DATE}'\n\n`;

        output += `### 2. Create Booking (POST)\n`;
        output += `curl --location '${API_URL}/booking/create' \\\n`;
        output += `--header 'Content-Type: application/json' \\\n`;
        output += `--header 'Authorization: Bearer ${uTok}' \\\n`;
        output += `--data '{\n`;
        output += `    "itemType": "User",\n`;
        output += `    "itemId": "${dId}",\n`;
        output += `    "booking_date": "${DATE}",\n`;
        output += `    "slotId": "${validSlot.id}",\n`;
        output += `    "payment_method": "COD"\n`;
        output += `}'`;

        fs.writeFileSync('curls_output.txt', output);
        console.log('DONE writing to curls_output.txt');

    } catch (e) {
        console.error('ERROR:', e.message);
        if (e.response) console.error('Data:', e.response.data);
    }
}

function atob(str) {
    return Buffer.from(str, 'base64').toString('binary');
}

run();
