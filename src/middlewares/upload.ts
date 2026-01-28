import multer from "multer";
import multerS3 from "multer-s3";
import  s3  from "../configs/aws.js";
import { ApiError } from "../utils/ApiError.js";
import dotenv from 'dotenv'

dotenv.config()

interface UploadOptions {
  folder: string;
  allowedMimeTypes: string[];
  maxSizeMB: number;
}

export function createS3Upload(options: UploadOptions) {
  const { folder, allowedMimeTypes, maxSizeMB } = options;
    console.log("this is from create uploads" , process.env.S3_BUCKET_NAME)
  return multer({
    limits: {
      fileSize: maxSizeMB * 1024 * 1024
    },
    fileFilter(req, file, cb) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        cb(
          new ApiError(
            400,
            `Invalid file type. Allowed: ${allowedMimeTypes.join(", ")}`
          )
        );
      } else {
        cb(null, true);
      }
    },
    storage: multerS3({
      s3,
      bucket: process.env.S3_BUCKET_NAME as string,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key(req, file, cb) {
        const uniqueName =
          `${folder}/${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
      }
    })
  });
}

export const uploadServiceImage = createS3Upload({
  folder: "services",
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxSizeMB: 2
}).single("image");

export const UploadProfileImage = createS3Upload({
  folder:"profiles" , 
  allowedMimeTypes:["image/jpeg", "image/png", "image/webp"] , 
  maxSizeMB:5
}).single('profile')
