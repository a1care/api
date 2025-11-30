const mongoose = require('mongoose');
const dotenv = require('dotenv');
const LabTest = require('./src/models/labTest.model');

dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const tests = await LabTest.find({});
        console.log(`Found ${tests.length} Lab Tests.`);
        if (tests.length > 0) {
            console.log('Sample:', JSON.stringify(tests[0], null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

check();
