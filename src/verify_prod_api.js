const BASE_URL = 'https://api-esf1.onrender.com/api';
const TEST_USER = {
    mobile_number: '9988776655',
    role: 'User'
};

// Helper to print curl
const printCurl = (method, url, headers = {}, body = null) => {
    let curl = `curl -X ${method} "${url}"`;
    for (const [key, value] of Object.entries(headers)) {
        curl += ` -H "${key}: ${value}"`;
    }
    if (body) {
        curl += ` -H "Content-Type: application/json" -d '${JSON.stringify(body)}'`;
    }
    console.log('\n--- CURL COMMAND ---');
    console.log(curl);
    console.log('--------------------\n');
};

const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, options);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json();
};

const runVerification = async () => {
    try {
        console.log('--- 1. USER FLOW ---');

        // 1.1 User Login
        console.log('1.1 User Login...');
        const userLoginRes = await fetchJson(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_USER)
        });
        const userToken = userLoginRes.token;
        console.log('✅ User Login Successful.');
        printCurl('POST', `${BASE_URL}/auth/login`, { 'Content-Type': 'application/json' }, TEST_USER);

        const userAuthHeaders = {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
        };

        // 1.2 Get Services
        console.log('1.2 Fetching Services...');
        const servicesRes = await fetchJson(`${BASE_URL}/booking/services`);
        console.log(`✅ Fetched ${servicesRes.services.length} services.`);
        printCurl('GET', `${BASE_URL}/booking/services`);

        // 1.3 Get Service Items
        console.log('1.3 Fetching Service Items...');
        const itemsRes = await fetchJson(`${BASE_URL}/service-items`);
        console.log(`✅ Fetched ${itemsRes.items.length} items.`);
        printCurl('GET', `${BASE_URL}/service-items`);

        // 1.4 Get Single Service Item
        if (itemsRes.items.length > 0) {
            const itemId = itemsRes.items[0]._id;
            console.log(`1.4 Fetching Single Service Item (${itemId})...`);
            await fetchJson(`${BASE_URL}/service-items/${itemId}`);
            console.log('✅ Fetched Single Service Item.');
            printCurl('GET', `${BASE_URL}/service-items/${itemId}`);
        }

        // 1.5 Get Doctors (OPD)
        console.log('1.5 Fetching Available Doctors...');
        let doctorId = null;
        try {
            const doctorsRes = await fetchJson(`${BASE_URL}/booking/doctors/opd`, { headers: userAuthHeaders });
            console.log(`✅ Fetched ${doctorsRes.doctors.length} doctors.`);
            printCurl('GET', `${BASE_URL}/booking/doctors/opd`, userAuthHeaders);
            if (doctorsRes.doctors.length > 0) {
                doctorId = doctorsRes.doctors[0]._id;
            }
        } catch (err) {
            console.error('⚠️ Doctor fetch failed:', err.message);
        }

        // 1.6 Get Doctor Details & Slots
        if (doctorId) {
            console.log(`1.6 Fetching Doctor Details (${doctorId})...`);
            await fetchJson(`${BASE_URL}/booking/doctors/${doctorId}`);
            console.log('✅ Fetched Doctor Details.');
            printCurl('GET', `${BASE_URL}/booking/doctors/${doctorId}`);

            console.log(`1.7 Fetching Doctor Slots (${doctorId})...`);
            const today = new Date().toISOString().split('T')[0];
            await fetchJson(`${BASE_URL}/booking/doctors/${doctorId}/slots?date=${today}`);
            console.log('✅ Fetched Doctor Slots.');
            printCurl('GET', `${BASE_URL}/booking/doctors/${doctorId}/slots?date=${today}`);
        }

        // 1.8 User Bookings
        console.log('1.8 Fetching User Bookings...');
        await fetchJson(`${BASE_URL}/booking/user`, { headers: userAuthHeaders });
        console.log('✅ Fetched User Bookings.');
        printCurl('GET', `${BASE_URL}/booking/user`, userAuthHeaders);

        // 1.9 Get User Profile (NEW)
        console.log('1.9 Fetching User Profile...');
        await fetchJson(`${BASE_URL}/auth/profile`, { headers: userAuthHeaders });
        console.log('✅ Fetched User Profile.');
        printCurl('GET', `${BASE_URL}/auth/profile`, userAuthHeaders);


        console.log('\n--- 2. DOCTOR FLOW ---');

        // 2.1 Doctor Login
        console.log('2.1 Doctor Login...');
        const doctorLoginData = { mobile_number: '8877665544', role: 'Doctor' }; // Mock Doctor
        const docLoginRes = await fetchJson(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(doctorLoginData)
        });
        const docToken = docLoginRes.token;
        console.log('✅ Doctor Login Successful.');
        printCurl('POST', `${BASE_URL}/auth/login`, { 'Content-Type': 'application/json' }, doctorLoginData);

        // Doctor specific APIs can be added here if any (e.g., view own appointments)
        const docAuthHeaders = {
            'Authorization': `Bearer ${docToken}`,
            'Content-Type': 'application/json'
        };

        // 2.2 Update Profile
        console.log('2.2 Updating Doctor Profile...');
        await fetchJson(`${BASE_URL}/doctor/profile`, {
            method: 'PUT',
            headers: docAuthHeaders,
            body: JSON.stringify({ consultation_fee: 800, experience: 12, about: 'Expert Cardiologist' })
        });
        console.log('✅ Doctor Profile Updated.');
        printCurl('PUT', `${BASE_URL}/doctor/profile`, docAuthHeaders, { consultation_fee: 800, experience: 12, about: 'Expert Cardiologist' });

        // 2.3 Manage Slots (Working Hours)
        console.log('2.3 Updating Working Hours...');
        await fetchJson(`${BASE_URL}/doctor/slots`, {
            method: 'POST',
            headers: docAuthHeaders,
            body: JSON.stringify({ working_hours: [{ day: 'Monday', start: '09:00', end: '17:00' }] })
        });
        console.log('✅ Working Hours Updated.');
        printCurl('POST', `${BASE_URL}/doctor/slots`, docAuthHeaders, { working_hours: [{ day: 'Monday', start: '09:00', end: '17:00' }] });

        // 2.4 Get Appointments
        console.log('2.4 Fetching Doctor Appointments...');
        await fetchJson(`${BASE_URL}/doctor/appointments`, { headers: docAuthHeaders });
        console.log('✅ Fetched Doctor Appointments.');
        printCurl('GET', `${BASE_URL}/doctor/appointments`, docAuthHeaders);

        console.log('\n🎉 Comprehensive API Verification Completed!');

    } catch (error) {
        console.error('❌ Verification Failed:', error.message);
    }
};

runVerification();
