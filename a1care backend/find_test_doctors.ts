import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function findTestDoctors() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;

    console.log('Searching for test doctors...');
    const testDoctors = await db.collection('staffs').find({
        $or: [
            { name: { $regex: /test/i } },
            { name: { $regex: /unknown/i } },
            { email: { $regex: /test/i } }
        ]
    }).toArray();

    console.log(`Found ${testDoctors.length} test doctors:`);
    testDoctors.forEach(d => {
        console.log(`- ${d._id}: ${d.name} (${d.email || d.mobileNumber})`);
    });

    await mongoose.disconnect();
}

findTestDoctors().catch(console.error);
