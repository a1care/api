const AWS = require('aws-sdk');

// Ensure these environment variables are set in your .env file and deployed configuration!
// AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
// AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
// AWS_REGION=ap-south-1 (e.g., Mumbai)

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION 
});

const s3 = new AWS.S3();

module.exports = s3;