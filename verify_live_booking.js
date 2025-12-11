const axios = require('axios');

const API_URL = 'https://api-esf1.onrender.com/api';

async function verifyLiveBooking() {
    console.log("🚀 Starting Live Booking Verification...");

    try {
        // 1. User Login (Random to avoid conflict)
        const randomMobile = '9' + Math.floor(100000000 + Math.random() * 900000000);
        console.log(`\n🔑 1. Logging in as User (${randomMobile})...`);

        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            mobile_number: randomMobile,
            role: "User",
            fcm_token: "test_token_live_verify"
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        console.log(`   ✅ Logged in!`);

        // 2. Discover Hierarchy
        console.log("\n🔍 2. Discovering 'Nursing Services' -> 'Daily Injection'...");

        // A. Get Main Services
        const servicesRes = await axios.get(`${API_URL}/booking/services`);
        const nursingService = servicesRes.data.services.find(s => s.name.includes("Nursing"));
        if (!nursingService) throw new Error("Nursing Services not found!");
        console.log(`   ✅ Found Service: ${nursingService.name} (${nursingService._id})`);

        // B. Get Sub Services
        const subRes = await axios.get(`${API_URL}/booking/services/${nursingService._id}/sub-services`);
        const injectionSub = subRes.data.subServices.find(s => s.name.includes("Daily Injection") || s.name.includes("Injection"));
        if (!injectionSub) throw new Error("Daily Injection not found!");
        console.log(`   ✅ Found SubService: ${injectionSub.name} (${injectionSub._id})`);

        // C. Get Child Services (The Item to Book)
        const childRes = await axios.get(`${API_URL}/booking/sub-services/${injectionSub._id}/child-services`);
        const ivItem = childRes.data.childServices[0];
        if (!ivItem) throw new Error("No Child Items found!");
        console.log(`   ✅ Found Item: ${ivItem.name} (${ivItem._id}) - Price: ₹${ivItem.price}`);

        // 3. Create Booking
        console.log("\n📅 3. Creating Booking...");
        const bookingPayload = {
            itemType: "ChildService",
            itemId: ivItem._id,
            serviceId: nursingService._id,
            booking_date: new Date().toISOString().split('T')[0],
            slotStartTime: "10:00",
            slotEndTime: "10:30",
            payment_method: "COD"
        };

        const bookingRes = await axios.post(`${API_URL}/booking/create`, bookingPayload, { headers });
        console.log(`   ✅ Booking Success! ID: ${bookingRes.data.booking_details.booking_id}`);
        console.log(`   ✅ Status: ${bookingRes.data.booking_details.status}`);
        console.log(`   ✅ Total Amount: ₹${bookingRes.data.booking_details.total_amount}`);

        console.log("\n✨ Verification Complete: Live Booking Flow WORKS!");

    } catch (error) {
        console.error("\n❌ Verification Failed:", error.message);
        if (error.response) {
            console.error("   Response Status:", error.response.status);
            console.error("   Response Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("   Request Error:", error);
        }
    }
}

verifyLiveBooking();
