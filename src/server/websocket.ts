import { WebSocketServer, WebSocket } from "ws";
import { getAllImages, updateImageSortOrder } from "./images.js";
import { Image } from "./db/schema.js";
import { getSlideDuration, setSlideDuration, getSlideshowState, setSlideshowState } from "./settings.js";

interface ClientWebSocket extends WebSocket {
  isAlive?: boolean;
}

type MessageType = 
  | { type: "images"; images: Image[] }
  | { type: "error"; message: string }
  | { type: "reorder"; imageOrders: Array<{ id: number; displayOrder: number }> }
  | { type: "slideshow-state"; currentImageId: number | null; isPlaying: boolean }
  | { type: "slideshow-next" }
  | { type: "slideshow-previous" }
  | { type: "slideshow-play" }
  | { type: "slideshow-pause" }
  | { type: "slideshow-goto"; imageId: number }
  | { type: "slideshow-speed"; speedSeconds: number };

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

  constructor(server: any) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    
    // Load slide duration and slideshow state from database
    this.initializeSlideDuration();
    this.initializeSlideshowState();

    this.wss.on("connection", async (ws: ClientWebSocket) => {
      this.clients.add(ws);
      ws.isAlive = true;

      // Send current image list and slideshow state to newly connected client
      try {
        const images = await getAllImages();
        this.sendToClient(ws, { type: "images", images });
        this.sendToClient(ws, {
          type: "slideshow-state",
          currentImageId: this.slideshowState.currentImageId,
          isPlaying: this.slideshowState.isPlaying,
        });
        // Send current slideshow speed
        this.sendToClient(ws, {
          type: "slideshow-speed",
          speedSeconds: this.slideDuration / 1000,
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
          const message = JSON.parse(data.toString()) as MessageType;

          // Handle reorder request
          if (message.type === "reorder") {
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
            return;
          }

          // Handle slideshow control messages
          if (message.type === "slideshow-next") {
            const images = await getAllImages();
            if (images.length > 0) {
              const currentIndex = this.slideshowState.currentImageId
                ? images.findIndex(img => img.id === this.slideshowState.currentImageId)
                : -1;
              
              if (currentIndex >= 0) {
                // Move to next image
                const nextIndex = (currentIndex + 1) % images.length;
                this.slideshowState.currentImageId = images[nextIndex].id;
              } else if (images.length > 0) {
                // If current image not found, start at first image
                this.slideshowState.currentImageId = images[0].id;
              }
              await this.saveSlideshowState();
              this.broadcastSlideshowState();
            }
            return;
          }

          if (message.type === "slideshow-previous") {
            const images = await getAllImages();
            if (images.length > 0) {
              const currentIndex = this.slideshowState.currentImageId
                ? images.findIndex(img => img.id === this.slideshowState.currentImageId)
                : -1;
              
              if (currentIndex >= 0) {
                // Move to previous image
                const prevIndex = (currentIndex - 1 + images.length) % images.length;
                this.slideshowState.currentImageId = images[prevIndex].id;
              } else if (images.length > 0) {
                // If current image not found, start at last image
                this.slideshowState.currentImageId = images[images.length - 1].id;
              }
              await this.saveSlideshowState();
              this.broadcastSlideshowState();
            }
            return;
          }

          if (message.type === "slideshow-play") {
            const images = await getAllImages();
            // If no current image set, start at first image
            if (!this.slideshowState.currentImageId && images.length > 0) {
              this.slideshowState.currentImageId = images[0].id;
            }
            this.slideshowState.isPlaying = true;
            this.startAutoPlay();
            await this.saveSlideshowState();
            this.broadcastSlideshowState();
            return;
          }

          if (message.type === "slideshow-pause") {
            this.slideshowState.isPlaying = false;
            this.stopAutoPlay();
            await this.saveSlideshowState();
            this.broadcastSlideshowState();
            return;
          }

          if (message.type === "slideshow-goto") {
            const images = await getAllImages();
            // Verify the imageId exists in the current image list
            if (images.some(img => img.id === message.imageId)) {
              this.slideshowState.currentImageId = message.imageId;
              await this.saveSlideshowState();
              this.broadcastSlideshowState();
            }
            return;
          }

          if (message.type === "slideshow-speed") {
            // Update slide duration (convert seconds to milliseconds)
            const newDuration = message.speedSeconds * 1000;
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
            return;
          }
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
        ? images.findIndex(img => img.id === this.slideshowState.currentImageId)
        : -1;
      
      if (currentIndex >= 0) {
        // Move to next image
        const nextIndex = (currentIndex + 1) % images.length;
        this.slideshowState.currentImageId = images[nextIndex].id;
      } else if (images.length > 0) {
        // If current image not found, start at first image
        this.slideshowState.currentImageId = images[0].id;
      }
      await this.saveSlideshowState();
      this.broadcastSlideshowState();
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
   * Broadcasts the current image list to all authenticated clients
   */
  async broadcastImages(): Promise<void> {
    try {
      const images = await getAllImages();
      
      // Verify current image still exists, if not, reset to first image or null
      if (this.slideshowState.currentImageId) {
        const imageExists = images.some(img => img.id === this.slideshowState.currentImageId);
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
      
      const message = JSON.stringify({ type: "images", images });
      
      this.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
      
      // Also broadcast updated slideshow state
      this.broadcastSlideshowState();
    } catch (error) {
      console.error("Error broadcasting images:", error);
    }
  }

  /**
   * Broadcasts the current slideshow state to all authenticated clients
   */
  private broadcastSlideshowState(): void {
    const message = JSON.stringify({
      type: "slideshow-state",
      currentImageId: this.slideshowState.currentImageId,
      isPlaying: this.slideshowState.isPlaying,
    });
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Broadcasts the current slideshow speed to all authenticated clients
   */
  private broadcastSlideshowSpeed(): void {
    const message = JSON.stringify({
      type: "slideshow-speed",
      speedSeconds: this.slideDuration / 1000,
    });
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Sends a message to a specific client
   */
  private sendToClient(ws: ClientWebSocket, message: MessageType): void {
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
      
      console.log(`Loaded slideshow state from database: currentImageId=${state.currentImageId}, isPlaying=${state.isPlaying}`);
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
   * Closes the WebSocket server
   */
  close(): void {
    this.wss.close();
  }
}

