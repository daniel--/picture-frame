import { Request, Response, NextFunction } from "express";

/**
 * Custom application error class with HTTP status code
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error types with predefined status codes
 */
export const ErrorType = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Wrapper for async route handlers to catch errors
 * Usage: app.post("/route", asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Centralized error handling middleware
 * Should be added as the last middleware in Express app
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Handle validation errors (from express-validator, etc.)
  if (err.name === "ValidationError") {
    return res.status(ErrorType.BAD_REQUEST).json({
      error: err.message || "Validation error",
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(ErrorType.UNAUTHORIZED).json({
      error: "Invalid or expired token",
    });
  }

  // Handle multer errors
  if (err.name === "MulterError") {
    if ((err as any).code === "LIMIT_FILE_SIZE") {
      return res.status(ErrorType.BAD_REQUEST).json({
        error: "File size too large. Maximum size is 10MB",
      });
    }
    return res.status(ErrorType.BAD_REQUEST).json({
      error: err.message || "File upload error",
    });
  }

  // Handle errors with statusCode property (e.g., from fileFilter)
  if ((err as any).statusCode) {
    return res.status((err as any).statusCode).json({
      error: err.message,
    });
  }

  // Log unexpected errors
  console.error("Unexpected error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Default to 500 for unknown errors
  return res.status(ErrorType.INTERNAL_SERVER_ERROR).json({
    error: "Internal server error",
  });
};
