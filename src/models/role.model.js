const mongoose = require('mongoose');
const { Schema } = mongoose;

const RoleSchema = new Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true
    },
    permissions: [{
        type: String // e.g., 'manage_users', 'view_reports'
    }],
    is_active: {
        type: Boolean,
        default: true
    }
});

const Role = mongoose.model('Role', RoleSchema);
module.exports = Role;
