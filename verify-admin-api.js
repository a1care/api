const axios = require('axios');

const API_URL = 'https://api-esf1.onrender.com/api';
// const API_URL = 'http://localhost:3000/api'; // Uncomment for local testing

const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    bold: "\x1b[1m"
};

const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);
const pass = (msg) => log(`✅ PASS: ${msg}`, colors.green);
const fail = (msg, err) => {
    log(`❌ FAIL: ${msg}`, colors.red);
    if (err) console.error(err.response ? err.response.data : err.message);
};
const info = (msg) => log(`ℹ️  ${msg}`, colors.blue);

async function verifyAdminAPI() {
    log(`\n🚀 Starting Admin API Verification against ${API_URL}\n`, colors.bold);

    try {
        // 1. Authentication (Login)
        info('Testing Login...');
        // Note: Since we don't have a real admin login endpoint yet (it's hardcoded in frontend),
        // we will test the user login to ensure auth system works generally.
        // For admin endpoints, we might need to bypass auth or use a temporary token if implemented.
        // Assuming current admin endpoints are public or we use a test user token.

        // Let's try to hit the dashboard stats endpoint directly first to see if it's protected
        // If it returns 401, we know auth is working. If 200, it's public (for now).

        info('Testing Dashboard Stats...');
        try {
            const statsRes = await axios.get(`${API_URL}/admin/dashboard/stats`);
            if (statsRes.status === 200 && statsRes.data.success) {
                pass('Dashboard Stats fetched successfully');
                log(`   - Users: ${statsRes.data.stats.totalUsers}`);
                log(`   - Doctors: ${statsRes.data.stats.totalDoctors}`);
            } else {
                fail('Dashboard Stats returned unexpected status');
            }
        } catch (err) {
            fail('Dashboard Stats failed', err);
        }

        // 2. User Management
        info('\nTesting User Management...');
        try {
            const usersRes = await axios.get(`${API_URL}/admin/users`);
            if (usersRes.status === 200 && usersRes.data.success) {
                pass(`Fetched ${usersRes.data.users.length} users`);
            } else {
                fail('Fetch Users failed');
            }
        } catch (err) {
            fail('Fetch Users failed', err);
        }

        // 3. Doctor Management
        info('\nTesting Doctor Management...');
        try {
            const doctorsRes = await axios.get(`${API_URL}/admin/doctors`);
            if (doctorsRes.status === 200 && doctorsRes.data.success) {
                pass(`Fetched ${doctorsRes.data.doctors.length} doctors`);
            } else {
                fail('Fetch Doctors failed');
            }
        } catch (err) {
            fail('Fetch Doctors failed', err);
        }

        // 4. Service Management
        info('\nTesting Service Management (CRUD)...');
        let serviceId = null;

        // Create
        try {
            const createRes = await axios.post(`${API_URL}/admin/services`, {
                name: 'Test Service ' + Date.now(),
                title: 'Verification Test Service',
                type: 'OPD',
                image_url: 'https://via.placeholder.com/150'
            });
            if (createRes.status === 201 && createRes.data.success) {
                pass('Create Service successful');
                serviceId = createRes.data.service._id;
            } else {
                fail('Create Service failed');
            }
        } catch (err) {
            fail('Create Service failed', err);
        }

        // Update
        if (serviceId) {
            try {
                const updateRes = await axios.put(`${API_URL}/admin/services/${serviceId}`, {
                    title: 'Updated Verification Title'
                });
                if (updateRes.status === 200 && updateRes.data.success) {
                    pass('Update Service successful');
                } else {
                    fail('Update Service failed');
                }
            } catch (err) {
                fail('Update Service failed', err);
            }

            // Delete
            try {
                const deleteRes = await axios.delete(`${API_URL}/admin/services/${serviceId}`);
                if (deleteRes.status === 200 && deleteRes.data.success) {
                    pass('Delete Service successful');
                } else {
                    fail('Delete Service failed');
                }
            } catch (err) {
                fail('Delete Service failed', err);
            }
        }

    } catch (error) {
        log('\n❌ Critical Error in Verification Script', colors.red);
        console.error(error);
    }
}

verifyAdminAPI();
