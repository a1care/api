const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
    mobile_number: {
        type: String,
        required: true,
        unique: true,
    },
    role: {
        type: String,
        required: true,
        enum: ['User', 'Doctor', 'Admin']
    },
    name: { type: String },
    email: { type: String },
    profile_image: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    fcm_token: {
        type: String,

    },

    created_at: {
        type: Date,
        default: Date.now
    }
});


const User = mongoose.model('User', UserSchema);
module.exports = User;