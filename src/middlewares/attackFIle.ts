import type { Request, Response, NextFunction } from "express";

export const attachFileUrl = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const file = req.file as Express.Multer.File & { location?: string } | undefined;

  if (file?.location) {
    req.fileUrl = file.location;
  } else if (file?.path) {
    const normalizedPath = file.path.replace(/\\/g, "/");
    const uploadsIndex = normalizedPath.indexOf("uploads/");
    req.fileUrl = uploadsIndex >= 0
      ? `/${normalizedPath.slice(uploadsIndex)}`
      : `/uploads/${file.filename}`;
  }

  next();
};
