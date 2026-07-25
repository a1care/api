import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/a1care').then(async () => {
    const Doctor = mongoose.connection.collection('doctors');
    const docs = await Doctor.find({}, {projection: {name: 1, mobileNumber: 1}}).toArray();
    console.log('Doctors:', docs);
    process.exit(0);
});
