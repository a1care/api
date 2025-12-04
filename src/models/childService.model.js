const mongoose = require('mongoose');
const { Schema } = mongoose;

const ChildServiceSchema = new Schema({
    subServiceId: {
        type: Schema.Types.ObjectId,
        ref: 'SubService',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    service_type: {
        type: String,
        enum: ['OPD', 'Emergency', 'Online', 'Home Visit', 'Lab Test', 'Pharmacy'],
        required: true
    },
    price: {
        type: Number,
        default: 0
    },
    is_active: {
        type: Boolean,
        default: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

const ChildService = mongoose.model('ChildService', ChildServiceSchema);
module.exports = ChildService;
