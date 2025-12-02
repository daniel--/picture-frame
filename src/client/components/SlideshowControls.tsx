import "./SlideshowControls.css";

interface SlideshowControlsProps {
  isPlaying: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onPlay: () => void;
  onPause: () => void;
  randomOrder?: boolean | null;
  onToggleShuffle?: () => void;
  disabled: boolean;
}

export function SlideshowControls({
  isPlaying,
  onPrevious,
  onNext,
  onPlay,
  onPause,
  randomOrder,
  onToggleShuffle,
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
          {onToggleShuffle && (
            <button 
              className={`footer-btn footer-btn-shuffle ${randomOrder ? 'active' : ''}`}
              onClick={onToggleShuffle}
              aria-label={randomOrder === null ? "Loading shuffle state..." : randomOrder ? "Shuffle On" : "Shuffle Off"}
              disabled={disabled || randomOrder === null}
              title={randomOrder === null ? "Loading..." : randomOrder ? "Shuffle enabled" : "Shuffle disabled"}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="footer-btn-svg">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
              </svg>
            </button>
          )}
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

