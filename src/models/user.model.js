const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
    mobile_number: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['User', 'Doctor', 'Admin'] , 
        default: 'User'
    },
    name: { type: String },
    email: { type: String },
    profile_image: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other']
    },
    date_of_birth: {
        type: Date
    },
    fcm_token: {
        type: String,

    },

    created_at: {
        type: Date,
        default: Date.now
    } , 
    isRegistered: {
        type: Boolean,
        default: false
    }
});


const User = mongoose.model('User', UserSchema);
module.exports = User;