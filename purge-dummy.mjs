import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

async function run() {
    console.log("Connecting to DB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected.");

    const collections = await mongoose.connection.db.listCollections().toArray();
    const names = collections.map(c => c.name);
    console.log("Collections:", names);

    // List of collections to protect (Patients and Admin Config)
    const protectedCollections = ["patients", "users", "admins", "roles", "configs", "identitycounters"];
    
    // We also want to keep the "doctors", "nurses" etc. collections but clear their data?
    // Or just delete the collections?
    // User said "remove all the data for this this all are dummy" pointing to Doctors, Nurses, etc.
    
    const collectionsToClear = names.filter(n => !protectedCollections.includes(n));
    
    for (const name of collectionsToClear) {
        console.log(`Clearing collection: ${name}`);
        await mongoose.connection.db.collection(name).deleteMany({});
    }

    console.log("Purge completed successfully!");
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
