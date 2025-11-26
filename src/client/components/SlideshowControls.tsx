import "./SlideshowControls.css";

interface SlideshowControlsProps {
  isPlaying: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onPlay: () => void;
  onPause: () => void;
  disabled: boolean;
}

export function SlideshowControls({
  isPlaying,
  onPrevious,
  onNext,
  onPlay,
  onPause,
  disabled,
}: SlideshowControlsProps) {
  return (
    <footer className="home-footer">
      <div className="footer-content">
        <button 
          className="footer-btn" 
          onClick={onPrevious}
          aria-label="Previous"
          disabled={disabled}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="footer-btn-svg">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        <button 
          className="footer-btn footer-btn-play" 
          onClick={isPlaying ? onPause : onPlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          disabled={disabled}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="footer-btn-svg">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="footer-btn-svg">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>
        <button 
          className="footer-btn" 
          onClick={onNext}
          aria-label="Next"
          disabled={disabled}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="footer-btn-svg">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
      </div>
    </footer>
  );
}

