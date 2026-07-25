import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/a1care').then(async () => {
    const Doctor = mongoose.connection.collection('doctors');
    const doc = await Doctor.findOne({name: /Vinodklj/i});
    console.log('Doctor:', doc);
    
    if(doc) {
        const PartnerSubscription = mongoose.connection.collection('partnersubscriptions');
        const subs = await PartnerSubscription.find({partnerId: doc._id}).toArray();
        console.log('Subscriptions:', subs);
    }
    
    process.exit(0);
});
