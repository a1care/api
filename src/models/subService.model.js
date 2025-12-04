const mongoose = require('mongoose');
const { Schema } = mongoose;

const SubServiceSchema = new Schema({
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
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

const SubService = mongoose.model('SubService', SubServiceSchema);
module.exports = SubService;
