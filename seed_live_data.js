const fs = require('fs');
const path = require('path');

// Base URL
const BASE_URL = 'https://api-esf1.onrender.com/api';

// Admin Credentials
const ADMIN_USER = {
    mobile_number: '8888888888',
    role: 'Admin',
    fcm_token: 'seed_script_token'
};

// Data to Seed
const SERVICES = [
    { name: 'OPD Booking', title: 'Consult Best Doctors', type: 'OPD', image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514709331-dummy.png' },
    { name: 'Lab Tests', title: 'Sample Collection at Home', type: 'LabTest', image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514709331-dummy.png' },
    { name: 'Medical Equipment', title: 'Rent or Buy Equipment', type: 'MedicalEquipment', image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514709331-dummy.png' },
    { name: 'Ambulance', title: 'Emergency Services', type: 'Ambulance', image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514709331-dummy.png' },
    { name: 'Video Consultation', title: 'Connect with Doctors Online', type: 'VideoConsultation', image_url: 'https://a1-care.s3.ap-south-2.amazonaws.com/services/1764514709331-dummy.png' }
];

const LAB_TESTS = [
    { name: 'Full Body Checkup', description: 'Complete health checkup including 50+ tests', price: 1500 },
    { name: 'Thyroid Profile', description: 'T3, T4, TSH tests', price: 500 },
    { name: 'Diabetes Screen', description: 'HbA1c, Fasting Sugar', price: 400 },
    { name: 'Vitamin D Test', description: 'Check Vitamin D levels', price: 800 },
    { name: 'CBC', description: 'Complete Blood Count', price: 300 }
];

const EQUIPMENT = [
    { name: 'Oxygen Concentrator', description: '5L Oxygen Concentrator', rental_price: 500 },
    { name: 'Wheelchair', description: 'Foldable Wheelchair', rental_price: 100 },
    { name: 'Hospital Bed', description: 'Semi-fowler bed', rental_price: 300 },
    { name: 'Nebulizer', description: 'Portable Nebulizer', rental_price: 50 },
    { name: 'Crutches', description: 'Adjustable Crutches', rental_price: 30 }
];

const AMBULANCES = [
    { vehicle_number: 'KA-01-AB-1234', type: 'Basic', price_per_km: 20, base_fare: 500, driver_name: 'Ramesh', driver_phone: '9000000001' },
    { vehicle_number: 'KA-02-CD-5678', type: 'Advance', price_per_km: 50, base_fare: 1000, driver_name: 'Suresh', driver_phone: '9000000002' },
    { vehicle_number: 'KA-03-EF-9012', type: 'Basic', price_per_km: 15, base_fare: 400, driver_name: 'Mahesh', driver_phone: '9000000003' },
    { vehicle_number: 'KA-04-GH-3456', type: 'ICU', price_per_km: 60, base_fare: 1500, driver_name: 'Ganesh', driver_phone: '9000000004' },
    { vehicle_number: 'KA-05-IJ-7890', type: 'Basic', price_per_km: 20, base_fare: 500, driver_name: 'Dinesh', driver_phone: '9000000005' }
];

async function seed() {
    try {
        console.log('Logging in as Admin...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ADMIN_USER)
        });
        const loginData = await loginRes.json();

        if (!loginData.success) {
            throw new Error(`Login failed: ${loginData.message}`);
        }

        const token = loginData.token;
        console.log('Admin logged in. Token received.');

        // Helper to upload with file
        const uploadWithFile = async (url, fields, filePath) => {
            const formData = new FormData();
            for (const key in fields) {
                formData.append(key, fields[key]);
            }
            if (filePath) {
                const fileContent = fs.readFileSync(filePath);
                const blob = new Blob([fileContent], { type: 'image/png' });
                formData.append('serviceImage', blob, 'dummy.png');
            }

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error(`Failed to parse JSON from ${url}. Response: ${text.substring(0, 200)}...`);
                return { success: false, message: 'Invalid JSON response' };
            }
        };

        // Helper for JSON post
        const postJson = async (url, data) => {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            return res.json();
        };

        // 1. Seed Services
        console.log('\nSeeding Services...');
        for (const service of SERVICES) {
            const res = await uploadWithFile(`${BASE_URL}/homescreen/services`, service, 'dummy.png');
            console.log(`Service '${service.name}': ${res.success ? 'Success' : res.message}`);
        }

        // 2. Seed Lab Tests
        console.log('\nSeeding Lab Tests...');
        for (const test of LAB_TESTS) {
            const res = await uploadWithFile(`${BASE_URL}/homescreen/lab-tests`, test, 'dummy.png');
            console.log(`Lab Test '${test.name}': ${res.success ? 'Success' : res.message}`);
        }

        // 3. Seed Equipment
        console.log('\nSeeding Medical Equipment...');
        for (const item of EQUIPMENT) {
            const res = await uploadWithFile(`${BASE_URL}/homescreen/medical-equipment`, item, 'dummy.png');
            console.log(`Equipment '${item.name}': ${res.success ? 'Success' : res.message}`);
        }

        // 4. Seed Ambulances
        console.log('\nSeeding Ambulances...');
        for (const amb of AMBULANCES) {
            const res = await postJson(`${BASE_URL}/homescreen/ambulance`, amb);
            console.log(`Ambulance '${amb.vehicle_number}': ${res.success ? 'Success' : res.message}`);
        }

        // 5. Seed Doctors
        console.log('\nSeeding Doctors...');
        for (let i = 1; i <= 5; i++) {
            const docPhone = `990000000${i}`;
            // Login/Signup as Doctor
            const docLoginRes = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile_number: docPhone, role: 'Doctor', fcm_token: 'doc_token' })
            });
            const docData = await docLoginRes.json();

            if (docData.success) {
                // Approve the doctor
                const base64Url = docData.token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const payload = JSON.parse(jsonPayload);
                const doctorId = payload.id;

                // Approve
                const approveRes = await fetch(`${BASE_URL}/homescreen/doctors/${doctorId}/approve`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const approveData = await approveRes.json();
                console.log(`Doctor ${docPhone}: Created & ${approveData.success ? 'Approved' : 'Approval Failed: ' + approveData.message}`);
            } else {
                console.log(`Doctor ${docPhone}: Creation Failed - ${docData.message}`);
            }
        }

        console.log('\nSeeding Completed!');

    } catch (error) {
        console.error('Seeding Error:', error);
    }
}

seed();
