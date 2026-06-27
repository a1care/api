/**
 * One-time migration: Convert patient.mobileNumber from Number to String.
 *
 * Run ONCE before deploying the backend update that changes the Mongoose
 * schema type from Number to String.
 *
 *   npx ts-node -r dotenv/config src/scripts/migrate_phone_to_string.ts
 *
 * Safe to re-run — documents already holding a string are skipped.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const BATCH_SIZE = 500;

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set in .env");

    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const collection = mongoose.connection.collection("patients");
    let processed = 0;
    let skipped = 0;

    // Find all documents where mobileNumber is stored as a BSON number (not string)
    const cursor = collection.find({ mobileNumber: { $type: "number" } });

    const ops: any[] = [];

    for await (const doc of cursor) {
        const numericPhone: number = doc.mobileNumber;
        // Strip the 91 country code prefix that was incorrectly stored as part of the number
        // e.g., 918309470360 -> "8309470360" (10-digit Indian mobile)
        const raw = String(numericPhone).replace(/\D/g, '');
        const stringPhone = raw.startsWith('91') && raw.length === 12 ? raw.slice(2) : raw;

        ops.push({
            updateOne: {
                filter: { _id: doc._id },
                update: { $set: { mobileNumber: stringPhone } },
            },
        });

        if (ops.length >= BATCH_SIZE) {
            const result = await collection.bulkWrite(ops, { ordered: false });
            processed += result.modifiedCount;
            ops.length = 0;
            console.log(`Migrated ${processed} records so far...`);
        }
    }

    // Flush remaining
    if (ops.length > 0) {
        const result = await collection.bulkWrite(ops, { ordered: false });
        processed += result.modifiedCount;
    }

    // Count how many were already strings (skipped)
    skipped = await collection.countDocuments({ mobileNumber: { $type: "string" } });

    console.log(`\nMigration complete.`);
    console.log(`  Converted : ${processed}`);
    console.log(`  Already string (skipped) : ${skipped}`);

    await mongoose.disconnect();
}

run().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
