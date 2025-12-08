const mongoose = require('mongoose');
const { Schema } = mongoose;

const BookingSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Doctor is optional now, as we might book other things
    doctorId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    // Generic Item Reference (for LabTest, Equipment, Ambulance)
    itemId: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'itemType' // Dynamic reference based on itemType field
    },
    itemType: {
        type: String,
        required: true,
        enum: ['User', 'ServiceItem', 'SubService', 'ChildService'], // 'User' for Doctor, 'ServiceItem' for legacy, others for new flow
        default: 'User'
    },
    // Service Category (e.g., OPD, Lab, etc.) - Optional if implied by itemType
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: 'Service'
    },
    slot: {
        start_time: { type: Date }, // Optional for non-slot based bookings
        end_time: { type: Date },
        slot_id: { type: String }
    },
    booking_date: { type: Date, required: true },
    status: {
        type: String,
        required: true,
        enum: ['New', 'Accepted', 'Assigned', 'Confirmed', 'Completed', 'Cancelled', 'Upcoming', 'Pending Payment', 'Approved', 'Rejected'],
        default: 'New'
    },
    // Admin workflow fields
    created_by: {
        type: String,
        enum: ['User', 'Admin'],
        default: 'User'
    },
    // Explicitly track who needs to fulfill this booking
    target_role: {
        type: String,
        enum: ['Doctor', 'Admin'],
        default: 'Admin',
        required: true
    },
    assigned_doctor: {
        type: Schema.Types.ObjectId,
        ref: 'Doctor'
    },
    doctor_confirmation: {
        type: Boolean,
        default: false
    },
    admin_notes: { type: String },
    consultation_fee: { type: Number }, // Specific to Doctor
    item_price: { type: Number },       // For Lab/Equipment/Ambulance
    platform_fee: { type: Number, required: true },
    total_amount: { type: Number, required: true },
    payment_mode: {
        type: String,
        enum: ['COD', 'Online', 'Insurance', 'Not Specified'],
        default: 'COD'
    },
    payment_status: {
        type: String,
        required: true,
        enum: ['INITIATED', 'PAID', 'FAILED', 'REFUNDED'],
        default: 'INITIATED'
    },
    payment_details: {
        transaction_id: String,
        method: String,
        timestamp: Date
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Prevent double booking for the same item (Doctor) at the same time
// Prevent double booking for the same item (Doctor) at the same time
// But allow multiple bookings for items without slots (e.g. Services) where start_time is null/undefined
BookingSchema.index(
    { itemId: 1, 'slot.start_time': 1 },
    {
        unique: true,
        partialFilterExpression: { 'slot.start_time': { $exists: true, $ne: null } }
    }
);

const Booking = mongoose.model('Booking', BookingSchema);
module.exports = Booking;