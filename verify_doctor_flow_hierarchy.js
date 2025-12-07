const mongoose = require('mongoose');
// const fetch = require('node-fetch'); // Using global fetch in Node 22+

// If standard fetch is not available, we might need to handle it. 
// But since I cannot install packages easily, I will try to use global fetch (Node 18+).
// If that fails, I will use http module.
// Actually, 'axios' is safer if installed. Let's check package.json.
// I'll assume axios is NOT installed and use a simple http helper or global fetch.

const BASE_URL = 'http://localhost:3000/api';

async function main() {
    console.log("Starting Verification...");

    // 1. Verify User Registration Flow
    console.log("\n--- 1. Testing User Registration (isRegistered flag) ---");
    const mobileNumber = "99999" + Math.floor(Math.random() * 100000);

    // Login (Signup)
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: mobileNumber, role: 'User' })
    });
    const loginData = await loginRes.json();

    if (!loginData.success) throw new Error("Login failed: " + JSON.stringify(loginData));
    console.log(`Login Success. isRegistered: ${loginData.isRegistered} (Expected: false)`);
    if (loginData.isRegistered !== false) console.error("FAIL: isRegistered should be false");

    const userToken = loginData.token;

    // Register
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ name: "Test User", email: "test" + mobileNumber + "@example.com" })
    });
    const regData = await regRes.json();
    console.log(`Registration Success. Message: ${regData.message}`);

    // Login Again
    const login2Res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: mobileNumber, role: 'User' })
    });
    const login2Data = await login2Res.json();
    console.log(`Re-Login Success. isRegistered: ${login2Data.isRegistered} (Expected: true)`);
    if (login2Data.isRegistered !== true) console.error("FAIL: isRegistered should be true");


    // 2. Verify Service Hierarchy
    console.log("\n--- 2. Testing Service Hierarchy ---");
    // We need to fetch services first.
    const servicesRes = await fetch(`${BASE_URL}/booking/services`);
    const servicesData = await servicesRes.json();

    if (!servicesData.services || servicesData.services.length === 0) {
        console.warn("No services found. Skipping hierarchy test (or create one using mongo directly?)");
        // For now, assume services exist or manually verify via checking seeded data availability
        // Since I cannot easily seed from here without model access (or complex logic), I will defer if empty.
    } else {
        const serviceId = servicesData.services[0]._id;
        console.log(`Using Service ID: ${serviceId} (${servicesData.services[0].name})`);

        // Fetch Level 1
        const level1Res = await fetch(`${BASE_URL}/booking/services/${serviceId}/items`);
        const level1Data = await level1Res.json();
        console.log(`Fetched ${level1Data.items.length} Level 1 items.`);

        if (level1Data.items.length > 0) {
            const item1 = level1Data.items[0];
            // Test Level 2 fetch
            const level2Res = await fetch(`${BASE_URL}/booking/services/${serviceId}/items?parentServiceItemId=${item1._id}`);
            const level2Data = await level2Res.json();
            console.log(`Fetched ${level2Data.items.length} Level 2 items for parent ${item1.name}.`);
        }
    }

    // 3. Verify Doctor Flow
    console.log("\n--- 3. Testing Doctor Flow ---");
    // Create Doctor
    const docMobile = "88888" + Math.floor(Math.random() * 100000);
    const docLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: docMobile, role: 'Doctor' })
    });
    const docLoginData = await docLoginRes.json();
    const docToken = docLoginData.token;

    // Register Doctor Profile (Name/Email)
    await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${docToken}` },
        body: JSON.stringify({ name: "Dr. Test", email: "dr" + docMobile + "@test.com" })
    });

    // Get Doctor ID (User ID from token roughly, but we need the profile ID or just verify User ID works for booking)
    // Booking expects 'itemId' which for 'User' type is the User ID.
    // docLoginData doesn't return User ID directly in standard fields if generic, but usually token has it.
    // Actually login response has `role` etc but not `_id`. 
    // BUT `auth.controller.js` does validation.
    // Wait, createBooking needs `itemId`. 
    // I need to get the doctor's user ID.
    // user profile endpoint:
    const docProfileRes = await fetch(`${BASE_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${docToken}` }
    });
    const docProfileData = await docProfileRes.json();
    const doctorUserId = docProfileData.profile._id;
    console.log(`Doctor Created. ID: ${doctorUserId}`);

    // Book the Doctor (as the User created in step 1)
    const bookingPayload = {
        itemType: 'User',
        itemId: doctorUserId, // Booking a doctor
        booking_date: new Date().toISOString().split('T')[0], // Today
        slotStartTime: new Date().toISOString(),
        slotEndTime: new Date(Date.now() + 30 * 60000).toISOString(),
        payment_method: 'COD'
    };

    const bookRes = await fetch(`${BASE_URL}/booking/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(bookingPayload)
    });
    const bookData = await bookRes.json();

    if (!bookData.success) {
        console.error("Booking Failed: " + JSON.stringify(bookData));
    } else {
        console.log("Booking Created Successfully.");

        // Check Doctor Dashboard
        const appointmentsRes = await fetch(`${BASE_URL}/doctor/appointments`, {
            headers: { 'Authorization': `Bearer ${docToken}` }
        });
        const apptData = await appointmentsRes.json();

        if (apptData.appointments && apptData.appointments.new) {
            console.log(`Doctor successfully fetched appointments.`);
            const newCount = apptData.appointments.new.length;
            console.log(`New Requests Count: ${newCount}`);

            const found = apptData.appointments.new.find(a => a._id === bookData.booking_details.booking_id);
            if (found) {
                console.log("SUCCESS: Created booking found in Doctor's 'New' list.");
            } else {
                console.error("FAIL: Created booking NOT found in Doctor's 'New' list.");
                // Check other lists
                if (apptData.appointments.upcoming.find(a => a._id === bookData.booking_details.booking_id))
                    console.log("Found in 'Upcoming' instead.");
            }
        } else {
            console.error("FAIL: Response structure invalid or new list missing.");
            console.log(JSON.stringify(apptData));
        }
    }
}

main().catch(console.error);
