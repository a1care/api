const BASE_URL = 'http://localhost:3000/api';

const ADMIN_USER = {
    mobile_number: '8888888888',
    role: 'Admin',
    fcm_token: 'check_sync_token'
};

async function check() {
    try {
        console.log('Logging in to Localhost...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ADMIN_USER)
        });
        const loginData = await loginRes.json();
        if (!loginData.success) throw new Error(`Login failed: ${loginData.message}`);
        const token = loginData.token;

        console.log('Fetching Bookings...');
        const res = await fetch(`${BASE_URL}/homescreen/bookings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            console.log(`Total Bookings in DB: ${data.bookings.length}`);
            if (data.bookings.length > 0) {
                console.log('First Booking ID:', data.bookings[0]._id);
                console.log('Latest Booking ID:', data.bookings[data.bookings.length - 1]._id);
            }
        } else {
            console.log('Failed to fetch bookings:', data.message);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

check();
