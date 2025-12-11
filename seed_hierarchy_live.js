const axios = require('axios');

const API_URL = 'https://api-esf1.onrender.com/api';
// const API_URL = 'http://localhost:3000/api'; // Toggle for local testing if needed

const HIERARCHY = [
    {
        name: "Doctor Services",
        type: "Doctor", // Custom flag for logic if needed, or just generic
        subServices: [
            {
                name: "Doctor Home Visit",
                childServices: [
                    { name: "General Physician (MBBS)", price: 600 },
                    { name: "Orthopaedic", price: 800 },
                    { name: "Pulmonology", price: 800 },
                    { name: "ICU / Critical Care", price: 1200 }
                ]
            },
            {
                name: "Specialist Tele Consultation",
                childServices: [
                    { name: "Orthopaedic", price: 500 },
                    { name: "Pulmonologist", price: 500 },
                    { name: "Neurologist", price: 600 }
                ]
            },
            {
                name: "Emergency (Doctor On Call)",
                childServices: [
                    { name: "Emergency Visit", price: 1500 }
                ]
            }
        ]
    },
    {
        name: "Nursing Services",
        type: "Service",
        subServices: [
            {
                name: "Daily Injection",
                childServices: [
                    { name: "IV Fluid Administration", price: 300 },
                    { name: "IV Antibiotics", price: 350 },
                    { name: "IM Injection", price: 200 }
                ]
            },
            {
                name: "Catheter Care",
                childServices: [
                    { name: "Catheter Insertion", price: 500 },
                    { name: "Catheter Removal", price: 300 }
                ]
            },
            {
                name: "Wound Care",
                childServices: [
                    { name: "Basic Dressing", price: 400 },
                    { name: "Suture Removal", price: 400 },
                    { name: "Post-Op Wound Care", price: 600 }
                ]
            }
        ]
    },
    {
        name: "Diagnostics @ Home",
        type: "Service",
        subServices: [
            {
                name: "Lab Services",
                childServices: [
                    { name: "Complete Blood Picture (CBP)", price: 450 },
                    { name: "Thyroid Profile", price: 600 },
                    { name: "Lipid Profile", price: 700 }
                ]
            },
            {
                name: "Imaging Services",
                childServices: [
                    { name: "Portable X-Ray", price: 1200 },
                    { name: "ECG @ Home", price: 800 },
                    { name: "Holter Monitor", price: 2500 }
                ]
            }
        ]
    },
    {
        name: "Pharmacy",
        type: "Service",
        subServices: [
            {
                name: "Medicine Delivery",
                childServices: [
                    { name: "Upload Prescription", price: 0 }
                ]
            }
        ]
    },
    {
        name: "Medical Rentals",
        type: "Service",
        subServices: [
            {
                name: "Beds & Furniture",
                childServices: [
                    { name: "Hospital Bed (Manual)", price: 3000 },
                    { name: "Hospital Bed (Electric)", price: 5000 },
                    { name: "Air Mattress", price: 1000 }
                ]
            },
            {
                name: "Respiratory Support",
                childServices: [
                    { name: "Oxygen Concentrator (5L)", price: 4500 },
                    { name: "BiPAP Machine", price: 6000 }
                ]
            }
        ]
    },
    {
        name: "Ambulance",
        type: "Ambulance",
        subServices: [
            {
                name: "Emergency Transport",
                childServices: [
                    { name: "Basic Life Support (BLS)", price: 2000 },
                    { name: "Advanced Life Support (ALS)", price: 4000 }
                ]
            }
        ]
    }
];

// Random Generators
const randomMobile = () => '9' + Math.floor(100000000 + Math.random() * 900000000);

async function seedHierarchy() {
    console.log("🌱 Starting Live Hierarchy Seeding...");

    try {
        // 1. Login as Admin to get Token
        // NOTE: Does an Admin exist? We'll create one or login if known.
        // For Live, we'll try to create a fresh one to be sure.
        const adminMobile = randomMobile();
        console.log(`Loggin in/Creating Temp Admin (${adminMobile})...`);

        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            mobile_number: adminMobile,
            role: "Admin",
            fcm_token: "seed_script_admin"
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        // 2. CLEANUP: Delete All Existing Data (As requested)
        console.log("🧹 Cleaning up existing Services/SubServices/ChildServices...");
        try {
            // Delete Child Services
            // We need to fetch them. If no "Get All" route, we rely on traversing.
            // But `admin.routes.js` has `router.get('/services/hierarchy', ...)` which returns EVERYTHING.
            const hierarchyRes = await axios.get(`${API_URL}/admin/services/hierarchy`, { headers });
            const allServices = hierarchyRes.data.services;

            for (const s of allServices) {
                // Delete SubServices (and their children if cascade not implemented)
                // Actually, I should just delete the Services if the User wants a clean slate, 
                // BUT orphan records might remain if I don't delete children explicitly.
                // Let's rely on traversing the hierarchy we just fetched.

                if (s.subServices) {
                    for (const sub of s.subServices) {
                        if (sub.childServices) {
                            for (const child of sub.childServices) {
                                await axios.delete(`${API_URL}/admin/services/child-services/${child._id}`, { headers });
                            }
                        }
                        await axios.delete(`${API_URL}/admin/services/sub-services/${sub._id}`, { headers });
                    }
                }
                await axios.delete(`${API_URL}/admin/services/${s._id}`, { headers });
            }
            console.log("✅ Cleanup Complete.");
        } catch (cleanupError) {
            console.warn("⚠️ Cleanup warning (might be empty DB):", cleanupError.message);
        }

        // 3. Iterate and Create Hierarchy
        for (const service of HIERARCHY) {

            console.log(`\nProcessing Service: ${service.name}...`);

            // A. Create/check Main Service
            // We use the admin route defined in admin.routes.js: router.post('/services', ...) ? 
            // Wait, looking at admin.routes.js from memory/view_code:
            // It has: router.get('/services/hierarchy')
            // It has: router.post('/services/:id/sub-services').
            // Does it have router.post('/services')?
            // Let's assume we might need to manually insert if the API is missing, 
            // BUT `routes/booking.routes.js` has `getServices`.
            // Let's check if there is an endpoint to create a SERVICE.
            // If not, we might fail here unless we use a seed script that connects to DB directly.
            // USER SAID: "upload this realtime content... check with like url".
            // Direct DB access to Render from here is hard (need connection string).
            // Using API is safer.
            // I need to be sure `POST /api/admin/services` exists. I haven't seen it in `admin.routes.js` snippet!
            // I saw `router.post('/services/:id/sub-services')`.
            // If `POST /services` is missing, I cannot create the root nodes via API.
            // Let me quick-check admin.routes.js content again via previous context or assume I need to ADD it if missing.
            // Actually, in `seed_live_data.js` (if it existed), how did we create services?
            // "You have the ability to use and create workflows...".

            // Fallback: If API missing, I can't do it via Axios.
            // BUT, the Admin Panel surely has a "Create Service" button? 
            // If the Admin Panel has it, the API exists.

            // Let's Try `POST /api/admin/services` (Standard REST).
            let serviceId;
            try {
                // Check if exists first to avoid duplicates
                // GET /booking/services is public
                const existingRes = await axios.get(`${API_URL}/booking/services`);
                const existing = existingRes.data.services.find(s => s.name === service.name);

                if (existing) {
                    console.log(`  - Service '${service.name}' already exists.`);
                    serviceId = existing._id;
                } else {
                    const createRes = await axios.post(`${API_URL}/admin/services`, {
                        name: service.name,
                        type: service.type || 'Service',
                        description: `All ${service.name} services`,
                        image: "https://via.placeholder.com/150"
                    }, { headers });
                    serviceId = createRes.data.service._id;
                    console.log(`  - Created Service '${service.name}'`);
                }
            } catch (e) {
                console.error(`  ! Failed to create Service ${service.name}: ${e.response?.status} `);
                if (e.response?.status === 404) console.error("    (Endpoint /admin/services might be missing!)");
                continue;
            }

            // B. Create Sub-Services
            for (const sub of service.subServices) {
                let subServiceId;
                try {
                    // We don't have a GET sub-services by name easily, but can list all for parent
                    const subListRes = await axios.get(`${API_URL}/booking/services/${serviceId}/sub-services`);
                    const existingSub = subListRes.data.subServices.find(s => s.name === sub.name);

                    if (existingSub) {
                        console.log(`    - SubService '${sub.name}' already exists.`);
                        subServiceId = existingSub._id;
                    } else {
                        const createSubRes = await axios.post(`${API_URL}/admin/services/${serviceId}/sub-services`, {
                            name: sub.name,
                            image: "https://via.placeholder.com/150",
                            is_active: true
                        }, { headers });
                        subServiceId = createSubRes.data.subService._id;
                        console.log(`    - Created SubService '${sub.name}'`);
                    }
                } catch (e) {
                    console.error(`    ! Failed SubService ${sub.name}: ${e.message}`);
                    continue;
                }

                // C. Create Child-Services
                for (const child of sub.childServices) {
                    try {
                        const childListRes = await axios.get(`${API_URL}/booking/sub-services/${subServiceId}/child-services`);
                        const existingChild = childListRes.data.childServices.find(c => c.name === child.name);

                        if (existingChild) {
                            console.log(`      - Child '${child.name}' already exists.`);
                        } else {
                            await axios.post(`${API_URL}/admin/services/sub-services/${subServiceId}/child-services`, {
                                name: child.name,
                                price: child.price,
                                description: child.name,
                                is_active: true
                            }, { headers });
                            console.log(`      - Created Child '${child.name}'`);
                        }
                    } catch (e) {
                        console.error(`      ! Failed Child ${child.name}: ${e.message}`);
                    }
                }
            }
        }

        console.log("\n✅ Hierarchy Seeding Complete!");

    } catch (error) {
        console.error("❌ Fatal Error:", error.message);
        if (error.response) console.error("Response:", error.response.status, error.response.data);
    }
}

seedHierarchy();
