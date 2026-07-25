import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/a1care').then(async () => {
    const Doctor = mongoose.connection.collection('doctors');
    const doc = await Doctor.findOne({_id: new mongoose.Types.ObjectId('6a564a5e658019da340b3d26')});
    console.log('Doctor:', doc?.name);
    process.exit(0);
});
