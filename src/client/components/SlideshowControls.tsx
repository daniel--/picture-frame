import "./SlideshowControls.css";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  ShuffleIcon,
  ClockIcon,
} from "./icons/index.js";

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
  const currentSpeedLabel = SPEED_OPTIONS.find((opt) => opt.value === currentSpeed)?.label || "5s";
  return (
    <footer className="home-footer">
      <div className="footer-content">
        <button
          className="footer-btn"
          onClick={onPrevious}
          aria-label="Previous"
          disabled={disabled}
        >
          <ChevronLeftIcon className="footer-btn-svg" />
        </button>
        <button
          className="footer-btn footer-btn-play"
          onClick={isPlaying ? onPause : onPlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          disabled={disabled}
        >
          {isPlaying ? (
            <PauseIcon className="footer-btn-svg" />
          ) : (
            <PlayIcon className="footer-btn-svg" />
          )}
        </button>
        {onToggleShuffle && (
          <button
            className={`footer-btn footer-btn-shuffle ${randomOrder ? "active" : ""}`}
            onClick={onToggleShuffle}
            aria-label={
              randomOrder === null
                ? "Loading shuffle state..."
                : randomOrder
                  ? "Shuffle On"
                  : "Shuffle Off"
            }
            disabled={disabled || randomOrder === null}
            title={
              randomOrder === null
                ? "Loading..."
                : randomOrder
                  ? "Shuffle enabled"
                  : "Shuffle disabled"
            }
          >
            <ShuffleIcon className="footer-btn-svg" />
          </button>
        )}
        <button className="footer-btn" onClick={onNext} aria-label="Next" disabled={disabled}>
          <ChevronRightIcon className="footer-btn-svg" />
        </button>
        {onSpeedChange && (
          <div className="footer-speed-selector">
            <ClockIcon className="footer-speed-icon" />
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
