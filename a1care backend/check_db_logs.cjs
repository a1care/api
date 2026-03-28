const mongoose = require('mongoose');
require('dotenv').config();

const PaymentLogSchema = new mongoose.Schema({
    txnId: String,
    event: String,
    level: String,
    message: String,
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
});

const PaymentLog = mongoose.model('PaymentLog', PaymentLogSchema);

async function checkLogs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const logs = await PaymentLog.find().sort({ createdAt: -1 }).limit(5);
        console.log('--- LAST 5 PAYMENT LOGS ---');
        console.log(JSON.stringify(logs, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkLogs();
