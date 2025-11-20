import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import path from "path";
import ViteExpress from "vite-express";
import { login, LoginInput } from "./users.js";
import { AppError, ErrorType, asyncHandler, errorHandler } from "./errors.js";
import { authenticateToken, AuthRequest } from "./auth.js";
import { upload, createImage, generateThumbnail } from "./images.js";

const app = express();

// Middleware for parsing JSON request bodies
app.use(express.json());

// Serve uploaded images statically
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

// Login endpoint
app.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password }: LoginInput = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required", ErrorType.BAD_REQUEST);
    }

    // Authenticate user
    const user = await login({ email, password });

    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET environment variable is not set");
      throw new AppError("Server configuration error", ErrorType.INTERNAL_SERVER_ERROR);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      jwtSecret
    );

    return res.json({ token, user });
  })
);

// Image upload endpoint (protected by JWT)
app.post(
  "/api/images/upload",
  authenticateToken,
  upload.single("image"),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.file) {
      throw new AppError("No image file provided", ErrorType.BAD_REQUEST);
    }

    if (!req.user) {
      throw new AppError("User not authenticated", ErrorType.UNAUTHORIZED);
    }

    // Generate thumbnail (always saved as JPEG)
    const originalExt = path.extname(req.file.filename);
    const baseName = path.basename(req.file.filename, originalExt);
    const thumbnailFilename = `thumb-${baseName}.jpg`;
    const thumbnailPath = path.join(process.cwd(), "public", "uploads", "thumbnails", thumbnailFilename);
    const thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;

    let thumbnailPathResult: string | null = null;
    try {
      await generateThumbnail(req.file.path, thumbnailPath);
      thumbnailPathResult = thumbnailUrl;
    } catch (error) {
      // If thumbnail generation fails, continue without thumbnail
      console.error("Thumbnail generation failed:", error);
    }

    // Create image record in database
    const image = await createImage({
      userId: req.user.id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: `/uploads/${req.file.filename}`,
      thumbnailPath: thumbnailPathResult,
    });

    return res.json({
      id: image.id,
      filename: image.filename,
      originalName: image.originalName,
      mimeType: image.mimeType,
      size: image.size,
      url: image.path,
      thumbnailUrl: image.thumbnailPath,
      createdAt: image.createdAt,
    });
  })
);

// Error handling middleware (must be last)
app.use(errorHandler);

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);
