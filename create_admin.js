const mongoose = require('mongoose');
const User = require('./src/models/user.model');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://a1caresocialhub_db_user:P6Xu1TXxHTEQ41ZT@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

async function createAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ MongoDB Connected");

        const adminEmail = 'admin@a1care.com';
        const adminMobile = '9999999999';

        // Check if exists
        let admin = await User.findOne({ email: adminEmail });

        if (admin) {
            console.log("ADMIN ALREADY EXISTS:", adminEmail);
            // Ensure role is admin
            if (admin.role !== 'Admin') {
                admin.role = 'Admin';
                await admin.save();
                console.log("Updated role to Admin");
            }
        } else {
            // Create new
            admin = await User.create({
                name: "Super Admin",
                email: adminEmail,
                mobile_number: adminMobile,
                role: 'Admin',
                // Add default location if needed
                latitude: 17.3850,
                longitude: 78.4867
            });
            console.log("✅ Created New Admin:", adminEmail);
        }

        console.log("Done.");
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

createAdmin();
