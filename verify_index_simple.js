const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://a1caresocialhub_db_user:P6Xu1TXxHTEQ41ZT@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority';

async function verify() {
    try {
        await mongoose.connect(MONGO_URI);
        const indexes = await mongoose.connection.db.collection('bookings').indexes();
        console.log('INDEXES:', JSON.stringify(indexes, null, 2));
    } finally {
        await mongoose.disconnect();
    }
}
verify();
