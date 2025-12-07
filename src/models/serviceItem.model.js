const mongoose = require('mongoose');
const { Schema } = mongoose;

const ServiceItemSchema = new Schema({
    name: { type: String, required: true }, // e.g., 'Blood Test', 'Wheelchair', 'Basic Ambulance'
    description: { type: String },
    price: { type: Number, required: true }, // Base price, Rental price, or Base fare
    price_unit: { type: String }, // e.g., 'per_test', 'per_day', 'base_fare'

    // Additional pricing fields if needed
    price_per_km: { type: Number }, // Specific for Ambulance

    image_url: { type: String },

    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },

    // For Level 2 Hierarchy (Sub-Service -> Child Service)
    parent_service_item_id: {
        type: Schema.Types.ObjectId,
        ref: 'ServiceItem',
        default: null
    },

    booking_type: {
        type: String,
        enum: ['DirectBooking', 'OnlineConsultancy'],
        default: 'DirectBooking'
    },

    is_active: { type: Boolean, default: true },

    // Optional fields for specific types (Inventory tracking)
    vehicle_number: { type: String }, // For Ambulance
    driver_name: { type: String },    // For Ambulance
    driver_phone: { type: String },   // For Ambulance
    current_location: {               // For Ambulance
        latitude: Number,
        longitude: Number
    },

    metadata: { type: Map, of: Schema.Types.Mixed }, // For any other specific details

    created_at: { type: Date, default: Date.now }
});

const ServiceItem = mongoose.model('ServiceItem', ServiceItemSchema);
module.exports = ServiceItem;
