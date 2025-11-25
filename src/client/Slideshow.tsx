import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDrag } from "@use-gesture/react";
import { useSlideShow } from "./hooks/useSlideShow";
import { Image } from "../server/db/schema.js";
import "./App.css";

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

  // Sync local state with props
  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  useEffect(() => {
    setLocalCurrentImageId(slideshowState.currentImageId);
  }, [slideshowState.currentImageId]);

  // Compute current image from local state
  const localCurrentImage = localCurrentImageId
    ? localImages.find((img) => img.id === localCurrentImageId) || null
    : localImages.length > 0
    ? localImages[0]
    : null;

  // Optimistic navigation handlers
  const handleNext = useCallback(() => {
    if (localImages.length === 0) return;
    
    const currentIndex = localCurrentImageId
      ? localImages.findIndex((img) => img.id === localCurrentImageId)
      : -1;
    
    const nextIndex = (currentIndex + 1) % localImages.length;
    setLocalCurrentImageId(localImages[nextIndex].id);
    slideshowNext();
  }, [localImages, localCurrentImageId, slideshowNext]);

  const handlePrevious = useCallback(() => {
    if (localImages.length === 0) return;
    
    const currentIndex = localCurrentImageId
      ? localImages.findIndex((img) => img.id === localCurrentImageId)
      : -1;
    
    const previousIndex = (currentIndex - 1 + localImages.length) % localImages.length;
    setLocalCurrentImageId(localImages[previousIndex].id);
    slideshowPrevious();
  }, [localImages, localCurrentImageId, slideshowPrevious]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === " ") {
        e.preventDefault();
        if (slideshowState.isPlaying) {
          slideshowPause();
        } else {
          slideshowPlay();
        }
      } else if (e.key === "Escape") {
        navigate("/");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [slideshowState.isPlaying, slideshowPlay, slideshowPause, navigate, handleNext, handlePrevious]);

  // Handle swipe/drag gestures (both touch and mouse)
  const bind = useDrag(({ swipe: [swipeX]}) => {
      if (swipeX < 0) {
        handleNext();
      } else if (swipeX > 0) {
        handlePrevious();
      }
    }, {
    pointer: { touch: true, mouse: true },
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
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-bg-black)",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        userSelect: "none"
      }}
    >
      {localCurrentImage ? (
        <img
          src={localCurrentImage.path}
          alt={localCurrentImage.originalName}
          draggable={false}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            userSelect: "none"
          }}
        />
      ) : (
        <div style={{ color: "var(--color-text-white)", fontSize: "1.2rem" }}>Loading...</div>
      )}
    </div>
  );
}

export default Slideshow;

