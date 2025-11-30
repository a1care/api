const mongoose = require('mongoose');
const Doctor = require('../models/doctor.model');
const DoctorDocument = require('../models/doctorDocument.model');

// List of MANDATORY document field names
const MANDATORY_DOC_FIELDS = [
    'registration_cert',
    'highest_degree',
    'identity_proof',
    'profile_photo'
];

/**
 * Helper function to map field names to Document model enum values
 */
const DOCUMENT_TYPE_MAP = {
    registration_cert: 'Registration_Certificate',
    highest_degree: 'Highest_Degree',
    identity_proof: 'Identity_Proof',
    profile_photo: 'Profile_Photo',
    experience_proof: 'Experience_Proof',
};

/**
 * @route POST /api/doctor/documents/upload
 * @description Handles S3 upload of multiple documents and updates Doctor status to 'Pending'.
 * @access Private (Doctor Role)
 * @payload Form Data: multiple files named as defined in DOCUMENT_FIELDS
 */
exports.uploadDocument = async (req, res) => {
    const doctorId = req.userId.id; 
    const uploadedFiles = req.files; // Object of file arrays: { 'registration_cert': [file], ... }

    if (!uploadedFiles || Object.keys(uploadedFiles).length === 0) {
        return res.status(400).json({ message: 'No image files were processed or uploaded.' });
    }

    const uploadedDocumentNames = Object.keys(uploadedFiles);
    const uploadedDocs = [];
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        for (const fieldName of uploadedDocumentNames) {
            const fileArray = uploadedFiles[fieldName];
            
            if (fileArray && fileArray.length > 0) {
                const file = fileArray[0];
                const documentType = DOCUMENT_TYPE_MAP[fieldName];
                    
                if (!documentType) continue; // Skip unexpected fields

                // 1. Upsert (Insert or Update) the document record
                const doc = await DoctorDocument.findOneAndUpdate(
                    { doctorId: doctorId, document_type: documentType },
                    { 
                        $set: { 
                            s3_url: file.location, // S3 URL provided by Multer-S3
                            is_verified: false, 
                            uploaded_at: new Date() 
                        } 
                    },
                    { new: true, upsert: true, runValidators: true, session }
                );
                uploadedDocs.push(doc);
            }
        }

        // 2. Check if all mandatory documents are present
        const mandatoryUploaded = uploadedDocumentNames.filter(name => MANDATORY_DOC_FIELDS.includes(name));
        const allMandatoryUploaded = mandatoryUploaded.length === MANDATORY_DOC_FIELDS.length;

        let finalStatus = 'Inactive';
        if (allMandatoryUploaded) {
            // 3. Update Doctor Status to 'Pending'
            await Doctor.updateOne({ userId: doctorId }, { $set: { status: 'Pending' } }, { session });
            finalStatus = 'Pending';
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: `Documents processed. Doctor status set to: ${finalStatus}`,
            documents_uploaded: uploadedDocs.map(d => d.document_type),
            doctor_status: finalStatus
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Document upload transaction error:', error);
        // Note: Clean up S3 files on abort is complex and usually handled by a separate process.
        res.status(500).json({ message: 'Transaction failed during document processing.' });
    }
};