import type { IconProps } from "./types.js";

export function ChevronLeftIcon({ width = 24, height = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={width}
      height={height}
      className={className}
    >
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  );
}
