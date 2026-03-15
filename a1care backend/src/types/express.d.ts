// src/types/express.d.ts
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role?: "admin" | "super_admin";
        type?: "patient" | "staff" | "admin";
      };
      fileUrl:string
    }
  }
}

export {};
