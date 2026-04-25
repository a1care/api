import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const dropIndex = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI as string);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB not available');
        const collection = db.collection('medicalrecords');
        
        console.log('Current indexes:');
        const indexes = await collection.indexes();
        console.log(indexes);

        console.log('Dropping appointmentId_1 index if it exists...');
        try {
            await collection.dropIndex('appointmentId_1');
            console.log('Index dropped successfully!');
        } catch (e) {
            console.log('Index not found or already dropped.');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error dropping index:', err);
        process.exit(1);
    }
};

dropIndex();
