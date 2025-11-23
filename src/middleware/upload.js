const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = require('../config/aws'); // Import the initialized S3 instance

// --- S3 Configuration ---
const S3_BUCKET = process.env.S3_BUCKET_NAME;

// Function to validate file type (e.g., images only)
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true); // Accept the file
    } else {
        cb(new Error('Invalid file type, only JPEG and PNG are allowed!'), false); // Reject the file
    }
};

// --- Multer-S3 Setup ---
const upload = multer({
    fileFilter: fileFilter,
    storage: multerS3({
        s3: s3,
        bucket: S3_BUCKET,
        acl: 'public-read', // Makes the uploaded image publicly accessible via URL
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            // Define the file name structure: e.g., 'services/service-name-timestamp.jpg'
            const ext = file.mimetype.split('/')[1];
            const key = `services/${Date.now().toString()}-${file.originalname}`;
            cb(null, key);
        }
    })
});

// We export the middleware function configured for a single file upload
// The field name 'serviceImage' should match the field name in the Postman/Frontend form data.
exports.uploadServiceImage = upload.single('serviceImage');