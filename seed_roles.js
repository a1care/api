const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Role = require('./src/models/role.model');

dotenv.config();

const seedRoles = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Seeding');

        const roles = [
            { name: 'User', permissions: ['book_appointment', 'view_history'] },
            { name: 'Doctor', permissions: ['view_appointments', 'manage_schedule'] },
            { name: 'Admin', permissions: ['manage_users', 'manage_doctors', 'view_reports', 'manage_services'] }
        ];

        for (const role of roles) {
            const exists = await Role.findOne({ name: role.name });
            if (!exists) {
                await Role.create(role);
                console.log(`Role ${role.name} created.`);
            } else {
                console.log(`Role ${role.name} already exists.`);
            }
        }

        console.log('Role seeding completed.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedRoles();
