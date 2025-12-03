import type { IconProps } from "./types.js";

export function PlayIcon({ width = 24, height = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={width}
      height={height}
      className={className}
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

