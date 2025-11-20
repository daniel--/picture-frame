import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError, ErrorType } from "./errors.js";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
  };
}

/**
 * Middleware to verify JWT token and attach user info to request
 * Usage: app.post("/protected-route", authenticateToken, asyncHandler(async (req, res) => { ... }))
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    console.error("Token", token);

    if (!token) {
      return next(new AppError("Authentication token required", ErrorType.UNAUTHORIZED));
    }

    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET environment variable is not set");
      return next(new AppError("Server configuration error", ErrorType.INTERNAL_SERVER_ERROR));
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as {
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

