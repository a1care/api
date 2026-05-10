import type { Request, Response, NextFunction } from "express";

export const attachServiceAssetsUrl = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  if (!files) return next();

  const getUrl = (file: Express.Multer.File & { location?: string }) => {
    if (file.location) return file.location;
    const normalizedPath = file.path.replace(/\\/g, "/");
    const uploadsIndex = normalizedPath.indexOf("uploads/");
    return uploadsIndex >= 0
      ? `/${normalizedPath.slice(uploadsIndex)}`
      : `/uploads/${file.filename}`;
  };

  if (files.image?.[0]) {
    req.body.imageUrl = getUrl(files.image[0]);
  }
  
  if (files.banner?.[0]) {
    req.body.bannerUrl = getUrl(files.banner[0]);
  }

  next();
};
