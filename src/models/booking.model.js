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
        enum: ['User', 'ServiceItem'], // 'User' for Doctor, 'ServiceItem' for everything else
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
        enum: ['Upcoming', 'Completed', 'Cancelled', 'Pending Payment', 'Approved', 'Rejected'],
        default: 'Pending Payment'
    },
    consultation_fee: { type: Number }, // Specific to Doctor
    item_price: { type: Number },       // For Lab/Equipment/Ambulance
    platform_fee: { type: Number, required: true },
    total_amount: { type: Number, required: true },
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

const Booking = mongoose.model('Booking', BookingSchema);
module.exports = Booking;