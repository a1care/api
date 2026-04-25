import type { Request, Response, NextFunction } from "express";
import { ApiError } from "./ApiError.js";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  if (err instanceof ApiError) {
    console.error(`API Error: ${err.message}`);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Map Mongoose/Mongo connectivity errors to 503
  const isMongoError =
    err.name === "MongoNetworkError" ||
    err.name === "MongoServerSelectionError" ||
    err.message?.includes("buffering timed out") ||
    err.message?.includes("initial connection is complete") ||
    err.message?.includes("topology was destroyed");

  if (isMongoError) {
    console.error("Database Connectivity Error:", err.message);
    return res.status(503).json({
      success: false,
      message: "Database unavailable (503). Please check connection.",
    });
  }

  const message =
    err instanceof Error ? err.message : "Internal Server Error";

  console.error("Unexpected Error:", err);

  return res.status(500).json({
    success: false,
    message,
  });
};
