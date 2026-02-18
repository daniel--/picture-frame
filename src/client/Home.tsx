import { useAuth } from "./hooks/useAuth";
import "./Home.css";
import { useSlideShow } from "./hooks/useSlideShow";
import { useShareTarget } from "./hooks/useShareTarget";
import { Header } from "./components/Header";
import { ImageGrid } from "./components/ImageGrid";
import { SlideshowControls } from "./components/SlideshowControls";

export function Home() {
  const { user, logoutAndRedirect, token } = useAuth();
  const { isProcessing } = useShareTarget();

  const slideshow = useSlideShow(token);

  const handleToggleShuffle = () => {
    const isRandomOrderEnabled = slideshow.randomOrder !== null ? slideshow.randomOrder : false;
    slideshow.updateRandomOrder(!isRandomOrderEnabled);
  };

  const handleSpeedChange = (newSpeed: number) => {
    slideshow.updateSpeed(newSpeed);
  };

  return (
    <div className="home-container">
      <Header
        userName={user?.name ?? null}
        connected={slideshow.connected}
        onLogout={logoutAndRedirect}
      />
      <main className="home-main">
        <ImageGrid
          images={slideshow.images}
          currentImageId={slideshow.currentImage?.id ?? null}
          onReorder={slideshow.reorderImages}
          onSelectImage={slideshow.goto}
          onDeleteImage={slideshow.deleteImage}
        />
      </main>
      <SlideshowControls
        isPlaying={slideshow.isPlaying}
        onPrevious={slideshow.previous}
        onNext={slideshow.next}
        onPlay={slideshow.play}
        onPause={slideshow.pause}
        randomOrder={slideshow.randomOrder}
        onToggleShuffle={handleToggleShuffle}
        slideshowSpeed={slideshow.speed}
        onSpeedChange={handleSpeedChange}
        disabled={slideshow.images.length === 0}
      />
    </div>
  );
}
