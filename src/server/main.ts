import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import path from "path";
import ViteExpress from "vite-express";
import { createServer } from "http";
import { login, LoginInput } from "./users.js";
import { AppError, ErrorType, asyncHandler, errorHandler } from "./errors.js";
import { authenticateToken, AuthRequest } from "./auth.js";
import { upload, createImage, generateThumbnail, deleteImage, updateImageSortOrder } from "./images.js";
import { ImageWebSocketServer } from "./websocket.js";

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

    // Broadcast image list update to all WebSocket clients
    if (wsServer) {
      await wsServer.broadcastImages();
    }

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

// Delete image endpoint (protected by JWT, any authenticated user can delete any image)
app.delete(
  "/api/images/:id",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      throw new AppError("User not authenticated", ErrorType.UNAUTHORIZED);
    }

    const imageId = parseInt(req.params.id, 10);
    if (isNaN(imageId)) {
      throw new AppError("Invalid image ID", ErrorType.BAD_REQUEST);
    }

    // Delete the image (any authenticated user can delete any image)
    const deletedImage = await deleteImage(imageId);

    // Broadcast image list update to all WebSocket clients
    if (wsServer) {
      await wsServer.broadcastImages();
    }

    return res.json({
      message: "Image deleted successfully",
      id: deletedImage.id,
    });
  })
);

// Update image sort order endpoint (protected by JWT)
app.post(
  "/api/images/reorder",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      throw new AppError("User not authenticated", ErrorType.UNAUTHORIZED);
    }

    const { imageOrders }: { imageOrders: Array<{ id: number; displayOrder: number }> } = req.body;

    if (!Array.isArray(imageOrders)) {
      throw new AppError("imageOrders must be an array", ErrorType.BAD_REQUEST);
    }

    // Validate each item in the array
    for (const order of imageOrders) {
      if (typeof order.id !== "number" || typeof order.displayOrder !== "number") {
        throw new AppError("Each item must have id and displayOrder as numbers", ErrorType.BAD_REQUEST);
      }
    }

    // Update sort order (this will also broadcast via WebSocket)
    const images = await updateImageSortOrder(imageOrders);

    // Broadcast image list update to all WebSocket clients
    if (wsServer) {
      await wsServer.broadcastImages();
    }

    return res.json({
      message: "Sort order updated successfully",
      images: images.map((img) => ({
        id: img.id,
        filename: img.filename,
        originalName: img.originalName,
        mimeType: img.mimeType,
        size: img.size,
        url: img.path,
        thumbnailUrl: img.thumbnailPath,
        displayOrder: img.displayOrder,
        createdAt: img.createdAt,
      })),
    });
  })
);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize WebSocket server
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error("JWT_SECRET environment variable is not set");
  process.exit(1);
}

let wsServer: ImageWebSocketServer | null = null;

// Create HTTP server and attach Express app
const server = createServer(app);

// Initialize WebSocket server
wsServer = new ImageWebSocketServer(server);

// Start server and configure ViteExpress
const port = 3000;
server.listen(port, () => {
  console.log("Server is listening on port 3000...");
  console.log("WebSocket server initialized on /ws");
  
  // Configure ViteExpress to use the existing server
  const mode = (process.env.NODE_ENV === "production" ? "production" : "development") as "development" | "production";
  ViteExpress.config({ mode });
  ViteExpress.bind(app, server);
});
