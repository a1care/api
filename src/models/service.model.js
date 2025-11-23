const mongoose = require('mongoose');
const { Schema } = mongoose;

const ServiceSchema = new Schema({
    name: { type: String, required: true, unique: true }, // e.g., 'OPD Booking'
    title: { type: String },
    image_url: { type: String },
    is_active: { type: Boolean, default: true }
});

const Service = mongoose.model('Service', ServiceSchema);
module.exports = Service;

