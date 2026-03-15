import type { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken'
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";



export const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {

    // 1. Read Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Unauthorized: token missing");
    }

    const token = authHeader.split(" ")[1];
    console.log("token from middleware" , token)
    // 2. Verify & decode JWT
    try {
      const decoded = jwt.verify(token as string , process.env.JWT_SECRET as string) as any

      console.log("date from protected route" , decoded)

       req.user = {
        id:decoded.userId ?? decoded.staffId
       }

    // 4. Continue
    next();
    } catch (error) {
      throw new ApiError(401, "Unauthorized: invalid token");
    }

    // 3. Attach user to request
   
  }
);
