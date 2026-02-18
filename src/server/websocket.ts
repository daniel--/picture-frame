import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { getAllImages, updateImageSortOrder } from "./images.js";
import { Image } from "./db/schema.js";
import { env } from "./env.js";
import {
  getSlideDuration,
  setSlideDuration,
  getSlideshowState,
  setSlideshowState,
  getRandomOrder,
  setRandomOrder,
} from "./settings.js";
import { WebSocketMessage } from "../shared/websocket-types.js";

interface ClientWebSocket extends WebSocket {
  isAlive?: boolean;
  isAuthenticated?: boolean;
}

// Message types that require authentication
const AUTHENTICATED_MESSAGE_TYPES = new Set(["reorder"]);

/**
 * WebSocket server for real-time image synchronization
 */
interface SlideshowState {
  currentImageId: number | null;
  isPlaying: boolean;
}

export class ImageWebSocketServer {
  private wss: WebSocketServer;
  private clients: Set<ClientWebSocket> = new Set();
  private slideshowState: SlideshowState = {
    currentImageId: null,
    isPlaying: false,
  };
  private autoPlayInterval: NodeJS.Timeout | null = null;
  private slideDuration = 5000; // 5 seconds per slide (will be loaded from DB)
  private randomOrder = false; // Random order setting (will be loaded from DB)

  /**
   * Map of message types to their handler functions
   */
  private messageHandlers: {
    [K in WebSocketMessage["type"]]?: (
      ws: ClientWebSocket,
      message: Extract<WebSocketMessage, { type: K }>
    ) => Promise<void>;
  } = {
    reorder: async (ws, message) => await this.handleReorderMessage(ws, message),
    "slideshow-next": async () => await this.handleSlideshowNext(),
    "slideshow-previous": async () => await this.handleSlideshowPrevious(),
    "slideshow-play": async () => await this.handleSlideshowPlay(),
    "slideshow-pause": async () => await this.handleSlideshowPause(),
    "slideshow-goto": async (ws, message) => await this.handleSlideshowGoto(message.imageId),
    "slideshow-speed": async (ws, message) => await this.handleSlideshowSpeed(message.speedSeconds),
    "slideshow-random-order": async (ws, message) =>
      await this.handleSlideshowRandomOrder(message.randomOrder),
  };

  constructor(server: any) {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    // Load slide duration, slideshow state, and random order setting from database
    this.initializeSlideDuration();
    this.initializeSlideshowState();
    this.initializeRandomOrder();

    this.wss.on("connection", async (ws: ClientWebSocket, req: IncomingMessage) => {
      this.clients.add(ws);
      ws.isAlive = true;

      // Validate token from query string
      const url = new URL(req.url ?? "/", "http://localhost");
      const token = url.searchParams.get("token");
      ws.isAuthenticated = false;
      if (token) {
        try {
          jwt.verify(token, env.JWT_SECRET);
          ws.isAuthenticated = true;
        } catch {
          // Invalid or expired token — connection allowed for read-only slideshow access
        }
      }

      // Send current image list and slideshow state to newly connected client
      try {
        const images = await getAllImages();
        this.sendToClient(ws, { type: "images", images });
        this.sendToClient(ws, {
          type: "slideshow-current-image",
          currentImageId: this.slideshowState.currentImageId,
        });
        this.sendToClient(ws, {
          type: "slideshow-is-playing",
          isPlaying: this.slideshowState.isPlaying,
        });
        // Send current slideshow speed
        this.sendToClient(ws, {
          type: "slideshow-speed",
          speedSeconds: this.slideDuration / 1000,
        });
        // Send current random order setting
        this.sendToClient(ws, {
          type: "slideshow-random-order",
          randomOrder: this.randomOrder,
        });
      } catch (error) {
        console.error("Error sending initial state to client:", error);
      }

      // Handle pong for keepalive
      ws.on("pong", () => {
        ws.isAlive = true;
      });

      // Handle incoming messages
      ws.on("message", async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          await this.handleMessage(ws, message);
        } catch (error: any) {
          console.error("WebSocket message error:", error);
          this.sendToClient(ws, {
            type: "error",
            message: "Invalid message format",
          });
        }
      });

      // Handle client disconnect
      ws.on("close", () => {
        this.clients.delete(ws);
      });

      // Handle errors
      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        // Don't delete from clients here - let the close handler do it
      });
    });

    // Keepalive ping interval
    const interval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          if (!ws.isAlive) {
            console.log("Terminating inactive WebSocket connection");
            ws.terminate();
            this.clients.delete(ws);
            return;
          }
          ws.isAlive = false;
          ws.ping();
        }
      });
    }, 30000);

    this.wss.on("close", () => {
      clearInterval(interval);
    });
  }

  /**
   * Main message handler that delegates to specific handlers
   */
  private async handleMessage(ws: ClientWebSocket, message: WebSocketMessage): Promise<void> {
    if (AUTHENTICATED_MESSAGE_TYPES.has(message.type) && !ws.isAuthenticated) {
      this.sendToClient(ws, { type: "error", message: "Authentication required" });
      return;
    }

    const handler = this.messageHandlers[message.type];

    if (handler) {
      await handler(ws, message as any);
    } else {
      console.warn(`No handler registered for message type: ${message.type}`);
    }
  }

  /**
   * Handles image reorder requests
   */
  private async handleReorderMessage(
    ws: ClientWebSocket,
    message: { type: "reorder"; imageOrders: Array<{ id: number; displayOrder: number }> }
  ): Promise<void> {
    try {
      await updateImageSortOrder(message.imageOrders);
      // Broadcast updated list to all clients
      await this.broadcastImages();
    } catch (error: any) {
      this.sendToClient(ws, {
        type: "error",
        message: error.message || "Failed to update sort order",
      });
    }
  }

  /**
   * Navigates to a specific image or direction in the slideshow
   * @param target Either 'next', 'previous', or a specific image ID
   */
  private async navigateToImage(target: "next" | "previous" | number): Promise<void> {
    const images = await getAllImages();
    if (images.length === 0) {
      return;
    }

    let newImageId: number | null = null;

    if (typeof target === "number") {
      // Navigate to specific image ID
      if (images.some((img) => img.id === target)) {
        newImageId = target;
      }
    } else {
      // Navigate next or previous
      const currentIndex = this.slideshowState.currentImageId
        ? images.findIndex((img) => img.id === this.slideshowState.currentImageId)
        : -1;

      if (currentIndex >= 0) {
        // Move to next or previous image
        const newIndex =
          target === "next"
            ? (currentIndex + 1) % images.length
            : (currentIndex - 1 + images.length) % images.length;
        newImageId = images[newIndex].id;
      } else {
        // If current image not found, start at first (next) or last (previous) image
        newImageId = target === "next" ? images[0].id : images[images.length - 1].id;
      }
    }

    // Only update if we found a valid image
    if (newImageId !== null) {
      this.slideshowState.currentImageId = newImageId;
      await this.saveSlideshowState();
      this.broadcastCurrentImage();
    }
  }

  /**
   * Handles slideshow next requests
   */
  private async handleSlideshowNext(): Promise<void> {
    await this.navigateToImage("next");
  }

  /**
   * Handles slideshow previous requests
   */
  private async handleSlideshowPrevious(): Promise<void> {
    await this.navigateToImage("previous");
  }

  /**
   * Handles slideshow play requests
   */
  private async handleSlideshowPlay(): Promise<void> {
    const images = await getAllImages();
    // If no current image set, start at first image
    if (!this.slideshowState.currentImageId && images.length > 0) {
      this.slideshowState.currentImageId = images[0].id;
      this.broadcastCurrentImage();
    }
    this.slideshowState.isPlaying = true;
    this.startAutoPlay();
    await this.saveSlideshowState();
    this.broadcastIsPlaying();
  }

  /**
   * Handles slideshow pause requests
   */
  private async handleSlideshowPause(): Promise<void> {
    this.slideshowState.isPlaying = false;
    this.stopAutoPlay();
    await this.saveSlideshowState();
    this.broadcastIsPlaying();
  }

  /**
   * Handles slideshow goto requests
   */
  private async handleSlideshowGoto(imageId: number): Promise<void> {
    await this.navigateToImage(imageId);
  }

  /**
   * Handles slideshow speed change requests
   */
  private async handleSlideshowSpeed(speedSeconds: number): Promise<void> {
    // Update slide duration (convert seconds to milliseconds)
    const newDuration = speedSeconds * 1000;
    // Validate: 1 second to 1 day (86400 seconds)
    if (newDuration > 0 && newDuration <= 86400000) {
      this.slideDuration = newDuration;
      // Save to database
      setSlideDuration(newDuration).catch((error) => {
        console.error("Failed to save slide duration to database:", error);
      });
      // If currently playing, restart the interval with new speed
      if (this.slideshowState.isPlaying) {
        this.startAutoPlay();
      }
      // Broadcast the speed change to all clients
      this.broadcastSlideshowSpeed();
    }
  }

  /**
   * Handles slideshow random order change requests
   */
  private async handleSlideshowRandomOrder(randomOrder: boolean): Promise<void> {
    // Update random order setting
    this.randomOrder = randomOrder;
    // Save to database
    setRandomOrder(randomOrder).catch((error) => {
      console.error("Failed to save random order setting to database:", error);
    });
    // Broadcast the random order change to all clients
    this.broadcastRandomOrder();
  }

  /**
   * Starts the auto-play interval that advances slides automatically
   */
  private startAutoPlay(): void {
    // Clear any existing interval
    this.stopAutoPlay();

    // Only start if we have images and we're playing
    if (!this.slideshowState.isPlaying) {
      return;
    }

    this.autoPlayInterval = setInterval(async () => {
      // Only advance if still playing
      if (!this.slideshowState.isPlaying) {
        this.stopAutoPlay();
        return;
      }

      const images = await getAllImages();
      if (images.length === 0) {
        this.stopAutoPlay();
        return;
      }

      const currentIndex = this.slideshowState.currentImageId
        ? images.findIndex((img) => img.id === this.slideshowState.currentImageId)
        : -1;

      if (currentIndex >= 0) {
        // Move to next image - use random selection if enabled, otherwise sequential
        if (this.randomOrder) {
          // Random selection: pick a random image that's not the current one
          const availableImages = images.filter(
            (img) => img.id !== this.slideshowState.currentImageId
          );
          if (availableImages.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableImages.length);
            this.slideshowState.currentImageId = availableImages[randomIndex].id;
          } else {
            // Only one image, so just keep it
            this.slideshowState.currentImageId = images[0].id;
          }
        } else {
          // Sequential selection
          const nextIndex = (currentIndex + 1) % images.length;
          this.slideshowState.currentImageId = images[nextIndex].id;
        }
      } else if (images.length > 0) {
        // If current image not found, pick based on random order setting
        if (this.randomOrder) {
          // Pick a random image
          const randomIndex = Math.floor(Math.random() * images.length);
          this.slideshowState.currentImageId = images[randomIndex].id;
        } else {
          // Start at first image
          this.slideshowState.currentImageId = images[0].id;
        }
      }
      await this.saveSlideshowState();
      this.broadcastCurrentImage();
    }, this.slideDuration);
  }

  /**
   * Stops the auto-play interval
   */
  private stopAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  /**
   * Generic method to broadcast a message to all connected clients
   */
  private broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Broadcasts the current image list to all authenticated clients
   */
  async broadcastImages(): Promise<void> {
    try {
      const images = await getAllImages();

      // Verify current image still exists, if not, reset to first image or null
      if (this.slideshowState.currentImageId) {
        const imageExists = images.some((img) => img.id === this.slideshowState.currentImageId);
        if (!imageExists) {
          // Current image was deleted, reset to first image if available
          if (images.length > 0) {
            this.slideshowState.currentImageId = images[0].id;
          } else {
            this.slideshowState.currentImageId = null;
            this.slideshowState.isPlaying = false;
            this.stopAutoPlay();
          }
          await this.saveSlideshowState();
        }
      } else if (images.length > 0 && this.slideshowState.isPlaying) {
        // If playing but no current image, start at first
        this.slideshowState.currentImageId = images[0].id;
        await this.saveSlideshowState();
      }

      this.broadcast({ type: "images", images });

      // Also broadcast updated slideshow state
      this.broadcastCurrentImage();
      this.broadcastIsPlaying();
    } catch (error) {
      console.error("Error broadcasting images:", error);
    }
  }

  /**
   * Broadcasts the current image to all authenticated clients
   */
  private broadcastCurrentImage(): void {
    this.broadcast({
      type: "slideshow-current-image",
      currentImageId: this.slideshowState.currentImageId,
    });
  }

  /**
   * Broadcasts the playing state to all authenticated clients
   */
  private broadcastIsPlaying(): void {
    this.broadcast({
      type: "slideshow-is-playing",
      isPlaying: this.slideshowState.isPlaying,
    });
  }

  /**
   * Broadcasts the current slideshow speed to all authenticated clients
   */
  private broadcastSlideshowSpeed(): void {
    this.broadcast({
      type: "slideshow-speed",
      speedSeconds: this.slideDuration / 1000,
    });
  }

  /**
   * Broadcasts the current random order setting to all authenticated clients
   */
  private broadcastRandomOrder(): void {
    this.broadcast({
      type: "slideshow-random-order",
      randomOrder: this.randomOrder,
    });
  }

  /**
   * Sends a message to a specific client
   */
  private sendToClient(ws: ClientWebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Initializes the slide duration from the database
   */
  private async initializeSlideDuration(): Promise<void> {
    try {
      const duration = await getSlideDuration();
      this.slideDuration = duration;
      console.log(`Loaded slide duration from database: ${duration}ms (${duration / 1000}s)`);
    } catch (error) {
      console.error("Error loading slide duration from database:", error);
      // Keep default value (5000ms)
    }
  }

  /**
   * Initializes the slideshow state from the database
   */
  private async initializeSlideshowState(): Promise<void> {
    try {
      const state = await getSlideshowState();
      this.slideshowState.currentImageId = state.currentImageId;
      this.slideshowState.isPlaying = state.isPlaying;

      // If playing, start the auto-play interval
      if (state.isPlaying) {
        this.startAutoPlay();
      }

      console.log(
        `Loaded slideshow state from database: currentImageId=${state.currentImageId}, isPlaying=${state.isPlaying}`
      );
    } catch (error) {
      console.error("Error loading slideshow state from database:", error);
      // Keep default state
    }
  }

  /**
   * Saves the current slideshow state to the database
   */
  private async saveSlideshowState(): Promise<void> {
    try {
      await setSlideshowState({
        currentImageId: this.slideshowState.currentImageId,
        isPlaying: this.slideshowState.isPlaying,
      });
    } catch (error) {
      console.error("Error saving slideshow state to database:", error);
      // Don't throw - we don't want to break the slideshow if DB save fails
    }
  }

  /**
   * Initializes the random order setting from the database
   */
  private async initializeRandomOrder(): Promise<void> {
    try {
      const randomOrder = await getRandomOrder();
      this.randomOrder = randomOrder;
    } catch (error) {
      console.error("Error loading random order setting from database:", error);
      // Keep default value (false)
    }
  }

  /**
   * Reloads the random order setting from the database
   * Called when the setting is updated via API
   */
  async reloadRandomOrderSetting(): Promise<void> {
    await this.initializeRandomOrder();
  }

  /**
   * Closes the WebSocket server
   */
  close(): void {
    this.wss.close();
  }
}
