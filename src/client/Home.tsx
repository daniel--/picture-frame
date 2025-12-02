import { useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import "./Home.css";
import { useSlideShow } from "./hooks/useSlideShow";
import { useShareTarget } from "./hooks/useShareTarget";
import { Header } from "./components/Header";
import { ImageGrid } from "./components/ImageGrid";
import { SlideshowControls } from "./components/SlideshowControls";

export function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isProcessing } = useShareTarget();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const { images, reorderImages, currentImage, slideshowState, slideshowNext, slideshowPrevious, slideshowPlay, slideshowPause, slideshowGoto, deleteImage, connected, updateRandomOrder, randomOrder, slideshowSpeed, updateSlideshowSpeed } = useSlideShow();

  const handleToggleShuffle = () => {
    const isRandomOrderEnabled = randomOrder !== null ? randomOrder : false;
    updateRandomOrder(!isRandomOrderEnabled);
  };

  const handleSpeedChange = (newSpeed: number) => {
    updateSlideshowSpeed(newSpeed);
  };

  return (
    <div className="home-container">
      <Header
        userName={user?.name ?? null}
        connected={connected}
        onLogout={handleLogout}
      />
      <main className="home-main">
        <ImageGrid
          images={images}
          currentImageId={currentImage?.id ?? null}
          onReorder={reorderImages}
          onSelectImage={slideshowGoto}
          onDeleteImage={deleteImage}
        />
      </main>
      <SlideshowControls
        isPlaying={slideshowState.isPlaying}
        onPrevious={slideshowPrevious}
        onNext={slideshowNext}
        onPlay={slideshowPlay}
        onPause={slideshowPause}
        randomOrder={randomOrder}
        onToggleShuffle={handleToggleShuffle}
        slideshowSpeed={slideshowSpeed}
        onSpeedChange={handleSpeedChange}
        disabled={images.length === 0}
      />
    </div>
  );
}
