import mongoose from 'mongoose';

const MONGO_URI = "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

await mongoose.connect(MONGO_URI);
const db = mongoose.connection.db;

// Full doc of most recent PARTNER_ASSIGNED booking
const booking1 = await db.collection('servicerequests').findOne(
    { _id: new mongoose.Types.ObjectId('6a50c9bc6976ffb144858346') }
);
console.log('Most recent PARTNER_ASSIGNED booking:');
console.log(JSON.stringify(booking1, null, 2));

// Find Surendranath in staffs
const staff = await db.collection('staffs').findOne({ name: /Surendranath/i });
console.log('\nSurendranath:', JSON.stringify({
    _id: staff?._id,
    name: staff?.name,
    allowedRoleIds: staff?.allowedRoleIds,
    roleId: staff?.roleId,
    status: staff?.status
}, null, 2));

// Check if any booking exists with his ID as assignedProviderId
const hisBookings = await db.collection('servicerequests').find({
    assignedProviderId: staff?._id
}).toArray();
console.log(`\nBookings with Surendranath as assignedProviderId: ${hisBookings.length}`);

await mongoose.disconnect();
