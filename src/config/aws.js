// Use modular V3 imports
const { S3Client } = require('@aws-sdk/client-s3');

// S3Client does not use AWS.config.update. It takes configuration directly
const s3Client = new S3Client({
    region:'ap-south-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

module.exports = s3Client;