const axios = require('axios');

// const API_URL = 'https://api-esf1.onrender.com/api';
const API_URL = 'http://localhost:3000/api'; // Toggle for local testing if needed

const HIERARCHY = [
    {
        name: "Doctor Services",
        type: "Doctor",
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

const randomMobile = () => '9' + Math.floor(100000000 + Math.random() * 900000000);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function retryRequest(fn, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            console.log(`    ⚠️ Retrying... (${i + 1}/${retries}) error: ${error.message}`);
            await sleep(2000);
        }
    }
}

async function seedHierarchy() {
    console.log("🌱 Starting Live Hierarchy Seeding (v4 - Slow + Retry)...");

    try {
        const adminMobile = randomMobile();
        console.log(`Loggin in/Creating Temp Admin (${adminMobile})...`);

        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            mobile_number: adminMobile,
            role: "Admin",
            fcm_token: "seed_script_admin"
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        // 2. CLEANUP
        // Only run cleanup if we explicitly want to nuke. 
        // Given earlier failures, partial cleanup might have happened.
        // Let's try to fetch list and delete.
        console.log("🧹 Cleanup: Fetching existing services...");
        try {
            // Use Retry
            const servicesRes = await retryRequest(() => axios.get(`${API_URL}/booking/services`));
            const allServices = servicesRes.data.services;

            if (allServices && allServices.length > 0) {
                for (const s of allServices) {
                    console.log(`Deleting Service: ${s.name} (${s._id})`);
                    try {
                        await sleep(1000);
                        await retryRequest(() => axios.delete(`${API_URL}/admin/services/${s._id}`, { headers }));
                        console.log("   - Deleted.");
                    } catch (e) {
                        console.error(`   - Failed Delete: ${e.message}`);
                    }
                }
            }
        } catch (e) {
            console.warn("⚠️ Cleanup fetch failed:", e.message);
        }

        console.log("\n🚀 Starting Creation...");

        // 3. Create Hierarchy
        for (const service of HIERARCHY) {
            console.log(`\nProcessing Service: ${service.name}...`);
            await sleep(2000);

            // A. Service
            let serviceId;
            try {
                const createRes = await retryRequest(() => axios.post(`${API_URL}/admin/services`, {
                    name: service.name,
                    type: service.type || 'Service',
                    description: `All ${service.name} services`,
                    image: "https://via.placeholder.com/150",
                    is_active: true
                }, { headers }));
                serviceId = createRes.data.service._id;
                console.log(`  ✅ Created Service '${service.name}'`);
            } catch (e) {
                console.error(`  ❌ Failed to create Service ${service.name}: ${e.message}`);
                // Fallback: Check if exists
                if (e.response && e.response.status === 400) {
                    try {
                        await sleep(1000);
                        const existingRes = await retryRequest(() => axios.get(`${API_URL}/booking/services`));
                        const existing = existingRes.data.services.find(s => s.name === service.name);
                        if (existing) {
                            serviceId = existing._id;
                            console.log(`  ⚠️ Service Exists. Captured ID: ${serviceId}. Updating active status...`);
                            // Ensure active
                            await retryRequest(() => axios.put(`${API_URL}/admin/services/${serviceId}`, { is_active: true }, { headers }));
                        }
                    } catch (findErr) { console.error("    Could not find existing ID."); }
                }
            }

            if (!serviceId) continue;

            // B. Sub-Services
            for (const sub of service.subServices) {
                let subServiceId;
                await sleep(1500);
                try {
                    const createSubRes = await retryRequest(() => axios.post(`${API_URL}/admin/services/${serviceId}/sub-services`, {
                        name: sub.name,
                        image: "https://via.placeholder.com/150",
                        is_active: true
                    }, { headers }));
                    subServiceId = createSubRes.data.subService._id;
                    console.log(`    ✅ Created SubService '${sub.name}'`);
                } catch (e) {
                    console.error(`    ❌ Failed SubService ${sub.name}: ${e.message}`);
                    try {
                        await sleep(1000);
                        const listSub = await retryRequest(() => axios.get(`${API_URL}/booking/services/${serviceId}/sub-services`));
                        const existingSub = listSub.data.subServices.find(s => s.name === sub.name);
                        if (existingSub) subServiceId = existingSub._id;
                    } catch (err) { }
                }

                if (!subServiceId) continue;

                // C. Child-Services
                for (const child of sub.childServices) {
                    await sleep(1500);
                    try {
                        await retryRequest(() => axios.post(`${API_URL}/admin/services/sub-services/${subServiceId}/child-services`, {
                            name: child.name,
                            price: child.price,
                            description: child.name,
                            is_active: true,
                            service_type: child.name.includes("Orthopaedic") ? "Doctor" : "Service"
                        }, { headers }));
                        console.log(`      ✅ Created Child '${child.name}'`);
                    } catch (e) {
                        console.error(`      ❌ Failed Child ${child.name}: ${e.message}`);
                    }
                }
            }
        }

        console.log("\n✅ Hierarchy Seeding Complete!");

    } catch (error) {
        console.error("❌ Fatal Error:", error.message);
    }
}

seedHierarchy();
