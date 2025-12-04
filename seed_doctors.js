const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/user.model');
const Doctor = require('./src/models/doctor.model');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const sampleDoctors = [
    {
        user: {
            name: 'Dr. Sarah Johnson',
            email: 'sarah.johnson@a1care.com',
            mobile_number: '9876543210',
            role: 'Doctor',
            is_verified: true
        },
        doctor: {
            specializations: ['Cardiologist', 'General Physician'],
            experience: 15,
            consultation_fee: 800,
            about: 'Dr. Sarah Johnson is a highly experienced cardiologist with over 15 years of practice. She specializes in preventive cardiology, heart disease management, and lifestyle modifications for heart health. She has helped thousands of patients manage their cardiovascular health effectively.',
            working_hours: [
                { day: 'Monday', start: '09:00', end: '17:00' },
                { day: 'Tuesday', start: '09:00', end: '17:00' },
                { day: 'Wednesday', start: '09:00', end: '17:00' },
                { day: 'Thursday', start: '09:00', end: '17:00' },
                { day: 'Friday', start: '09:00', end: '17:00' }
            ],
            status: 'Active',
            is_available: true,
            patients_treated: 2500,
            satisfaction_rating: 4.8
        }
    },
    {
        user: {
            name: 'Dr. Raj Patel',
            email: 'raj.patel@a1care.com',
            mobile_number: '9876543211',
            role: 'Doctor',
            is_verified: true
        },
        doctor: {
            specializations: ['General Physician', 'Diabetologist'],
            experience: 8,
            consultation_fee: 600,
            about: 'Dr. Raj Patel is a dedicated general physician and diabetologist. With 8 years of experience, he focuses on comprehensive primary care and diabetes management. His patient-centric approach and clear communication make him a favorite among patients.',
            working_hours: [
                { day: 'Monday', start: '10:00', end: '19:00' },
                { day: 'Tuesday', start: '10:00', end: '19:00' },
                { day: 'Wednesday', start: '10:00', end: '19:00' },
                { day: 'Thursday', start: '10:00', end: '19:00' },
                { day: 'Friday', start: '10:00', end: '19:00' },
                { day: 'Saturday', start: '10:00', end: '14:00' }
            ],
            status: 'Active',
            is_available: true,
            patients_treated: 1200,
            satisfaction_rating: 4.6
        }
    },
    {
        user: {
            name: 'Dr. Emily Chen',
            email: 'emily.chen@a1care.com',
            mobile_number: '9876543212',
            role: 'Doctor',
            is_verified: true
        },
        doctor: {
            specializations: ['Pediatrician', 'Child Specialist'],
            experience: 12,
            consultation_fee: 700,
            about: 'Dr. Emily Chen is a compassionate pediatrician with 12 years of experience in child healthcare. She specializes in newborn care, childhood vaccinations, growth monitoring, and developmental assessments. Parents trust her gentle approach and thorough explanations.',
            working_hours: [
                { day: 'Tuesday', start: '08:00', end: '16:00' },
                { day: 'Wednesday', start: '08:00', end: '16:00' },
                { day: 'Thursday', start: '08:00', end: '16:00' },
                { day: 'Friday', start: '08:00', end: '16:00' },
                { day: 'Saturday', start: '08:00', end: '12:00' }
            ],
            status: 'Active',
            is_available: true,
            patients_treated: 1800,
            satisfaction_rating: 4.9
        }
    }
];

const seedDoctors = async () => {
    try {
        await connectDB();

        console.log('\n🔄 Clearing existing doctors and doctor users...');

        // Get all doctor user IDs
        const doctorUsers = await User.find({ role: 'Doctor' });
        const doctorUserIds = doctorUsers.map(u => u._id);

        // Delete all doctors
        await Doctor.deleteMany({});

        // Delete all users with role Doctor
        await User.deleteMany({ role: 'Doctor' });

        console.log('✅ Cleared existing data\n');

        console.log('➕ Creating sample doctors...\n');

        for (const docData of sampleDoctors) {
            // Create user
            const user = await User.create(docData.user);
            console.log(`✅ Created user: ${user.name}`);

            // Create doctor profile
            const doctor = await Doctor.create({
                ...docData.doctor,
                userId: user._id
            });
            console.log(`✅ Created doctor profile for: ${user.name}`);
            console.log(`   - Specializations: ${doctor.specializations.join(', ')}`);
            console.log(`   - Experience: ${doctor.experience} years`);
            console.log(`   - Consultation Fee: ₹${doctor.consultation_fee}`);
            console.log(`   - Working Days: ${doctor.working_hours.length} days/week`);
            console.log(`   - Status: ${doctor.status}\n`);
        }

        console.log('✨ Successfully seeded 3 doctors with complete profiles!\n');
        console.log('📊 Summary:');
        const totalDoctors = await Doctor.countDocuments();
        const activeDoctors = await Doctor.countDocuments({ status: 'Active' });
        console.log(`   Total Doctors: ${totalDoctors}`);
        console.log(`   Active Doctors: ${activeDoctors}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding doctors:', error);
        process.exit(1);
    }
};

seedDoctors();
