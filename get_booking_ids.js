const axios = require('axios');
const API_URL = 'https://api-esf1.onrender.com/api';

async function run() {
    try {
        console.log('--- FETCHING IDS ---');

        // 1. Get a Doctor (OPD)
        // We can check slots to get a doctor ID, or just login as user and search?
        // Let's use the Verify script logic to login as User
        const ph = '98' + Math.floor(1e7 + Math.random() * 9e7);
        const uRes = await axios.post(`${API_URL}/auth/login`, { mobile_number: ph, role: 'User' });
        const uTok = uRes.data.token;
        if (!uRes.data.isRegistered) await axios.post(`${API_URL}/auth/register`, { name: 'Curl Gen', email: `c${ph}@g.com` }, { headers: { Authorization: `Bearer ${uTok}` } });

        // Get Doctor Slot (implies Doctor exists)
        // Actually, let's just use the /booking/services logic to find items.
        // But finding a doctor is easiest via existing slots or just knowing one.
        // Let's use the one from previous context if possible, or create a slot to ensure we have one.
        // Or simpler: Just get ANY doctor.
        // Taking a shortcut: I will use the doctor ID from previous context if I don't find one easily, 
        // but let's try to query services.

        // 2. Get a Child Service (Lab Test)
        // We have hierarchy: Service -> SubService -> ChildService.
        // Let's fetch all services -> pick one (not OPD if possible, or check types).
        // Actually, we don't have a direct "search all child services" endpoint exposed publicly?
        // We have /booking/services/:id/items.
        // Let's rely on finding a ChildService in the DB via direct query if strictly needed? 
        // No, I should use API.

        // Strategy: Get Services -> Get SubServices -> Get ChildServices.
        const sRes = await axios.get(`${API_URL}/booking/services`);
        const services = sRes.data.services;

        let labItem = null;

        for (const svc of services) {
            const ssRes = await axios.get(`${API_URL}/booking/services/${svc._id}/sub-services`);
            for (const sub of ssRes.data.subServices) {
                const csRes = await axios.get(`${API_URL}/booking/sub-services/${sub._id}/child-services`);
                const children = csRes.data.childServices;
                const found = children.find(c => c.service_type !== 'OPD');
                if (found) {
                    labItem = found;
                    break;
                }
            }
            if (labItem) break;
        }

        console.log('User Token:', uTok);
        if (labItem) {
            console.log('Lab Service ID:', labItem._id);
            console.log('Lab Service Name:', labItem.name);
        } else {
            console.log('No Lab Service found via API traversal.');
        }

    } catch (e) {
        console.error('ERR:', e.message);
    }
}

run();
