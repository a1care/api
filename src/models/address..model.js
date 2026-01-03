const { Schema, default: mongoose } = require("mongoose");

const AddressSchema = new Schema({
    userId: ObjectId, 
    label: String, // Home, Work, Parent's House
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: String,

    location: {
        type: "Point",
        coordinates: [lng, lat] // 👈 USED FOR DISTANCE CALC
    },

    isDefault: Boolean, // optional
    isDeleted: Boolean, // soft delete

    createdAt: Date,
    updatedAt: Date
})

const Address  = mongoose.model("Address" , AddressSchema)
module.exports = Address