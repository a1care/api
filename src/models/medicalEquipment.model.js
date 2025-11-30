const mongoose = require('mongoose');
const { Schema } = mongoose;

const MedicalEquipmentSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    rental_price: { type: Number, required: true }, // Price per day or unit
    image_url: { type: String },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});

const MedicalEquipment = mongoose.model('MedicalEquipment', MedicalEquipmentSchema);
module.exports = MedicalEquipment;
