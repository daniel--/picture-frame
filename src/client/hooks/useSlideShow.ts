import { useEffect, useState, useCallback } from "react";
import useWebSocketHook from "react-use-websocket";
import { Image } from "../../server/db/schema.js";
import { api } from "../api.js";
import { WebSocketMessage } from "../../shared/websocket-types.js";
import { useAuth } from "./useAuth.js";

export function useSlideShow() {
  const { token } = useAuth();
  const [images, setImages] = useState<Image[]>([]);
  const [currentImageId, setCurrentImageId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number | null>(null);
  const [randomOrder, setRandomOrder] = useState<boolean | null>(null);

  // Determine WebSocket URL
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const wsUrl = token
    ? `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`
    : `${protocol}//${host}/ws`;

  const { sendMessage, lastMessage, readyState } = useWebSocketHook(wsUrl, {
    shouldReconnect: (closeEvent: CloseEvent) => {
      // Reconnect unless it was a normal closure
      return closeEvent.code !== 1000;
    },
    reconnectInterval: 3000,
    reconnectAttempts: Infinity,
  });

  // Handle incoming messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const message: WebSocketMessage = JSON.parse(lastMessage.data);

        if (message.type === "images") {
          setImages(message.images);
        } else if (message.type === "slideshow-current-image") {
          setCurrentImageId(message.currentImageId);
        } else if (message.type === "slideshow-is-playing") {
          setIsPlaying(message.isPlaying);
        } else if (message.type === "slideshow-speed") {
          setSpeed(message.speedSeconds);
        } else if (message.type === "slideshow-random-order") {
          setRandomOrder(message.randomOrder);
        } else if (message.type === "error") {
          console.error("WebSocket error:", message.message);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    }
  }, [lastMessage]);

  // Helper to send JSON messages
  const sendJsonMessage = useCallback(
    (message: object) => {
      sendMessage(JSON.stringify(message));
    },
    [sendMessage]
  );

  const reorderImages = useCallback(
    (imageOrders: Array<{ id: number; displayOrder: number }>) => {
      sendJsonMessage({
        type: "reorder",
        imageOrders,
      });
    },
    [sendJsonMessage]
  );

  const next = useCallback(() => {
    sendJsonMessage({ type: "slideshow-next" });
  }, [sendJsonMessage]);

  const previous = useCallback(() => {
    sendJsonMessage({ type: "slideshow-previous" });
  }, [sendJsonMessage]);

  const play = useCallback(() => {
    sendJsonMessage({ type: "slideshow-play" });
  }, [sendJsonMessage]);

  const pause = useCallback(() => {
    sendJsonMessage({ type: "slideshow-pause" });
  }, [sendJsonMessage]);

  const goto = useCallback(
    (imageId: number) => {
      sendJsonMessage({ type: "slideshow-goto", imageId });
    },
    [sendJsonMessage]
  );

  const updateSpeed = useCallback(
    (speedSeconds: number) => {
      sendJsonMessage({ type: "slideshow-speed", speedSeconds });
    },
    [sendJsonMessage]
  );

  const updateRandomOrder = useCallback(
    (randomOrder: boolean) => {
      sendJsonMessage({ type: "slideshow-random-order", randomOrder });
    },
    [sendJsonMessage]
  );

  const deleteImage = useCallback(async (imageId: number) => {
    try {
      await api(`/api/images/${imageId}`, { method: "DELETE" });
      // The WebSocket will automatically update the image list
    } catch (error) {
      console.error("Failed to delete image:", error);
      throw error;
    }
  }, []);

  // Map readyState to connected boolean
  // ReadyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
  const connected = readyState === 1;

  const currentImage = currentImageId
    ? images.find((img) => img.id === currentImageId) || null
    : images.length > 0
      ? images[0] // Default to first image if no current image set
      : null;

  return {
    images,
    currentImage,
    currentImageId,
    isPlaying,
    connected,
    speed,
    randomOrder,
    reorderImages,
    next,
    previous,
    play,
    pause,
    goto,
    deleteImage,
    updateSpeed,
    updateRandomOrder,
  };
}
