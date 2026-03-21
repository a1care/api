// src/types/express.d.ts
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "Patient" | "Staff" | "admin" | "super_admin";
      };
      fileUrl:string
    }
  }
}

export {};
