import { useState, useCallback, useEffect, useRef } from "react";
import type { Image } from "../../server/db/schema.js";

interface UseImageTransitionReturn {
  localCurrentImageId: number | null;
  previousImageId: number | null;
  isTransitioning: boolean;
  transitionDirection: "left" | "right";
  localImages: Image[];
  getImageById: (imageId: number | null) => Image | null;
}

/**
 * Hook to manage image transition state and animations
 */
export function useImageTransition(
  images: Image[],
  currentImageId: number | null
): UseImageTransitionReturn {
  const [localImages, setLocalImages] = useState<Image[]>(images);
  const [localCurrentImageId, setLocalCurrentImageId] = useState<number | null>(currentImageId);
  const [previousImageId, setPreviousImageId] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<"left" | "right">("right");
  const transitionTimeoutRef = useRef<number | null>(null);

  // Image index helpers
  const getImageIndex = useCallback(
    (imageId: number | null): number => {
      if (imageId === null) return -1;
      return localImages.findIndex((img) => img.id === imageId);
    },
    [localImages]
  );

  const getImageById = useCallback(
    (imageId: number | null): Image | null => {
      if (imageId === null) return null;
      return localImages.find((img) => img.id === imageId) || null;
    },
    [localImages]
  );

  // Calculate transition direction based on current and new indices
  const calculateTransitionDirection = useCallback(
    (currentIndex: number, newIndex: number): "left" | "right" => {
      if (currentIndex === -1) return "right";

      const diff = newIndex - currentIndex;
      const halfLength = localImages.length / 2;

      // Handle wrapping: determine shortest path
      if (diff > 0 && diff < halfLength) {
        return "left";
      } else if (diff < 0 && Math.abs(diff) < halfLength) {
        return "right";
      } else if (diff > halfLength) {
        return "right";
      } else {
        return "left";
      }
    },
    [localImages.length]
  );

  // Start a transition to a new image
  const startTransition = useCallback(
    (newImageId: number, direction: "left" | "right") => {
      setTransitionDirection(direction);
      setPreviousImageId(localCurrentImageId);
      setIsTransitioning(true);
      setLocalCurrentImageId(newImageId);

      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      // End transition after animation completes
      transitionTimeoutRef.current = window.setTimeout(() => {
        setIsTransitioning(false);
        setPreviousImageId(null);
        transitionTimeoutRef.current = null;
      }, 600);
    },
    [localCurrentImageId]
  );

  // Sync local state with props
  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  useEffect(() => {
    const newImageId = currentImageId;
    if (newImageId !== localCurrentImageId && newImageId !== null) {
      const currentIndex = getImageIndex(localCurrentImageId);
      const newIndex = getImageIndex(newImageId);
      const direction = calculateTransitionDirection(currentIndex, newIndex);
      startTransition(newImageId, direction);
    } else if (newImageId !== localCurrentImageId) {
      setLocalCurrentImageId(newImageId);
      setPreviousImageId(null);
    }
  }, [currentImageId, localCurrentImageId, getImageIndex, calculateTransitionDirection, startTransition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, []);

  // Preload all images for smooth transitions
  useEffect(() => {
    if (localImages.length === 0) return;

    // Preload images using Image constructor
    const preloadImage = (imagePath: string) => {
      const img = new window.Image();
      img.src = imagePath;
    };

    // Preload all images
    localImages.forEach((image) => {
      preloadImage(image.path);
    });
  }, [localImages]);

  return {
    localCurrentImageId,
    previousImageId,
    isTransitioning,
    transitionDirection,
    localImages,
    getImageById,
  };
}

