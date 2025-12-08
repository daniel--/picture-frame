import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import path from "path";
import ViteExpress from "vite-express";
import { createServer } from "http";
import {
  login,
  LoginInput,
  createUser,
  CreateUserInput,
  requestPasswordReset,
  RequestPasswordResetInput,
  resetPassword,
  ResetPasswordInput,
  createInvite,
  CreateInviteInput,
  validateInvite,
  acceptInvite,
  AcceptInviteInput,
  getAllUsers,
  getAllInvites,
  resendInvite,
} from "./users.js";
import { AppError, ErrorType, asyncHandler, errorHandler } from "./errors.js";
import { authenticateToken, AuthRequest } from "./auth.js";
import { sendPasswordResetEmail, sendInviteEmail } from "./email.js";
import {
  upload,
  createImage,
  generateThumbnail,
  deleteImage,
  updateImageSortOrder,
  stripMetadata,
  toImageDTO,
} from "./images.js";
import { ImageWebSocketServer } from "./websocket.js";
import { getRandomOrder, setRandomOrder } from "./settings.js";
import { env } from "./env.js";

const app = express();

// Middleware for parsing JSON request bodies
app.use(express.json());

// Middleware to inject app config into HTML and set document title/meta tags
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (body: any) {
    if (typeof body === "string" && body.includes("<!-- APP_CONFIG_PLACEHOLDER -->")) {
      // Inject app config as a script tag
      const configScript = `<script>window.__APP_CONFIG__ = { appName: ${JSON.stringify(env.APP_NAME)} };</script>`;
      body = body.replace("<!-- APP_CONFIG_PLACEHOLDER -->", configScript);

      // Set document title (escape HTML entities)
      const escapedAppName = env.APP_NAME.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
      body = body.replace(/<title>.*?<\/title>/, `<title>${escapedAppName}</title>`);

      // Set apple-mobile-web-app-title meta tag (escape quotes)
      const metaAppName = env.APP_NAME.replace(/"/g, "&quot;");
      body = body.replace(
        /<meta name="apple-mobile-web-app-title" content=".*?"\s*\/?>/,
        `<meta name="apple-mobile-web-app-title" content="${metaAppName}" />`
      );
    }
    return originalSend.call(this, body);
  };
  next();
});

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

// Request password reset endpoint (public)
app.post(
  "/api/password/reset-request",
  asyncHandler(async (req, res) => {
    const { email }: RequestPasswordResetInput = req.body;

    if (!email) {
      throw new AppError("Email is required", ErrorType.BAD_REQUEST);
    }

    // Generate reset token
    const { token } = await requestPasswordReset({ email });

    // Only send email if token was generated (user exists)
    if (token) {
      // Get base URL from environment or construct from request
      const appUrl =
        env.APP_URL || `${req.protocol}://${req.get("host") || `localhost:${env.PORT}`}`;

      // Send password reset email
      await sendPasswordResetEmail(email, token, appUrl);
    }

    // Always return success (don't reveal if user exists)
    return res.json({
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  })
);

// Reset password endpoint (public)
app.post(
  "/api/password/reset",
  asyncHandler(async (req, res) => {
    const { token, newPassword }: ResetPasswordInput = req.body;

    if (!token || !newPassword) {
      throw new AppError("Token and new password are required", ErrorType.BAD_REQUEST);
    }

    // Reset the password
    await resetPassword({ token, newPassword });

    return res.json({
      message: "Password has been reset successfully. You can now log in with your new password.",
    });
  })
);

// Get all users endpoint (protected by JWT - admin only)
app.get(
  "/api/users",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    // authenticateToken middleware ensures req.user exists
    const users = await getAllUsers();

    return res.json({ users });
  })
);

// Get all invites endpoint (protected by JWT - admin only)
app.get(
  "/api/invites",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    // authenticateToken middleware ensures req.user exists
    const invites = await getAllInvites();

    return res.json({ invites });
  })
);

// Resend invite endpoint (protected by JWT - admin only)
app.post(
  "/api/invites/:id/resend",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    // authenticateToken middleware ensures req.user exists
    const inviteId = parseInt(req.params.id, 10);

    if (isNaN(inviteId)) {
      throw new AppError("Invalid invite ID", ErrorType.BAD_REQUEST);
    }

    // Resend the invite (updates token and expiry)
    const { token } = await resendInvite(inviteId);

    // Get the invite to get the email
    const invites = await getAllInvites();
    const invite = invites.find((inv) => inv.id === inviteId);

    if (!invite) {
      throw new AppError("Invite not found after resend", ErrorType.NOT_FOUND);
    }

    // Get base URL from environment or construct from request
    const appUrl = env.APP_URL || `${req.protocol}://${req.get("host") || `localhost:${env.PORT}`}`;

    // Send invite email with new token
    await sendInviteEmail(invite.email, token, appUrl);

    return res.json({
      message: "Invite resent successfully",
    });
  })
);

// Create invite endpoint (protected by JWT - admin only)
app.post(
  "/api/users/invite",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    // authenticateToken middleware ensures req.user exists
    const { email }: CreateInviteInput = req.body;

    if (!email) {
      throw new AppError("Email is required", ErrorType.BAD_REQUEST);
    }

    // Create the invite
    const { token } = await createInvite({ email });

    // Get base URL from environment or construct from request
    const appUrl = env.APP_URL || `${req.protocol}://${req.get("host") || `localhost:${env.PORT}`}`;

    // Send invite email
    await sendInviteEmail(email, token, appUrl);

    return res.json({
      message: "Invite sent successfully",
    });
  })
);

// Validate invite endpoint (public)
app.get(
  "/api/invite/:token",
  asyncHandler(async (req, res) => {
    const { token } = req.params;

    if (!token) {
      throw new AppError("Invite token is required", ErrorType.BAD_REQUEST);
    }

    // Validate invite and get email
    const { email } = await validateInvite(token);

    return res.json({
      email,
      valid: true,
    });
  })
);

// Accept invite endpoint (public)
app.post(
  "/api/invite/:token/accept",
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { name, password }: Omit<AcceptInviteInput, "token"> = req.body;

    if (!token) {
      throw new AppError("Invite token is required", ErrorType.BAD_REQUEST);
    }

    if (!name || !password) {
      throw new AppError("Name and password are required", ErrorType.BAD_REQUEST);
    }

    // Accept invite and create user
    const newUser = await acceptInvite({ token, name, password });

    // Generate JWT token for automatic login
    const jwtToken = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      env.JWT_SECRET
    );

    return res.json({
      message: "Account created successfully",
      token: jwtToken,
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
    const thumbnailPath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "thumbnails",
      thumbnailFilename
    );
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
        throw new AppError(
          "Each item must have id and displayOrder as numbers",
          ErrorType.BAD_REQUEST
        );
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
