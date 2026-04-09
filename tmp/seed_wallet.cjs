
const mongoose = require('mongoose');
const { Schema } = mongoose;

async function run() {
    try {
        await mongoose.connect('mongodb://localhost:27020/a1care');
        const Patient = mongoose.model('Patient', new Schema({}, { strict: false }), 'patients');
        const Wallet = mongoose.model('Wallet', new Schema({ userId: mongoose.Schema.Types.ObjectId, balance: Number, transactions: Array }, { strict: false }), 'wallets');

        const user = await Patient.findOne({ mobileNumber: { $regex: '9701677607' } });
        if (!user) {
            console.log('User not found. Creating a test user...');
            const newPatient = await Patient.create({ name: 'Test User', mobileNumber: '+919701677607', isRegistered: true });
            console.log('New User ID:', newPatient._id);
            await Wallet.create({ userId: newPatient._id, balance: 10000, transactions: [{ amount: 10000, type: 'Credit', description: 'Test Seed', date: new Date() }] });
        } else {
            console.log('User ID:', user._id);
            const wallet = await Wallet.findOne({ userId: user._id });
            if (wallet) {
                await Wallet.updateOne({ userId: user._id }, { $set: { balance: 10000 }, $push: { transactions: { amount: 10000, type: 'Credit', description: 'Test Seed Update', date: new Date() } } });
                console.log('Wallet updated to 10000');
            } else {
                await Wallet.create({ userId: user._id, balance: 10000, transactions: [{ amount: 10000, type: 'Credit', description: 'Test Seed', date: new Date() }] });
                console.log('Wallet created with 10000');
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
