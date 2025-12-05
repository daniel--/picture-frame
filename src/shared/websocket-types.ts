import { Image } from "../server/db/schema.js";

/**
 * Shared WebSocket message types for client-server communication
 */
export type WebSocketMessage =
  | { type: "images"; images: Image[] }
  | { type: "error"; message: string }
  | { type: "reorder"; imageOrders: Array<{ id: number; displayOrder: number }> }
  | { type: "slideshow-current-image"; currentImageId: number | null }
  | { type: "slideshow-is-playing"; isPlaying: boolean }
  | { type: "slideshow-next" }
  | { type: "slideshow-previous" }
  | { type: "slideshow-play" }
  | { type: "slideshow-pause" }
  | { type: "slideshow-goto"; imageId: number }
  | { type: "slideshow-speed"; speedSeconds: number }
  | { type: "slideshow-random-order"; randomOrder: boolean };
