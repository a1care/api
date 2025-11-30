const mongoose = require('mongoose');
const { Schema } = mongoose;

const AmbulanceSchema = new Schema({
    vehicle_number: { type: String, required: true, unique: true },
    type: {
        type: String,
        required: true,
        enum: ['Basic', 'ICU', 'Advance']
    },
    price_per_km: { type: Number, required: true },
    base_fare: { type: Number, default: 0 },
    driver_name: { type: String },
    driver_phone: { type: String },
    is_available: { type: Boolean, default: true },
    current_location: {
        latitude: Number,
        longitude: Number
    },
    created_at: { type: Date, default: Date.now }
});

const Ambulance = mongoose.model('Ambulance', AmbulanceSchema);
module.exports = Ambulance;
