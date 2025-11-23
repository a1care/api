const mongoose = require('mongoose');
const { Schema } = mongoose;

const BookingSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctorId: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Doctor is also a User
        required: true
    },
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    slot: {
        start_time: { type: Date, required: true },
        end_time: { type: Date, required: true },
        slot_id: { type: String, unique: true } // Unique ID generated for the slot
    },
    booking_date: { type: Date, required: true },
    status: {
        type: String,
        required: true,
        enum: ['Upcoming', 'Completed', 'Cancelled', 'Pending Payment'],
        default: 'Pending Payment'
    },
    consultation_fee: { type: Number, required: true },
    platform_fee: { type: Number, required: true },
    total_amount: { type: Number, required: true },
    payment_status: {
        type: String,
        required: true,
        enum: ['INITIATED', 'PAID', 'FAILED', 'REFUNDED'],
        default: 'INITIATED'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

const Booking = mongoose.model('Booking', BookingSchema);
module.exports = Booking;