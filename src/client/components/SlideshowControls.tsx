import "./SlideshowControls.css";

const SPEED_OPTIONS = [
  { value: 5, label: "5s" },
  { value: 60, label: "1min" },
  { value: 600, label: "10min" },
  { value: 3600, label: "1hr" },
  { value: 18000, label: "5hr" },
  { value: 86400, label: "1day" },
] as const;

interface SlideshowControlsProps {
  isPlaying: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onPlay: () => void;
  onPause: () => void;
  randomOrder?: boolean | null;
  onToggleShuffle?: () => void;
  slideshowSpeed?: number | null;
  onSpeedChange?: (speed: number) => void;
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
  slideshowSpeed,
  onSpeedChange,
  disabled,
}: SlideshowControlsProps) {
  const currentSpeed = slideshowSpeed !== null ? slideshowSpeed : 5;
  const currentSpeedLabel = SPEED_OPTIONS.find(opt => opt.value === currentSpeed)?.label || "5s";
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
        {onSpeedChange && (
          <div className="footer-speed-selector">
            <svg viewBox="0 0 24 24" fill="currentColor" className="footer-speed-icon">
              <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
            </svg>
            <select 
              className="footer-speed-select"
              value={currentSpeed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              disabled={disabled || slideshowSpeed === null}
              aria-label="Slideshow speed"
            >
              {SPEED_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </footer>
  );
}

