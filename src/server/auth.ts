import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError, ErrorType } from "./errors.js";
import { env } from "./env.js";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
  };
}

/**
 * Middleware to verify JWT token and attach user info to request
 * After this middleware executes successfully, req.user is guaranteed to exist in route handlers
 * Usage: app.post("/protected-route", authenticateToken, asyncHandler(async (req: AuthRequest, res) => { ... }))
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return next(new AppError("Authentication token required", ErrorType.UNAUTHORIZED));
    }

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: number;
      email: string;
      name: string;
    };

    // Attach user info to request
    (req as AuthRequest).user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (error) {
    // Handle JWT errors
    if (error instanceof jwt.JsonWebTokenError) {
      console.error("Invalid token", error);
      return next(new AppError("Invalid token", ErrorType.UNAUTHORIZED));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError("Token expired", ErrorType.UNAUTHORIZED));
    }
    // Pass other errors to error handler
    next(error);
  }
};
