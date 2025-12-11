const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://a1caresocialhub_db_user:P6Xu1TXxHTEQ41ZT@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const collection = mongoose.connection.db.collection('bookings');
        const indexes = await collection.indexes();

        console.log('--- CURRENT INDEXES ---');
        indexes.forEach(idx => {
            console.log(`Name: ${idx.name}`);
            console.log(`Key: ${JSON.stringify(idx.key)}`);
            console.log(`Unique: ${idx.unique || false}`);
            console.log(`PartialFilter: ${JSON.stringify(idx.partialFilterExpression || 'NONE')}`);
            console.log('-----------------------');
        });

        // Identify the bad index
        // It likely has key: { itemId: 1, 'slot.start_time': 1 } AND unique: true, BUT MISSING partialFilterExpression
        const badIndex = indexes.find(i =>
            i.key.itemId === 1 &&
            i.key['slot.start_time'] === 1 &&
            i.unique === true &&
            (!i.partialFilterExpression)
        );

        if (badIndex) {
            console.log(`\nFOUND BAD INDEX: ${badIndex.name}. Dropping it...`);
            await collection.dropIndex(badIndex.name);
            console.log('Dropped.');

            console.log('Creating CORRECT partial index...');
            await collection.createIndex(
                { itemId: 1, 'slot.start_time': 1 },
                {
                    unique: true,
                    partialFilterExpression: { 'slot.start_time': { $exists: true, $ne: null } }
                }
            );
            console.log('Correct Index Created.');
        } else {
            console.log('\nNo "Bad" strict unique index found. Checking if partial exists...');
            const goodIndex = indexes.find(i =>
                i.key.itemId === 1 &&
                i.key['slot.start_time'] === 1 &&
                i.unique === true &&
                i.partialFilterExpression
            );
            if (goodIndex) {
                console.log('Good Partial Index ALREADY EXISTS. Implementation looks correct.');
            } else {
                console.log('Neither bad nor good index found? Creating good one now...');
                await collection.createIndex(
                    { itemId: 1, 'slot.start_time': 1 },
                    {
                        unique: true,
                        partialFilterExpression: { 'slot.start_time': { $exists: true, $ne: null } }
                    }
                );
                console.log('Correct Index Created.');
            }
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
