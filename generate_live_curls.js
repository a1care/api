const fs = require('fs');

// BASE URL
const BASE_URL = 'https://api-esf1.onrender.com/api';

// Helper for requests
async function apiCall(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, options);
        const data = await res.json();
        return { status: res.status, data };
    } catch (e) {
        return { error: e.message };
    }
}

async function main() {
    console.log("Analyzing Production Server...");

    // --- 1. LOGIN USER ---
    const uniqueId = Math.floor(Math.random() * 1000000);
    const userMobile = "90" + uniqueId;
    const userRole = "User";
    console.log(`logging in User (${userMobile})...`);

    // Try login (or register if new logic handles it)
    let userRes = await apiCall('/auth/login', 'POST', { mobile_number: userMobile, role: userRole });
    if (!userRes.data.success) {
        console.error("User Login Failed:", userRes.data);
        return;
    }
    const USER_TOKEN = userRes.data.token;
    console.log("User Token Acquired.");

    // --- 2. LOGIN DOCTOR ---
    const docMobile = "80" + uniqueId;
    const docRole = "Doctor";
    console.log(`logging in Doctor (${docMobile})...`);
    let docRes = await apiCall('/auth/login', 'POST', { mobile_number: docMobile, role: docRole });
    const DOC_TOKEN = docRes.data.token;
    console.log("Doctor Token Acquired.");

    // --- 3. FETCH PROFILE (User) ---
    // User Profile
    const userProfileRes = await apiCall('/auth/profile', 'GET', null, USER_TOKEN);
    const REAL_USER_ID = userProfileRes.data.profile._id;

    // Doctor Profile ID (needed for booking a doctor)
    // We need the Doctor's User ID (which is what we book against)
    // The login token belongs to the doctor user.
    const docProfileRes = await apiCall('/auth/profile', 'GET', null, DOC_TOKEN);
    const REAL_DOCTOR_USER_ID = docProfileRes.data.profile._id;

    // --- HIERARCHY CHAIN VERIFICATION ---
    console.log("\n--- VERIFYING HIERARCHY CHAIN ---");

    // 1. Get All Services
    const servicesRes = await apiCall('/booking/services');
    if (!servicesRes.data.success || servicesRes.data.services.length === 0) {
        console.error("No Main Services found!");
        return;
    }

    // Find a service that actually has items (Level 1)
    let mainService = null;
    let subService = null;
    let childService = null;

    for (const svc of servicesRes.data.services) {
        // console.log(`Checking Service: ${svc.name} (${svc._id})`);
        const subRes = await apiCall(`/booking/services/${svc._id}/items`);
        if (subRes.data.success && subRes.data.items && subRes.data.items.length > 0) {
            mainService = svc;

            // Now check if any of these sub-items have children (Level 2)
            for (const sub of subRes.data.items) {
                const childRes = await apiCall(`/booking/services/${mainService._id}/items?parentServiceItemId=${sub._id}`);
                if (childRes.data.success && childRes.data.items && childRes.data.items.length > 0) {
                    subService = sub;
                    childService = childRes.data.items[0];
                    break; // Found full chain!
                } else {
                    if (!subService) subService = sub;
                }
            }
            if (subService) break;
        }
    }

    if (!mainService) {
        console.error("Could not find any Service with Sub-Services.");
        return;
    }

    console.log(`FOUND CHAIN:\nMain: ${mainService.name}\nSub: ${subService ? subService.name : 'NONE'}\nChild: ${childService ? childService.name : 'NONE'}`);

    const output = `
### 1. GET ALL SERVICES (Main Categories)
Curl:
\`\`\`bash
curl -X GET https://api-esf1.onrender.com/api/booking/services
\`\`\`

### 2. GET SUB-SERVICES (Level 1)
For Service: **${mainService.name}** (ID: \`${mainService._id}\`)
Curl:
\`\`\`bash
curl -X GET "https://api-esf1.onrender.com/api/booking/services/${mainService._id}/items"
\`\`\`

### 3. GET CHILD-SERVICES (Level 2)
For Sub-Service: **${subService.name}** (ID: \`${subService._id}\`)
Parent Service: **${mainService.name}** (ID: \`${mainService._id}\`)
Curl:
\`\`\`bash
curl -X GET "https://api-esf1.onrender.com/api/booking/services/${mainService._id}/items?parentServiceItemId=${subService._id}"
\`\`\`
` + (childService ? `\n> Found Child Item: **${childService.name}** (ID: \`${childService._id}\`)` : `\n> **Note**: No Level 2 (Child) items found for this sub-service on the live server yet.`);

    fs.writeFileSync('hierarchy_curls.md', output, 'utf8');
    console.log("Hierarchy Documentation written to hierarchy_curls.md");
}

main();
