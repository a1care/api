const mongoose = require('mongoose');
const Doctor = require('./src/models/doctor.model');

const MONGO_URI = 'mongodb+srv://a1caresocialhub_db_user:P6Xu1TXxHTEQ41ZT@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority';

async function fixStatus() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        // Find doctors with lowercase 'active' status (or any invalid one if we knew it)
        // Since we know the specific doctor has this issue, let's fix them all or just that one.
        // Mongoose might not even let us find it if we use the Model directly with schema validation ON?
        // No, find() is okay. save() is the issue.

        // Use updateOne to bypass schema validation during the update itself?
        // Yes, updateOne does not trigger "document.save()" validation unless runValidators: true is set.

        // Fix 'active' -> 'Active'
        const resActive = await Doctor.updateMany(
            { status: 'active' },
            { $set: { status: 'Active' } }
        );
        console.log(`Fixed 'active' -> 'Active': ${resActive.modifiedCount} docs`);

        // Fix 'pending' -> 'Pending'
        const resPending = await Doctor.updateMany(
            { status: 'pending' },
            { $set: { status: 'Pending' } }
        );
        console.log(`Fixed 'pending' -> 'Pending': ${resPending.modifiedCount} docs`);

        // Double check our specific user
        const targetUserId = '6934dd8379c636c5210b960d';
        const doc = await Doctor.findOne({ userId: targetUserId }).lean(); // Use lean to avoid hydration errors if any
        if (doc) {
            console.log(`Target Doctor Status Now: ${doc.status}`);
        }

    } catch (error) {
        console.error('Fix Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixStatus();
