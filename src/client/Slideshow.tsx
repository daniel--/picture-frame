import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "./useWebSocket";
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
  } = useWebSocket();

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        slideshowPrevious();
      } else if (e.key === "ArrowRight") {
        slideshowNext();
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
  }, [slideshowState.isPlaying, slideshowNext, slideshowPrevious, slideshowPlay, slideshowPause, navigate]);

  const currentImage = slideshowState.currentImageId
    ? images.find(img => img.id === slideshowState.currentImageId) || null
    : images.length > 0
    ? images[0] // Default to first image if no current image set
    : null;

  if (images.length === 0) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
        <div style={{ color: "white", fontSize: "1.2rem" }}>No images available</div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      {currentImage ? (
        <img
          src={currentImage.path}
          alt={currentImage.originalName}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
        />
      ) : (
        <div style={{ color: "white", fontSize: "1.2rem" }}>Loading...</div>
      )}
    </div>
  );
}

export default Slideshow;

