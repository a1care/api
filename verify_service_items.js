const BASE_URL = 'http://localhost:3000/api';

async function verify() {
    try {
        console.log('1. Fetching Services...');
        const res = await fetch(`${BASE_URL}/booking/services`);
        const data = await res.json();

        if (!data.success || data.services.length === 0) {
            throw new Error('No services found');
        }

        console.log(`Found ${data.services.length} services.`);

        // Pick a service that should have items (e.g., LabTest)
        const service = data.services.find(s => s.type === 'LabTest');

        if (!service) {
            console.log('No LabTest service found. Listing all available services:');
            data.services.forEach(s => console.log(`- ${s.name} (${s.type})`));
            return;
        }

        console.log('Service Object:', JSON.stringify(service, null, 2));
        const serviceId = service.id || service._id;
        console.log(`Testing with Service: ${service.name} (ID: ${serviceId})`);

        console.log('2. Fetching Service Items...');
        const itemsRes = await fetch(`${BASE_URL}/booking/services/${serviceId}/items`);
        const itemsData = await itemsRes.json();

        if (itemsData.success) {
            console.log('Success!');
            console.log(`Service Type: ${itemsData.itemType}`);
            console.log(`Items Found: ${itemsData.items.length}`);
            if (itemsData.items.length > 0) {
                console.log('Sample Item:', itemsData.items[0].name || itemsData.items[0].test_name);
            }
        } else {
            console.error('Failed:', itemsData.message);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

verify();
