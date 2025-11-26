import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDrag } from "@use-gesture/react";
import { useSlideShow } from "./hooks/useSlideShow";
import { Image } from "../server/db/schema.js";
import "./App.css";
import "./Slideshow.css";

function Slideshow() {
  const navigate = useNavigate();
  const {
    images,
    slideshowState,
    slideshowNext,
    slideshowPrevious,
    slideshowPlay,
    slideshowPause,
  } = useSlideShow();

  // Local copy for optimistic updates
  const [localImages, setLocalImages] = useState<Image[]>(images);
  const [localCurrentImageId, setLocalCurrentImageId] = useState<number | null>(
    slideshowState.currentImageId
  );
  const [previousImageId, setPreviousImageId] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');
  const transitionTimeoutRef = useRef<number | null>(null);

  // Image index helpers
  const getImageIndex = useCallback((imageId: number | null): number => {
    if (imageId === null) return -1;
    return localImages.findIndex((img) => img.id === imageId);
  }, [localImages]);

  const getImageById = useCallback((imageId: number | null): Image | null => {
    if (imageId === null) return null;
    return localImages.find((img) => img.id === imageId) || null;
  }, [localImages]);

  // Calculate transition direction based on current and new indices
  const calculateTransitionDirection = useCallback((
    currentIndex: number,
    newIndex: number
  ): 'left' | 'right' => {
    if (currentIndex === -1) return 'right';
    
    const diff = newIndex - currentIndex;
    const halfLength = localImages.length / 2;
    
    // Handle wrapping: determine shortest path
    if (diff > 0 && diff < halfLength) {
      return 'left';
    } else if (diff < 0 && Math.abs(diff) < halfLength) {
      return 'right';
    } else if (diff > halfLength) {
      return 'right';
    } else {
      return 'left';
    }
  }, [localImages.length]);

  // Start a transition to a new image
  const startTransition = useCallback((
    newImageId: number,
    direction: 'left' | 'right'
  ) => {
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
  }, [localCurrentImageId]);

  // Sync local state with props
  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  useEffect(() => {
    const newImageId = slideshowState.currentImageId;
    if (newImageId !== localCurrentImageId && newImageId !== null) {
      const currentIndex = getImageIndex(localCurrentImageId);
      const newIndex = getImageIndex(newImageId);
      const direction = calculateTransitionDirection(currentIndex, newIndex);
      startTransition(newImageId, direction);
    } else if (newImageId !== localCurrentImageId) {
      setLocalCurrentImageId(newImageId);
      setPreviousImageId(null);
    }
  }, [slideshowState.currentImageId, localCurrentImageId, getImageIndex, calculateTransitionDirection, startTransition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, []);

  // Compute current image from local state
  const localCurrentImage = localCurrentImageId
    ? getImageById(localCurrentImageId)
    : localImages.length > 0
    ? localImages[0]
    : null;

  const previousImage = getImageById(previousImageId);

  // Optimistic navigation handlers
  const handleNext = useCallback(() => {
    if (localImages.length === 0 || isTransitioning) return;
    
    const currentIndex = getImageIndex(localCurrentImageId);
    const nextIndex = (currentIndex + 1) % localImages.length;
    const nextImageId = localImages[nextIndex].id;
    
    // Next means swipe left (new image comes from right)
    startTransition(nextImageId, 'left');
    slideshowNext();
  }, [localImages, localCurrentImageId, isTransitioning, slideshowNext, getImageIndex, startTransition]);

  const handlePrevious = useCallback(() => {
    if (localImages.length === 0 || isTransitioning) return;

    const currentIndex = getImageIndex(localCurrentImageId);
    const previousIndex = (currentIndex - 1 + localImages.length) % localImages.length;
    const prevImageId = localImages[previousIndex].id;
    
    // Previous means swipe right (new image comes from left)
    startTransition(prevImageId, 'right');
    slideshowPrevious();
  }, [localImages, localCurrentImageId, isTransitioning, slideshowPrevious, getImageIndex, startTransition]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return;
      }

      switch (event.key) {
        case " ": // Spacebar
        case "p":
        case "P":
          event.preventDefault();
          if (slideshowState.isPlaying) {
            slideshowPause();
          } else {
            slideshowPlay();
          }
          break;
        case "ArrowRight":
        case "n":
        case "N":
          event.preventDefault();
          handleNext();
          break;
        case "ArrowLeft":
        case "b":
        case "B":
          event.preventDefault();
          handlePrevious();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [slideshowState.isPlaying, slideshowPlay, slideshowPause, handleNext, handlePrevious]);

  if (localImages.length === 0) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--color-bg-black)" }}>
        <div style={{ color: "var(--color-text-white)", fontSize: "1.2rem" }}>No images available</div>
      </div>
    );
  }

  return (
    <div
      className="slideshow-container"
    >
      {localCurrentImage ? (
        <>
          {/* Current image (revealed underneath) */}
          <div className="slideshow-image-wrapper">
            <img
              key={localCurrentImage.id}
              src={localCurrentImage.path}
              alt={localCurrentImage.originalName}
              draggable={false}
              className={`slideshow-image ${isTransitioning ? 'entering' : 'active'}`}
            />
          </div>
          {/* Previous image (sliding out on top) */}
          {previousImage && isTransitioning && (
            <div className="slideshow-image-wrapper">
              <img
                key={previousImage.id}
                src={previousImage.path}
                alt={previousImage.originalName}
                draggable={false}
                className={`slideshow-image exiting exiting-${transitionDirection}`}
              />
            </div>
          )}
        </>
      ) : (
        <div style={{ color: "var(--color-text-white)", fontSize: "1.2rem" }}>Loading...</div>
      )}
    </div>
  );
}

export default Slideshow;

