import {S3Client} from '@aws-sdk/client-s3'
import dotenv from 'dotenv'
dotenv.config()

const s3Client = new S3Client({
    region:"ap-south-2"  , 
    credentials:{
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    }
});

export default s3Client