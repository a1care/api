const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testHierarchy() {
    try {
        console.log('--- Starting Hierarchy Test ---');

        // 1. Fetch Hierarchy (Should be empty or have seeds)
        console.log('1. Fetching Initial Hierarchy...');
        let res = await axios.get(`${API_URL}/admin/services/hierarchy`);
        console.log(`Success! Found ${res.data.services.length} services.`);

        // 2. Create a Sub-Service (under the first service found)
        if (res.data.services.length > 0) {
            const parentId = res.data.services[0]._id;
            console.log(`\n2. Creating Sub-Service under ${res.data.services[0].name} (${parentId})...`);

            const subRes = await axios.post(`${API_URL}/admin/services/${parentId}/sub-services`, {
                name: 'Test SubService',
                description: 'Created via Test Script',
                image_url: 'dummy.png'
            });
            console.log('Sub-Service Created:', subRes.data.subService.name);
            const subId = subRes.data.subService._id;

            // 3. Create a Child-Service (Item)
            console.log(`\n3. Creating Child-Service under SubService ${subId}...`);
            const childRes = await axios.post(`${API_URL}/admin/services/sub-services/${subId}/child-services`, {
                name: 'Test Child Item',
                description: 'Test Item',
                price: 500,
                service_type: 'OPD'
            });
            console.log('Child-Service Created:', childRes.data.childService.name);

            // 4. Verify Hierarchy Reflection
            console.log('\n4. Verifying Hierarchy Update...');
            res = await axios.get(`${API_URL}/admin/services/hierarchy`);
            const parent = res.data.services.find(s => s._id === parentId);
            const sub = parent.subServices.find(s => s._id === subId);
            const child = sub.childServices.find(c => c._id === childRes.data.childService._id);

            if (child) {
                console.log('SUCCESS: Hierarchy correctly reflects the new Child Item!');
            } else {
                console.error('FAILURE: Child Item not found in hierarchy tree.');
            }
        } else {
            console.log('Skipping CRUD tests as no parent services exist.');
        }

    } catch (error) {
        console.error('TEST FAILED:', error.response ? error.response.data : error.message);
    }
}

testHierarchy();
