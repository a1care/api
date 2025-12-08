const mongoose = require('mongoose');
const { Schema } = mongoose;

const DoctorSlotSchema = new Schema({
    doctorId: {
        type: Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    // Format: "YYYY-MM-DD" to easily group by day
    date: {
        type: String,
        required: true
    },
    // Sequential number for the day (1, 2, 3...)
    slot_number: {
        type: Number,
        required: true
    },
    slot_start_time: {
        type: Date,
        required: true
    },
    slot_end_time: {
        type: Date,
        required: true
    },
    is_booked: {
        type: Boolean,
        default: false
    },
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Ensure a doctor cannot have duplicate slot numbers on the same day
DoctorSlotSchema.index({ doctorId: 1, date: 1, slot_number: 1 }, { unique: true });

// Ensure a doctor cannot look for slots efficiently
DoctorSlotSchema.index({ doctorId: 1, date: 1 });

const DoctorSlot = mongoose.model('DoctorSlot', DoctorSlotSchema);
module.exports = DoctorSlot;
