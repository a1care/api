const fs = require('fs');

const filePath = 'src/models/serviceItem.model.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add new fields after serviceId
const oldServiceId = `    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },

    is_active: { type: Boolean, default: true },`;

const newServiceId = `    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },

    // Multi-level hierarchy support
    parentItemId: { type: Schema.Types.ObjectId, ref: 'ServiceItem', default: null }, // null for top-level items
    level: { type: Number, default: 1 }, // 1 for sub-services, 2 for child services
    booking_type: { 
        type: String, 
        enum: ['direct_booking', 'online_consultancy', 'none'],
        default: 'none'
    },

    is_active: { type: Boolean, default: true },`;

content = content.replace(oldServiceId, newServiceId);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Updated serviceItem.model.js - Added parentItemId, level, and booking_type fields');
