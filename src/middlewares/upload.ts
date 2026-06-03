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

// Map each accepted MIME type to its valid file extensions. The client-supplied
// mimetype alone is spoofable, so we also require the extension to match — this
// blocks e.g. an .html file sent as Content-Type: image/jpeg.
const MIME_TO_EXT: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

// Strip anything that isn't a safe filename character (prevents path traversal).
const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

export function createS3Upload(options: UploadOptions) {
  const { folder, allowedMimeTypes, maxSizeMB } = options;
  const bucket = process.env.S3_BUCKET_NAME;

  const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = MIME_TO_EXT[file.mimetype];
    if (!allowedMimeTypes.includes(file.mimetype) || !allowedExts || !allowedExts.includes(ext)) {
      cb(new ApiError(400, `Invalid file. Allowed types: ${allowedMimeTypes.join(", ")}`));
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
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${sanitizeFilename(file.originalname)}`)
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
        const uniqueName = `${folder}/${Date.now()}-${sanitizeFilename(file.originalname)}`;
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

export const uploadServiceAssets = createS3Upload({
  folder: "services",
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxSizeMB: 2
}).fields([
  { name: "image", maxCount: 1 },
  { name: "banner", maxCount: 1 }
]);

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
