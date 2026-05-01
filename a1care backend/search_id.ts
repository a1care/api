import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';

async function findPatient() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    const targetId = new mongoose.Types.ObjectId("6979eb07ab1df5715edbd7a9");
    console.log('Searching for ID:', targetId);

    for (const collInfo of collections) {
        const name = collInfo.name;
        const doc = await db.collection(name).findOne({
            $or: [
                { _id: targetId },
                { _id: targetId.toString() }
            ]
        });
        if (doc) {
            console.log(`FOUND in collection [${name}]:`, doc.name || doc.title || doc.mobileNumber || doc);
        }
    }

    await mongoose.disconnect();
}

findPatient().catch(console.error);
