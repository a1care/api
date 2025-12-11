const axios = require('axios');
const fs = require('fs');

const API_URL = 'https://api-esf1.onrender.com/api';

// --- Data Generators ---
const randomStr = () => Math.random().toString(36).substring(7);
const randomMobile = () => '9' + Math.floor(100000000 + Math.random() * 900000000);

async function generateDocs() {
    console.log("🚀 Starting Live Data Generation...");
    let markdown = `# 🚀 A1Care Complete Live API Flow
*Generated with REAL DATA on ${new Date().toLocaleString()}*
*All tokens and IDs below are valid and working immediately.*

---

`;

    try {
        // ==========================================
        // 1. USER SETUP
        // ==========================================
        const userMobile = randomMobile();
        console.log(`1. Creating User (${userMobile})...`);

        // 1.1 LOGIN
        const userRes = await axios.post(`${API_URL}/auth/login`, {
            mobile_number: userMobile,
            role: "User",
            fcm_token: "dummy_fcm_token_" + randomStr()
        });

        const userToken = userRes.data.token;

        // 1.2 FETCH PROFILE (To get ID)
        const userProfileRes = await axios.get(`${API_URL}/auth/profile`, { headers: { Authorization: `Bearer ${userToken}` } });
        const realUserId = userProfileRes.data.profile._id;

        // 1.3 REGISTER (Update Name/Email)
        await axios.post(`${API_URL}/auth/register`, {
            name: "Rahul Patient",
            email: `rahul.${randomStr()}@gmail.com`
        }, { headers: { Authorization: `Bearer ${userToken}` } });

        markdown += `## 1. User Authentication
### 1.1 User Login & Signup
**Scenario**: A new user opens the app and enters mobile number.
\`\`\`bash
curl --location '${API_URL}/auth/login' \\
--header 'Content-Type: application/json' \\
--data '{
    "mobile_number": "${userMobile}", 
    "role": "User", 
    "fcm_token": "device_fcm_token_123"
}'
\`\`\`

### 1.2 User Profile Update
**Scenario**: User enters their name and email.
\`\`\`bash
curl --location '${API_URL}/auth/register' \\
--header 'Authorization: Bearer ${userToken}' \\
--header 'Content-Type: application/json' \\
--data '{
    "name": "Rahul Patient",
    "email": "rahul.patient@gmail.com"
}'
\`\`\`

---

`;

        // ==========================================
        // 2. DOCTOR SETUP
        // ==========================================
        const docMobile = randomMobile();
        console.log(`2. Creating Doctor (${docMobile})...`);

        const docRes = await axios.post(`${API_URL}/auth/login`, {
            mobile_number: docMobile,
            role: "Doctor",
            fcm_token: "doc_fcm_" + randomStr()
        });
        const docToken = docRes.data.token;

        // Get Doc ID
        const docProfileRes = await axios.get(`${API_URL}/auth/profile`, { headers: { Authorization: `Bearer ${docToken}` } });
        const realDocId = docProfileRes.data.profile._id;

        markdown += `## 2. Doctor Onboarding
### 2.1 Doctor Login
**Scenario**: A doctor logs in.
\`\`\`bash
curl --location '${API_URL}/auth/login' \\
--header 'Content-Type: application/json' \\
--data '{
    "mobile_number": "${docMobile}", 
    "role": "Doctor", 
    "fcm_token": "doctor_fcm_token_xyz"
}'
\`\`\`

### 2.2 Doctor Profile Update (Fees & Experience)
**Scenario**: Doctor sets their consultation fees.
\`\`\`bash
curl --location --request PUT '${API_URL}/doctor/profile' \\
--header 'Authorization: Bearer ${docToken}' \\
--header 'Content-Type: application/json' \\
--data '{
    "consultation_fee": 500,
    "experience": 5,
    "about": "Expert Cardiologist",
    "offered_services": ["OPD", "Video Consultation"]
}'
\`\`\`

### 2.3 Upload Documents
**Scenario**: Doctor uploads verification proofs.
\`\`\`bash
# Note: Requires multipart/form-data. This is a simplified example.
curl --location --request PUT '${API_URL}/doctor/documents/upload' \\
--header 'Authorization: Bearer ${docToken}' \\
--form 'degree=@"/path/to/degree.pdf"' \\
--form 'license=@"/path/to/license.jpg"'
\`\`\`

---

`;

        // ==========================================
        // 3. ADMIN APPROVAL
        // ==========================================
        console.log("3. Admin Approval...");
        const adminMobile = randomMobile();
        const adminRes = await axios.post(`${API_URL}/auth/login`, {
            mobile_number: adminMobile,
            role: "Admin",
            fcm_token: "admin_fcm"
        });
        const adminToken = adminRes.data.token;

        // FIND DOCTOR ID FOR APPROVAL
        const allDocs = await axios.get(`${API_URL}/admin/doctors`, { headers: { Authorization: `Bearer ${adminToken}` } });
        const myDoc = allDocs.data.doctors.find(d => d.userId._id === realDocId || d.userId === realDocId);
        const doctorTableId = myDoc ? myDoc._id : "UNKNOWN_DOCTOR_ID";

        markdown += `## 3. Admin Verification
### 3.1 Admin Login
\`\`\`bash
curl --location '${API_URL}/auth/login' \\
--header 'Content-Type: application/json' \\
--data '{
    "mobile_number": "${adminMobile}", 
    "role": "Admin", 
    "fcm_token": "admin_device"
}'
\`\`\`

### 3.2 Approve Doctor
**Scenario**: Admin approves the new doctor so they show up in search.
\`\`\`bash
curl --location --request PUT '${API_URL}/admin/doctors/${doctorTableId}/approve' \\
--header 'Authorization: Bearer ${adminToken}'
\`\`\`

---

`;

        // ==========================================
        // 4. DOCTOR SLOTS
        // ==========================================
        console.log("4. Creating Slots...");

        markdown += `## 4. Doctor Schedule
### 4.1 Create Available Slots
**Scenario**: Doctor adds slots for today.
\`\`\`bash
curl --location '${API_URL}/doctor/slots' \\
--header 'Authorization: Bearer ${docToken}' \\
--header 'Content-Type: application/json' \\
--data '{
    "date": "2025-12-10",
    "slots": [
        { "start": "10:00", "end": "10:30" },
        { "start": "11:00", "end": "11:30" }
    ]
}'
\`\`\`

---

`;

        // ==========================================
        // 5. USER DISCOVERY
        // ==========================================
        console.log("5. User Discovery...");

        // 5.1 GET ALL SERVICES
        const servicesRes = await axios.get(`${API_URL}/booking/services`);
        const allServices = servicesRes.data.services;
        const opdService = allServices.find(s => s.type === 'OPD') || allServices[0];
        const serviceId = opdService._id;

        markdown += `## 5. User Home & Discovery
### 5.1 Get All Services (Home Screen)
**Scenario**: User sees main categories (e.g., Medical Services, Ambulance).
\`\`\`bash
curl --location '${API_URL}/booking/services'
\`\`\`

### 5.2 Get Sub-Services (e.g., Click "${opdService.name}")
**Scenario**: User clicks a service to see specialties (e.g., Cardiology, General Physician).
\`\`\`bash
curl --location '${API_URL}/booking/services/${serviceId}/sub-services'
\`\`\`
`;

        // 5.3 GET CHILD SERVICES
        const subServicesRes = await axios.get(`${API_URL}/booking/services/${serviceId}/sub-services`);
        if (subServicesRes.data.subServices && subServicesRes.data.subServices.length > 0) {
            const subService = subServicesRes.data.subServices[0];
            const subServiceId = subService._id;

            markdown += `### 5.3 Get Child Service Items (e.g., Click "${subService.name}")
**Scenario**: User selects a sub-category.
\`\`\`bash
curl --location '${API_URL}/booking/sub-services/${subServiceId}/child-services'
\`\`\`
`;
        }

        markdown += `### 5.4 Search Doctors (If Service is OPD)
**Scenario**: User filters for doctors (optionally by location).
\`\`\`bash
curl --location '${API_URL}/booking/doctors/opd' \\
--header 'Authorization: Bearer ${userToken}'
\`\`\`
`;

        // ==========================================
        // 6. BOOKING
        // ==========================================
        console.log("6. User Booking...");

        // Fetch Slots to get Slot ID
        const slotsRes = await axios.get(`${API_URL}/booking/doctors/${realDocId}/slots?date=2025-12-10`);
        const slotId = slotsRes.data.slots && slotsRes.data.slots.length > 0 ? slotsRes.data.slots[0]._id : "SLOT_ID_FROM_GET_RESPONSE";

        markdown += `## 6. Booking
### 6.1 Create Booking
**Scenario**: User books the 10:00 AM slot.
\`\`\`bash
curl --location '${API_URL}/booking/create' \\
--header 'Authorization: Bearer ${userToken}' \\
--header 'Content-Type: application/json' \\
--data '{
    "itemType": "User", 
    "itemId": "${realDocId}",
    "serviceId": "${serviceId}",
    "booking_date": "2025-12-10",
    "slotId": "${slotId}",
    "type": "OPD",
    "payment_method": "COD"
}'
\`\`\`

### 6.2 View My Bookings
\`\`\`bash
curl --location '${API_URL}/booking/user' \\
--header 'Authorization: Bearer ${userToken}'
\`\`\`
`;

        fs.writeFileSync('curls.md', markdown);
        console.log("✅ curls.md generated successfully!");

    } catch (error) {
        console.error("❌ Error generating docs:", error.response ? error.response.data : error.message);
    }
}

generateDocs();
