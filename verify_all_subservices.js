// Native fetch is available in Node 18+

const BASE_URL = 'http://localhost:3000/api';

async function verifyAll() {
    try {
        console.log('1. Fetching All Services...');
        const res = await fetch(`${BASE_URL}/booking/services`);
        const data = await res.json();

        if (!data.success) {
            console.error('Failed to fetch services:', data.message);
            return;
        }

        console.log(`Found ${data.services.length} services.`);

        for (const service of data.services) {
            console.log(`\n--------------------------------------------------`);
            console.log(`Checking Service: ${service.name} (${service.type})`);

            if (service.type === 'OPD' || service.type === 'VideoConsultation') {
                console.log('Skipping item check for Doctor-based service.');
                continue;
            }

            const itemsRes = await fetch(`${BASE_URL}/booking/services/${service.id || service._id}/items`);
            const itemsData = await itemsRes.json();

            if (itemsData.success) {
                console.log(`Success! Found ${itemsData.items.length} items.`);
                if (itemsData.items.length > 0) {
                    console.log('Sample Item:', itemsData.items[0].name || itemsData.items[0].vehicle_number);
                } else {
                    console.warn('WARNING: No items found for this service!');
                }
            } else {
                console.error('Failed to fetch items:', itemsData.message);
            }
        }

    } catch (error) {
        console.error('Verification Error:', error);
    }
}

verifyAll();
