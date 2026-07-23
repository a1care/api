import mongoose from 'mongoose';
await mongoose.connect('mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care');
const db = mongoose.connection.db;

// List all collections
const cols = await db.listCollections().toArray();
console.log('Collections:', cols.map(c => c.name).join(', '));

// Check notifications collection
const total = await db.collection('notifications').countDocuments();
console.log('\nTotal notifications:', total);

// Get a sample 
const sample = await db.collection('notifications').find({}).sort({ createdAt: -1 }).limit(5).toArray();
console.log('Recent notifications:');
sample.forEach(n => {
  console.log(JSON.stringify({ userType: n.userType, title: n.title, fcmStatus: n.fcmStatus, type: n.type }, null, 0));
});

await mongoose.disconnect();
