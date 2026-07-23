import mongoose from 'mongoose';
await mongoose.connect('mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care');
const db = mongoose.connection.db;
// Get recent notifications for patients 
const recent = await db.collection('notifications').find({ userType: 'Patient' }).sort({ createdAt: -1 }).limit(10).toArray();
console.log('Recent patient notifications:');
recent.forEach(n => {
  console.log(`  [${n.fcmStatus || 'NO_STATUS'}] ${n.title} - ${n.createdAt?.toISOString?.() || n.createdAt}`);
});
await mongoose.disconnect();
