
const mongoose = require('mongoose');
const { Schema } = mongoose;

const LabTestSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    image_url: { type: String },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});

const LabTest = mongoose.model('LabTest', LabTestSchema);
module.exports = LabTest;
