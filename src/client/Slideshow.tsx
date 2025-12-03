import { useEffect, useCallback } from "react";
import { useDrag } from "@use-gesture/react";
import { useSlideShow } from "./hooks/useSlideShow";
import { useImageTransition } from "./hooks/useImageTransition";
import "./App.css";
import "./Slideshow.css";

function Slideshow() {
  const {
    images,
    slideshowState,
    slideshowNext,
    slideshowPrevious,
    slideshowPlay,
    slideshowPause,
  } = useSlideShow();

  const {
    localCurrentImageId,
    previousImageId,
    isTransitioning,
    transitionDirection,
    localImages,
    getImageById,
  } = useImageTransition(images, slideshowState.currentImageId);

  // Compute current image from local state
  const localCurrentImage = localCurrentImageId
    ? getImageById(localCurrentImageId)
    : localImages.length > 0
    ? localImages[0]
    : null;

  const previousImage = getImageById(previousImageId);

  // Navigation handler - relies on server to update state and trigger transition
  const handleNavigation = useCallback((direction: 'left' | 'right') => {
    if (localImages.length === 0 || isTransitioning) return;
    
    if (direction === 'left') {
      slideshowNext();
    } else {
      slideshowPrevious();
    }
  }, [localImages.length, isTransitioning, slideshowNext, slideshowPrevious]);

  // Convenience functions for backward compatibility
  const handleNext = useCallback(() => handleNavigation('left'), [handleNavigation]);
  const handlePrevious = useCallback(() => handleNavigation('right'), [handleNavigation]);

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

  const bind = useDrag(({ swipe: [swipeX] }) => {
    if (swipeX > 0) {
      handlePrevious();
    } else if (swipeX < 0) {
      handleNext();
    }
  });

  if (localImages.length === 0) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--color-bg-black)" }}>
        <div style={{ color: "var(--color-text-white)", fontSize: "1.2rem" }}>No images available</div>
      </div>
    );
  }

  return (
    <div
      {...bind()}
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

