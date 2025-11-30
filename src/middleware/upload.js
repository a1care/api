const multer = require('multer');
const multerS3 = require('multer-s3');
const s3Client = require('../config/aws'); // V3 Client Import

// --- S3 Configuration ---
const S3_BUCKET = process.env.S3_BUCKET_NAME;

// 1. Document Field Definitions (used by upload.fields)
const DOCUMENT_FIELDS = [
    { name: 'registration_cert', maxCount: 1 },
    { name: 'highest_degree', maxCount: 1 },
    { name: 'identity_proof', maxCount: 1 },
    { name: 'profile_photo', maxCount: 1 },
    { name: '   ', maxCount: 1 }, 
];

// --- Shared File Filter ---
const fileFilter = (req, file, cb) => {
    // Expanded file types to include PDFs for documents
    if (file.mimetype === 'image/jpeg' || 
        file.mimetype === 'image/png' || 
        file.mimetype === 'application/pdf') 
    {
        cb(null, true); 
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed!'), false); 
    }
};

// ----------------------------------------------------------------------
//                        A. DOCTOR DOCUMENT UPLOAD (Multi-Field)
// ----------------------------------------------------------------------

const documentStorage = multerS3({
    s3: s3Client, 
    bucket: S3_BUCKET,
    metadata: function (req, file, cb) {
        // file.fieldname will be 'registration_cert', 'profile_photo', etc.
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        // Secure and organized key structure using Doctor ID (from JWT)
        const ext = file.mimetype.split('/')[1];
        // req.userId.id is available because 'protect' middleware runs before this
        const key = `documents/${req.userId.id}/${file.fieldname}-${Date.now()}.${ext}`; 
        cb(null, key);
    }
});

exports.uploadDoctorDocuments = multer({
    fileFilter: fileFilter,
    storage: documentStorage
}).fields(DOCUMENT_FIELDS); // <-- Uses multiple named fields


// ----------------------------------------------------------------------
//                        B. SERVICE IMAGE UPLOAD (Single-Field)
// ----------------------------------------------------------------------

// Replicating your original logic for service images (uses 'serviceImage' field)
const serviceImageStorage = multerS3({
    s3: s3Client, 
    bucket: S3_BUCKET,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        // Generic key structure for service images
        const ext = file.mimetype.split('/')[1];
        const key = `services/${Date.now().toString()}-${file.originalname}`;
        cb(null, key);
    }
});

exports.uploadServiceImage = multer({
    fileFilter: fileFilter, // Can reuse the same file filter
    storage: serviceImageStorage
}).single('serviceImage'); // <-- Uses a single field name 'serviceImage'