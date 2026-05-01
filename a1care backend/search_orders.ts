import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function searchInOrders() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;

    const targetId = "6979eb07ab1df5715edbd7a9";
    console.log('Searching for ID in Orders/Payments:', targetId);

    const collections = ['orders', 'paymentlogs', 'paymenttransactions', 'servicerequests'];
    for (const name of collections) {
        const results = await db.collection(name).find({
            $or: [
                { userId: new mongoose.Types.ObjectId(targetId) },
                { patientId: new mongoose.Types.ObjectId(targetId) },
                { _id: new mongoose.Types.ObjectId(targetId) }
            ]
        }).toArray();
        if (results.length > 0) {
            console.log(`FOUND ${results.length} results in [${name}]`);
            console.log(JSON.stringify(results[0], null, 2));
        }
    }

    await mongoose.disconnect();
}

searchInOrders().catch(console.error);
