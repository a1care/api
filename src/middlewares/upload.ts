import multer from "multer";
import multerS3 from "multer-s3";
import s3 from "../configs/aws.js";
import { ApiError } from "../utils/ApiError.js";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

interface UploadOptions {
  folder: string;
  allowedMimeTypes: string[];
  maxSizeMB: number;
}

export function createS3Upload(options: UploadOptions) {
  const { folder, allowedMimeTypes, maxSizeMB } = options;
  const bucket = process.env.S3_BUCKET_NAME;

  const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      cb(new ApiError(400, `Invalid file type. Allowed: ${allowedMimeTypes.join(", ")}`));
      return;
    }
    cb(null, true);
  };

  const limits = { fileSize: maxSizeMB * 1024 * 1024 };

  if (!bucket) {
    const localDir = path.join(process.cwd(), 'uploads', folder);
    fs.mkdirSync(localDir, { recursive: true });

    return multer({
      limits,
      fileFilter,
      storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, localDir),
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
      })
    });
  }

  return multer({
    limits,
    fileFilter,
    storage: multerS3({
      s3,
      bucket,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key(req, file, cb) {
        const uniqueName = `${folder}/${Date.now()}-${file.originalname}`;
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
  folder: "profiles",
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxSizeMB: 5
}).single('profile');

export const uploadStaffDocument = createS3Upload({
  folder: "staff_documents",
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  maxSizeMB: 10
}).single('document');

export const uploadMedicalRecordAssets = createS3Upload({
  folder: "medical_records",
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  maxSizeMB: 10
}).fields([
  { name: "prescriptions", maxCount: 10 },
  { name: "labReports", maxCount: 10 }
]);
