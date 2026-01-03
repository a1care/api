const multer = require('multer');
const multerS3 = require('multer-s3');
const s3Client = require('../config/aws'); // V3 Client Import

// --- Storage Configuration ---
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
        file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed!'), false);
    }
};

let documentStorage;
let serviceImageStorage;

if (S3_BUCKET) {
    // AWS S3 Storage
    // ----------------------------------------------------------------------
    //                        A. DOCTOR DOCUMENT UPLOAD (Multi-Field)
    // ----------------------------------------------------------------------
    documentStorage = multerS3({
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

    // ----------------------------------------------------------------------
    //                        B. SERVICE IMAGE UPLOAD (Single-Field)
    // ----------------------------------------------------------------------
    // Replicating your original logic for service images (uses 'serviceImage' field)
    serviceImageStorage = multerS3({
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
} else {
    // Fallback: Local Disk Storage
    console.warn('S3_BUCKET_NAME not found. Using local disk storage for uploads.');

    const fs = require('fs');
    const path = require('path');
    const uploadDir = path.join(__dirname, '../../uploads');

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const diskStorage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]);
        }
    });

    documentStorage = diskStorage;
    serviceImageStorage = diskStorage;
}

exports.uploadDoctorDocuments = multer({
    fileFilter: fileFilter,
    storage: documentStorage
}).fields(DOCUMENT_FIELDS); // <-- Uses multiple named fields


exports.uploadServiceImage = multer({
    fileFilter: fileFilter, // Can reuse the same file filter
    storage: serviceImageStorage
}).single('serviceImage'); // <-- Uses a single field name 'serviceImage'

exports.uploadProfile = multer({
    fileFilter:fileFilter , 
    storage:serviceImageStorage , 
}).single("profile")