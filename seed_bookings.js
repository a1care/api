const BASE_URL = 'http://localhost:3000/api';

// Admin Credentials
const ADMIN_USER = {
    mobile_number: '8888888888',
    role: 'Admin',
    fcm_token: 'seed_admin_token'
};

// Test User Credentials (The user who will make the bookings)
const TEST_USER = {
    mobile_number: '7777777777',
    role: 'User',
    fcm_token: 'seed_user_token'
};

async function seedBookings() {
    try {
        console.log('1. Logging in as Admin...');
        const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ADMIN_USER)
        });
        const adminData = await adminLoginRes.json();
        if (!adminData.success) throw new Error('Admin login failed');
        const adminToken = adminData.token;
        console.log('Admin logged in.');

        console.log('2. Logging in/Creating Test User...');
        const userLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_USER)
        });
        const userData = await userLoginRes.json();
        if (!userData.success) throw new Error('User login failed');
        const userToken = userData.token;
        console.log('Test User logged in.');

        // Helper to fetch items
        const fetchItems = async (endpoint, key) => {
            const res = await fetch(`${BASE_URL}/${endpoint}`);
            const data = await res.json();
            return data[key] || [];
        };

        console.log('3. Fetching available items...');
        // Note: Public endpoints
        const labTests = await fetchItems('lab-tests', 'tests'); // Check controller response key
        const equipment = await fetchItems('medical-equipment', 'equipment');
        const ambulances = await fetchItems('ambulance', 'ambulances');

        // Update user coordinates to find nearby doctors.
        await fetch(`${BASE_URL}/auth/coordinates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({ latitude: 12.9716, longitude: 77.5946 }) // Bangalore coords
        });

        const docRes = await fetch(`${BASE_URL}/booking/doctors/opd`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        const docData = await docRes.json();
        const doctors = docData.doctors || [];

        console.log(`Found: ${labTests.length} Lab Tests, ${equipment.length} Equipment, ${ambulances.length} Ambulances, ${doctors.length} Doctors`);

        const allItems = [
            ...labTests.map(i => ({ type: 'LabTest', id: i._id })),
            ...equipment.map(i => ({ type: 'MedicalEquipment', id: i._id })),
            ...ambulances.map(i => ({ type: 'Ambulance', id: i._id })),
            ...doctors.map(i => ({ type: 'User', id: i.id }))
        ];

        if (allItems.length === 0) {
            console.log('No items found to book. Please run seed_live_data.js first.');
            return;
        }

        const STATUSES = ['Upcoming', 'Pending Payment', 'Completed', 'Cancelled'];

        console.log('4. Creating Bookings...');

        for (const status of STATUSES) {
            console.log(`\nCreating 2 bookings with target status: ${status}`);
            for (let i = 0; i < 2; i++) {
                // Pick a random item
                const item = allItems[Math.floor(Math.random() * allItems.length)];

                // Determine payment method based on desired status
                let paymentMethod = 'COD';
                if (status === 'Pending Payment') {
                    paymentMethod = 'Online';
                }

                // Create Booking
                const bookingPayload = {
                    itemType: item.type,
                    itemId: item.id,
                    serviceId: null, // Optional
                    slotId: `SLOT_${Date.now()}_${i}`,
                    slotStartTime: new Date().toISOString(),
                    slotEndTime: new Date(Date.now() + 30 * 60000).toISOString(),
                    booking_date: new Date().toISOString().split('T')[0],
                    payment_method: paymentMethod
                };

                const createRes = await fetch(`${BASE_URL}/booking/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify(bookingPayload)
                });
                const createData = await createRes.json();

                if (createData.success) {
                    const bookingId = createData.booking_details.booking_id;
                    console.log(`Booking created (${item.type}): ${bookingId}`);

                    // Update Status if needed (COD creates 'Upcoming' by default)
                    if (status === 'Completed' || status === 'Cancelled') {
                        const updateRes = await fetch(`${BASE_URL}/homescreen/bookings/${bookingId}/status`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${adminToken}`
                            },
                            body: JSON.stringify({ status: status })
                        });
                        const updateData = await updateRes.json();
                        if (updateData.success) {
                            console.log(`Status updated to ${status}`);
                        } else {
                            console.error(`Failed to update status: ${updateData.message || 'Route likely not found (needs redeploy)'}`);
                        }
                    }
                } else {
                    console.error(`Failed to create booking: ${createData.message}`);
                }
            }
        }

        console.log('\nBooking Seeding Completed!');

    } catch (error) {
        console.error('Seeding Error:', error);
    }
}

seedBookings();
