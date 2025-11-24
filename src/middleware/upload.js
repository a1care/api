const multer = require('multer');
const multerS3 = require('multer-s3');
const s3Client = require('../config/aws'); // Import the NEW S3Client (V3)

// --- S3 Configuration ---
const S3_BUCKET = process.env.S3_BUCKET_NAME;

// Function to validate file type... (fileFilter remains the same)
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true); 
    } else {
        cb(new Error('Invalid file type, only JPEG and PNG are allowed!'), false); 
    }
};

// --- Multer-S3 Setup ---
const upload = multer({
    fileFilter: fileFilter,
    storage: multerS3({
        s3: s3Client, // <-- PASS THE V3 CLIENT HERE
        bucket: S3_BUCKET,
     //   acl: 'public-read', 
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const ext = file.mimetype.split('/')[1];
            const key = `services/${Date.now().toString()}-${file.originalname}`;
            cb(null, key);
        }
    })
});

exports.uploadServiceImage = upload.single('serviceImage');