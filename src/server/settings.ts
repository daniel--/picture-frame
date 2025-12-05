import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { settingsTable } from "./db/schema.js";

const SLIDE_DURATION_KEY = "slideDuration";
const SLIDESHOW_IS_PLAYING_KEY = "slideshowIsPlaying";
const SLIDESHOW_CURRENT_IMAGE_ID_KEY = "slideshowCurrentImageId";
const SLIDESHOW_RANDOM_ORDER_KEY = "slideshowRandomOrder";

/**
 * Generic function to get a setting value from the database
 * @param key The setting key
 * @returns The setting value as a string, or null if not found
 */
async function getSetting(key: string): Promise<string | null> {
  try {
    const setting = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, key))
      .limit(1)
      .then((rows) => rows[0]);

    return setting?.value ?? null;
  } catch (error) {
    console.error(`Error reading setting '${key}' from database:`, error);
    return null;
  }
}

/**
 * Generic function to set a setting value in the database
 * @param key The setting key
 * @param value The setting value
 */
async function setSetting(key: string, value: string): Promise<void> {
  try {
    const updatedAt = new Date().toISOString();

    // Check if setting exists
    const existing = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, key))
      .limit(1)
      .then((rows) => rows[0]);

    if (existing) {
      // Update existing setting
      await db
        .update(settingsTable)
        .set({
          value,
          updatedAt,
        })
        .where(eq(settingsTable.key, key));
    } else {
      // Insert new setting
      await db.insert(settingsTable).values({
        key,
        value,
        updatedAt,
      });
    }
  } catch (error) {
    console.error(`Error saving setting '${key}' to database:`, error);
    throw error;
  }
}

/**
 * Gets the slide duration from the database, or returns the default value
 * @returns Slide duration in milliseconds
 */
export async function getSlideDuration(): Promise<number> {
  const value = await getSetting(SLIDE_DURATION_KEY);

  if (value) {
    const duration = parseInt(value, 10);
    // Validate: 1 second to 1 day (86400 seconds)
    if (duration > 0 && duration <= 86400000) {
      return duration;
    }
  }

  // Return default value (5 seconds = 5000ms)
  return 5000;
}

/**
 * Sets the slide duration in the database
 * @param duration Slide duration in milliseconds
 */
export async function setSlideDuration(duration: number): Promise<void> {
  // Validate: 1 second to 1 day (86400 seconds)
  if (duration <= 0 || duration > 86400000) {
    throw new Error(`Invalid slide duration: ${duration}ms`);
  }

  await setSetting(SLIDE_DURATION_KEY, duration.toString());
}

/**
 * Interface for slideshow state
 */
export interface SlideshowState {
  currentImageId: number | null;
  isPlaying: boolean;
}

/**
 * Gets the slideshow state from the database
 * @returns Slideshow state with currentImageId and isPlaying
 */
export async function getSlideshowState(): Promise<SlideshowState> {
  const [isPlayingValue, currentImageIdValue] = await Promise.all([
    getSetting(SLIDESHOW_IS_PLAYING_KEY),
    getSetting(SLIDESHOW_CURRENT_IMAGE_ID_KEY),
  ]);

  const isPlaying = isPlayingValue === "true";
  const currentImageId = currentImageIdValue ? parseInt(currentImageIdValue, 10) : null;

  // Validate currentImageId (should be positive integer or null)
  const validImageId = currentImageId !== null && currentImageId > 0 ? currentImageId : null;

  return {
    currentImageId: validImageId,
    isPlaying,
  };
}

/**
 * Sets the slideshow state in the database
 * @param state Slideshow state with currentImageId and isPlaying
 */
export async function setSlideshowState(state: SlideshowState): Promise<void> {
  const isPlayingValue = state.isPlaying ? "true" : "false";
  const currentImageIdValue = state.currentImageId?.toString() ?? "";

  await Promise.all([
    setSetting(SLIDESHOW_IS_PLAYING_KEY, isPlayingValue),
    setSetting(SLIDESHOW_CURRENT_IMAGE_ID_KEY, currentImageIdValue),
  ]);
}

/**
 * Gets the random order setting from the database, or returns the default value (false)
 * @returns true if random order is enabled, false otherwise
 */
export async function getRandomOrder(): Promise<boolean> {
  const value = await getSetting(SLIDESHOW_RANDOM_ORDER_KEY);
  return value === "true";
}

/**
 * Sets the random order setting in the database
 * @param enabled true to enable random order, false to use sequential order
 */
export async function setRandomOrder(enabled: boolean): Promise<void> {
  const valueStr = enabled ? "true" : "false";
  await setSetting(SLIDESHOW_RANDOM_ORDER_KEY, valueStr);
}
