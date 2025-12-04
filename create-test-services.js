const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function createTestData() {
    try {
        console.log('Creating test hierarchical service data...\n');

        // 1. Create Categories
        const categories = [
            { name: 'Doctor Services', description: 'Medical consultation and treatment services' },
            { name: 'Lab Services', description: 'Diagnostic and laboratory testing services' },
            { name: 'Pharmacy Services', description: 'Medicine and pharmaceutical services' },
            { name: 'Emergency Services', description: '24/7 emergency medical services' },
            { name: 'Wellness Services', description: 'Health and wellness programs' }
        ];

        const createdCategories = [];
        for (const cat of categories) {
            const response = await axios.post(`${API_URL}/admin/services`, cat);
            createdCategories.push(response.data.service);
            console.log(`✓ Created category: ${cat.name}`);
        }

        // 2. Create Subcategories for each category
        const subcategories = {
            'Doctor Services': [
                { name: 'Home Visit', description: 'Doctor visits at your home' },
                { name: 'Tele Consultation', description: 'Online video consultation' },
                { name: 'Clinic Visit', description: 'Visit doctor at clinic' }
            ],
            'Lab Services': [
                { name: 'Blood Tests', description: 'Various blood testing services' },
                { name: 'Radiology', description: 'X-Ray, CT Scan, MRI services' },
                { name: 'Pathology', description: 'Disease diagnosis services' }
            ],
            'Pharmacy Services': [
                { name: 'Medicine Delivery', description: 'Home delivery of medicines' },
                { name: 'Health Products', description: 'Health and wellness products' }
            ],
            'Emergency Services': [
                { name: 'Ambulance', description: 'Emergency ambulance services' },
                { name: 'ICU Care', description: 'Intensive care unit services' }
            ],
            'Wellness Services': [
                { name: 'Physiotherapy', description: 'Physical therapy and rehabilitation' },
                { name: 'Nutrition', description: 'Diet and nutrition counseling' }
            ]
        };

        const createdSubcategories = {};
        for (const category of createdCategories) {
            const subs = subcategories[category.name];
            createdSubcategories[category.name] = [];

            for (const sub of subs) {
                const response = await axios.post(`${API_URL}/services/${category._id}/sub-services`, sub);
                createdSubcategories[category.name].push(response.data.subService);
                console.log(`  ✓ Created subcategory: ${category.name} > ${sub.name}`);
            }
        }

        // 3. Create Child Services
        const childServices = {
            'Home Visit': [
                { name: 'General Physician', service_type: 'Home Visit', price: 500 },
                { name: 'Pediatrician', service_type: 'Home Visit', price: 600 },
                { name: 'Orthopedic', service_type: 'Home Visit', price: 800 },
                { name: 'Cardiologist', service_type: 'Home Visit', price: 1000 },
                { name: 'Dermatologist', service_type: 'Home Visit', price: 700 }
            ],
            'Tele Consultation': [
                { name: 'General Physician', service_type: 'Online', price: 300 },
                { name: 'Psychiatrist', service_type: 'Online', price: 800 },
                { name: 'Nutritionist', service_type: 'Online', price: 500 },
                { name: 'Gynecologist', service_type: 'Online', price: 600 },
                { name: 'Pulmonologist', service_type: 'Online', price: 700 }
            ],
            'Clinic Visit': [
                { name: 'General Checkup', service_type: 'OPD', price: 400 },
                { name: 'Specialist Consultation', service_type: 'OPD', price: 800 },
                { name: 'Follow-up Visit', service_type: 'OPD', price: 300 },
                { name: 'Emergency Consultation', service_type: 'Emergency', price: 1500 },
                { name: 'Vaccination', service_type: 'OPD', price: 200 }
            ],
            'Blood Tests': [
                { name: 'Complete Blood Count', service_type: 'Lab Test', price: 300 },
                { name: 'Lipid Profile', service_type: 'Lab Test', price: 500 },
                { name: 'Thyroid Test', service_type: 'Lab Test', price: 600 },
                { name: 'Diabetes Test', service_type: 'Lab Test', price: 400 },
                { name: 'Liver Function Test', service_type: 'Lab Test', price: 700 }
            ],
            'Radiology': [
                { name: 'X-Ray', service_type: 'Lab Test', price: 400 },
                { name: 'CT Scan', service_type: 'Lab Test', price: 3000 },
                { name: 'MRI Scan', service_type: 'Lab Test', price: 5000 },
                { name: 'Ultrasound', service_type: 'Lab Test', price: 800 },
                { name: 'Mammography', service_type: 'Lab Test', price: 1500 }
            ],
            'Medicine Delivery': [
                { name: 'Prescription Medicines', service_type: 'Pharmacy', price: 0 },
                { name: 'OTC Medicines', service_type: 'Pharmacy', price: 0 },
                { name: 'Chronic Disease Medicines', service_type: 'Pharmacy', price: 0 },
                { name: 'Emergency Medicines', service_type: 'Pharmacy', price: 50 },
                { name: 'Surgical Supplies', service_type: 'Pharmacy', price: 0 }
            ],
            'Ambulance': [
                { name: 'Basic Life Support', service_type: 'Emergency', price: 1000 },
                { name: 'Advanced Life Support', service_type: 'Emergency', price: 2000 },
                { name: 'Neonatal Ambulance', service_type: 'Emergency', price: 2500 },
                { name: 'Air Ambulance', service_type: 'Emergency', price: 50000 },
                { name: 'Patient Transport', service_type: 'Emergency', price: 800 }
            ],
            'Physiotherapy': [
                { name: 'Sports Injury', service_type: 'Home Visit', price: 800 },
                { name: 'Post Surgery', service_type: 'Home Visit', price: 1000 },
                { name: 'Chronic Pain', service_type: 'Home Visit', price: 900 },
                { name: 'Elderly Care', service_type: 'Home Visit', price: 700 },
                { name: 'Pediatric Therapy', service_type: 'Home Visit', price: 850 }
            ]
        };

        for (const category of createdCategories) {
            const subs = createdSubcategories[category.name];

            for (const sub of subs) {
                const children = childServices[sub.name];
                if (children) {
                    for (const child of children) {
                        await axios.post(`${API_URL}/services/sub-services/${sub._id}/child-services`, child);
                        console.log(`    ✓ Created service: ${category.name} > ${sub.name} > ${child.name} (${child.service_type}, ₹${child.price})`);
                    }
                }
            }
        }

        console.log('\n✅ Test data created successfully!');
        console.log('\nSummary:');
        console.log(`- ${categories.length} Categories`);
        console.log(`- ${Object.values(subcategories).flat().length} Subcategories`);
        console.log(`- ${Object.values(childServices).flat().length} Services`);

    } catch (error) {
        console.error('❌ Error creating test data:', error.response?.data || error.message);
    }
}

createTestData();
