import { useEffect, useState, useCallback } from "react";
import useWebSocketHook from "react-use-websocket";
import { Image } from "../server/db/schema";

type Message = 
  | { type: "images"; images: Image[] }
  | { type: "error"; message: string }
  | { type: "slideshow-state"; currentImageId: number | null; isPlaying: boolean };

export function useWebSocket() {
  const [images, setImages] = useState<Image[]>([]);
  const [slideshowState, setSlideshowState] = useState<{ currentImageId: number | null; isPlaying: boolean }>({
    currentImageId: null,
    isPlaying: false,
  });

  // Determine WebSocket URL
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/ws`;

  const {
    sendMessage,
    lastMessage,
    readyState,
  } = useWebSocketHook(wsUrl, {
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
        const message: Message = JSON.parse(lastMessage.data);
        
        if (message.type === "images") {
          setImages(message.images);
        } else if (message.type === "slideshow-state") {
          setSlideshowState({
            currentImageId: message.currentImageId,
            isPlaying: message.isPlaying,
          });
        } else if (message.type === "error") {
          console.error("WebSocket error:", message.message);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    }
  }, [lastMessage]);

  // Helper to send JSON messages
  const sendJsonMessage = useCallback((message: object) => {
    sendMessage(JSON.stringify(message));
  }, [sendMessage]);

  const reorderImages = useCallback((imageOrders: Array<{ id: number; displayOrder: number }>) => {
    sendJsonMessage({
      type: "reorder",
      imageOrders,
    });
  }, [sendJsonMessage]);

  const slideshowNext = useCallback(() => {
    sendJsonMessage({ type: "slideshow-next" });
  }, [sendJsonMessage]);

  const slideshowPrevious = useCallback(() => {
    sendJsonMessage({ type: "slideshow-previous" });
  }, [sendJsonMessage]);

  const slideshowPlay = useCallback(() => {
    sendJsonMessage({ type: "slideshow-play" });
  }, [sendJsonMessage]);

  const slideshowPause = useCallback(() => {
    sendJsonMessage({ type: "slideshow-pause" });
  }, [sendJsonMessage]);

  const slideshowGoto = useCallback((imageId: number) => {
    sendJsonMessage({ type: "slideshow-goto", imageId });
  }, [sendJsonMessage]);

  // Map readyState to connected boolean
  // ReadyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
  const connected = readyState === 1;

  return {
    images,
    connected,
    error: null, // react-use-websocket handles errors internally
    reorderImages,
    slideshowState,
    slideshowNext,
    slideshowPrevious,
    slideshowPlay,
    slideshowPause,
    slideshowGoto,
  };
}

