import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import path from "path";
import ViteExpress from "vite-express";
import { createServer } from "http";
import { login, LoginInput, createUser, CreateUserInput } from "./users.js";
import { AppError, ErrorType, asyncHandler, errorHandler } from "./errors.js";
import { authenticateToken, AuthRequest } from "./auth.js";
import { upload, createImage, generateThumbnail, deleteImage, updateImageSortOrder, stripMetadata, toImageDTO } from "./images.js";
import { ImageWebSocketServer } from "./websocket.js";
import { getRandomOrder, setRandomOrder } from "./settings.js";
import { env } from "./env.js";

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

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      env.JWT_SECRET
    );

    return res.json({ token, user });
  })
);

// Create user endpoint (protected by JWT)
app.post(
  "/api/users/create",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    // authenticateToken middleware ensures req.user exists
    const { name, email, password }: CreateUserInput = req.body;

    if (!name || !email || !password) {
      throw new AppError("Name, email, and password are required", ErrorType.BAD_REQUEST);
    }

    // Create the user
    const newUser = await createUser({ name, email, password });

    return res.json({
      message: "User created successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
    });
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

    // Strip metadata from the image
    await stripMetadata(req.file.path);

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

    // Create image record in database (req.user guaranteed by authenticateToken middleware)
    const image = await createImage({
      userId: req.user!.id,
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

    return res.json(toImageDTO(image));
  })
);

// Delete image endpoint (protected by JWT, any authenticated user can delete any image)
app.delete(
  "/api/images/:id",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    // authenticateToken middleware ensures req.user exists
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
    // authenticateToken middleware ensures req.user exists
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
      images: images.map(toImageDTO),
    });
  })
);

// Get random order setting endpoint (protected by JWT)
app.get(
  "/api/settings/random-order",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    // authenticateToken middleware ensures req.user exists
    const randomOrder = await getRandomOrder();
    return res.json({ randomOrder });
  })
);

// Set random order setting endpoint (protected by JWT)
app.post(
  "/api/settings/random-order",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    // authenticateToken middleware ensures req.user exists
    const { randomOrder }: { randomOrder: boolean } = req.body;

    if (typeof randomOrder !== "boolean") {
      throw new AppError("randomOrder must be a boolean", ErrorType.BAD_REQUEST);
    }

    await setRandomOrder(randomOrder);

    // Notify WebSocket server to reload the setting
    if (wsServer) {
      wsServer.reloadRandomOrderSetting().catch((error) => {
        console.error("Failed to reload random order setting in WebSocket server:", error);
      });
    }

    return res.json({ message: "Random order setting updated successfully", randomOrder });
  })
);

// Error handling middleware (must be last)
app.use(errorHandler);

let wsServer: ImageWebSocketServer | null = null;

// Create HTTP server and attach Express app
const server = createServer(app);

// Initialize WebSocket server
wsServer = new ImageWebSocketServer(server);

// Configure ViteExpress before starting server
ViteExpress.config({ 
  mode: env.NODE_ENV,
});

// Bind ViteExpress to the app and server
ViteExpress.bind(app, server);

// Start server
server.listen(env.PORT, () => {
  console.log(`Server is listening on port ${env.PORT}...`);
  console.log("WebSocket server initialized on /ws");
});
