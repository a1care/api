import type { Request, Response, NextFunction } from "express";

export const attachFileUrl = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.file && (req.file as any).location) {
    req.fileUrl = (req.file as any).location;
  }
  next();
};
