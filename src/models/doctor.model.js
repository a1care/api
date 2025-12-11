const mongoose = require('mongoose');
const { Schema } = mongoose;

const DoctorSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['Inactive', 'Pending', 'Active', 'Rejected'],
        default: 'Inactive' // Default status is Inactive
    },
    experience: { type: Number },
    patients_treated: { type: Number, default: 0 },
    satisfaction_rating: { type: Number, default: 0.0 }, // 1.0 to 5.0
    consultation_fee: { type: Number },
    about: { type: String },
    // JSONB is replaced by a Mongoose Array of Objects
    working_hours: [{
        day: String,
        start: String,
        end: String
    }],
    specializations: [{
        type: String // Storing specialization names directly (e.g., 'Cardiology')
    }],
    offered_services: [{
        serviceType: {
            type: String,
            enum: ['OPD', 'Home Visit', 'Online', 'Emergency'],
            required: true
        },
        price: {
            type: Number,
            default: 0
        },
        is_active: {
            type: Boolean,
            default: true
        }
    }],
    is_available: { type: Boolean, default: true }
});

const Doctor = mongoose.model('Doctor', DoctorSchema);
module.exports = Doctor;