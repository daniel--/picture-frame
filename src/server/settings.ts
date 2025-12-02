import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { settingsTable } from "./db/schema.js";

const SLIDE_DURATION_KEY = "slideDuration";
const SLIDESHOW_IS_PLAYING_KEY = "slideshowIsPlaying";
const SLIDESHOW_CURRENT_IMAGE_ID_KEY = "slideshowCurrentImageId";
const SLIDESHOW_RANDOM_ORDER_KEY = "slideshowRandomOrder";

/**
 * Gets the slide duration from the database, or returns the default value
 * @returns Slide duration in milliseconds
 */
export async function getSlideDuration(): Promise<number> {
  try {
    const setting = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, SLIDE_DURATION_KEY))
      .limit(1)
      .then((rows) => rows[0]);

    if (setting) {
      const duration = parseInt(setting.value, 10);
      // Validate: 1 second to 1 day (86400 seconds)
      if (duration > 0 && duration <= 86400000) {
        return duration;
      }
    }
  } catch (error) {
    console.error("Error reading slide duration from database:", error);
  }

  // Return default value (5 seconds = 5000ms)
  return 5000;
}

/**
 * Sets the slide duration in the database
 * @param duration Slide duration in milliseconds
 */
export async function setSlideDuration(duration: number): Promise<void> {
  try {
    // Validate: 1 second to 1 day (86400 seconds)
    if (duration <= 0 || duration > 86400000) {
      throw new Error(`Invalid slide duration: ${duration}ms`);
    }

    // Check if setting exists
    const existing = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, SLIDE_DURATION_KEY))
      .limit(1)
      .then((rows) => rows[0]);

    const valueStr = duration.toString();
    const updatedAt = new Date().toISOString();

    if (existing) {
      // Update existing setting
      await db
        .update(settingsTable)
        .set({
          value: valueStr,
          updatedAt: updatedAt,
        })
        .where(eq(settingsTable.key, SLIDE_DURATION_KEY));
    } else {
      // Insert new setting
      await db.insert(settingsTable).values({
        key: SLIDE_DURATION_KEY,
        value: valueStr,
        updatedAt: updatedAt,
      });
    }
  } catch (error) {
    console.error("Error saving slide duration to database:", error);
    throw error;
  }
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
  try {
    const [isPlayingSetting, currentImageIdSetting] = await Promise.all([
      db
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.key, SLIDESHOW_IS_PLAYING_KEY))
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.key, SLIDESHOW_CURRENT_IMAGE_ID_KEY))
        .limit(1)
        .then((rows) => rows[0]),
    ]);

    const isPlaying = isPlayingSetting?.value === "true";
    const currentImageId = currentImageIdSetting?.value
      ? parseInt(currentImageIdSetting.value, 10)
      : null;

    // Validate currentImageId (should be positive integer or null)
    const validImageId = currentImageId !== null && currentImageId > 0 ? currentImageId : null;

    return {
      currentImageId: validImageId,
      isPlaying,
    };
  } catch (error) {
    console.error("Error reading slideshow state from database:", error);
    // Return default state
    return {
      currentImageId: null,
      isPlaying: false,
    };
  }
}

/**
 * Sets the slideshow state in the database
 * @param state Slideshow state with currentImageId and isPlaying
 */
export async function setSlideshowState(state: SlideshowState): Promise<void> {
  try {
    const updatedAt = new Date().toISOString();

    // Update or insert isPlaying setting
    const isPlayingValue = state.isPlaying ? "true" : "false";
    const existingIsPlaying = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, SLIDESHOW_IS_PLAYING_KEY))
      .limit(1)
      .then((rows) => rows[0]);

    if (existingIsPlaying) {
      await db
        .update(settingsTable)
        .set({
          value: isPlayingValue,
          updatedAt: updatedAt,
        })
        .where(eq(settingsTable.key, SLIDESHOW_IS_PLAYING_KEY));
    } else {
      await db.insert(settingsTable).values({
        key: SLIDESHOW_IS_PLAYING_KEY,
        value: isPlayingValue,
        updatedAt: updatedAt,
      });
    }

    // Update or insert currentImageId setting
    const currentImageIdValue = state.currentImageId?.toString() ?? "";
    const existingCurrentImageId = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, SLIDESHOW_CURRENT_IMAGE_ID_KEY))
      .limit(1)
      .then((rows) => rows[0]);

    if (existingCurrentImageId) {
      await db
        .update(settingsTable)
        .set({
          value: currentImageIdValue,
          updatedAt: updatedAt,
        })
        .where(eq(settingsTable.key, SLIDESHOW_CURRENT_IMAGE_ID_KEY));
    } else {
      await db.insert(settingsTable).values({
        key: SLIDESHOW_CURRENT_IMAGE_ID_KEY,
        value: currentImageIdValue,
        updatedAt: updatedAt,
      });
    }
  } catch (error) {
    console.error("Error saving slideshow state to database:", error);
    throw error;
  }
}

/**
 * Gets the random order setting from the database, or returns the default value (false)
 * @returns true if random order is enabled, false otherwise
 */
export async function getRandomOrder(): Promise<boolean> {
  try {
    const setting = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, SLIDESHOW_RANDOM_ORDER_KEY))
      .limit(1)
      .then((rows) => rows[0]);

    if (setting) {
      return setting.value === "true";
    }
  } catch (error) {
    console.error("Error reading random order setting from database:", error);
  }

  // Return default value (false = sequential order)
  return false;
}

/**
 * Sets the random order setting in the database
 * @param enabled true to enable random order, false to use sequential order
 */
export async function setRandomOrder(enabled: boolean): Promise<void> {
  try {
    // Check if setting exists
    const existing = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, SLIDESHOW_RANDOM_ORDER_KEY))
      .limit(1)
      .then((rows) => rows[0]);

    const valueStr = enabled ? "true" : "false";
    const updatedAt = new Date().toISOString();

    if (existing) {
      // Update existing setting
      await db
        .update(settingsTable)
        .set({
          value: valueStr,
          updatedAt: updatedAt,
        })
        .where(eq(settingsTable.key, SLIDESHOW_RANDOM_ORDER_KEY));
    } else {
      // Insert new setting
      await db.insert(settingsTable).values({
        key: SLIDESHOW_RANDOM_ORDER_KEY,
        value: valueStr,
        updatedAt: updatedAt,
      });
    }
  } catch (error) {
    console.error("Error saving random order setting to database:", error);
    throw error;
  }
}

