    const mongoose = require('mongoose');
const { Schema } = mongoose;

const DoctorDocumentSchema = new Schema({
    doctorId: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Links to the user's base document
        required: true
    },
    document_type: {
        type: String,
        required: true,
        enum: [
            'Registration_Certificate',
            'Highest_Degree',
            'Identity_Proof',
            'Experience_Proof',
            'Profile_Photo'
        ],
        // Ensures a doctor cannot upload the same type of document twice
        index: true,
    },
    s3_url: {
        type: String,
        required: true
    },
    is_verified: {
        type: Boolean,
        default: false 
    },
    uploaded_at: {
        type: Date,
        default: Date.now
    }
});

DoctorDocumentSchema.index({ doctorId: 1, document_type: 1 }, { unique: true });

const DoctorDocument = mongoose.model('DoctorDocument', DoctorDocumentSchema);
module.exports = DoctorDocument;