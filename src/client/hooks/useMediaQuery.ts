import { useState, useEffect } from "react";

/**
 * Hook to detect media query matches
 * @param query The media query string to match
 * @returns Whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event listener
    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Add listener
    mediaQuery.addEventListener("change", handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * Hook to detect if the viewport is mobile (max-width: 768px)
 * @returns Whether the viewport is mobile
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 768px)");
}
