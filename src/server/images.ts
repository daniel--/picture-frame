import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { db } from "./db/index.js";
import { imagesTable, Image } from "./db/schema.js";
import { AppError, ErrorType } from "./errors.js";
import { max, min, eq, asc } from "drizzle-orm";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "public", "uploads");
const thumbnailsDir = path.join(process.cwd(), "public", "uploads", "thumbnails");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

// File filter to only allow images
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check if file is an image
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    const error = new Error("Only image files are allowed") as Error & { statusCode?: number };
    error.statusCode = ErrorType.BAD_REQUEST;
    cb(error);
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Converts an Image entity to a DTO for API responses
 * @param image The image entity from the database
 * @returns Image DTO for API responses
 */
export function toImageDTO(image: Image) {
  return {
    id: image.id,
    filename: image.filename,
    originalName: image.originalName,
    mimeType: image.mimeType,
    size: image.size,
    url: image.path,
    thumbnailUrl: image.thumbnailPath,
    displayOrder: image.displayOrder,
    createdAt: image.createdAt,
  };
}

export async function stripMetadata(imagePath: string) {
  try {
    const s = sharp(imagePath);
    const { orientation } = await s.metadata();
    const buffer = await s.toBuffer();

    // Write to a temporary file first for atomic operation
    const tempPath = `${imagePath}.tmp`;
    await sharp(buffer).withMetadata({ orientation }).toFile(tempPath);

    // Atomically replace the original file
    const fs = await import("fs/promises");
    await fs.rename(tempPath, imagePath);
  } catch (error) {
    console.error("Error stripping metadata:", error);
    throw new AppError("Failed to strip metadata", ErrorType.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Generates a thumbnail from an image file
 * @param inputPath Path to the original image
 * @param outputPath Path where the thumbnail should be saved
 * @param width Maximum width of the thumbnail (default: 300)
 * @param height Maximum height of the thumbnail (default: 300)
 * @returns Path to the generated thumbnail
 */
export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  width: number = 300,
  height: number = 300
): Promise<string> {
  try {
    await sharp(inputPath)
      .autoOrient()
      .resize(width, height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    throw new AppError("Failed to generate thumbnail", ErrorType.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Creates a new image record in the database
 * @param input Image creation input
 * @returns Created image record
 */
export async function createImage(input: {
  userId: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  thumbnailPath?: string | null;
}): Promise<Image> {
  // Get the maximum display order across all images (unique across all users)
  const [maxOrderResult] = await db
    .select({ maxOrder: max(imagesTable.displayOrder) })
    .from(imagesTable);

  // Calculate the next display order (max + 1, or 0 if no images exist)
  const nextDisplayOrder = (maxOrderResult?.maxOrder ?? -1) + 1;

  const [newImage] = await db
    .insert(imagesTable)
    .values({
      userId: input.userId,
      filename: input.filename,
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.size,
      path: input.path,
      thumbnailPath: input.thumbnailPath || null,
      displayOrder: nextDisplayOrder,
    })
    .returning();

  return newImage;
}

/**
 * Deletes an image record from the database and its associated files
 * @param imageId ID of the image to delete
 * @returns Deleted image record
 */
export async function deleteImage(imageId: number): Promise<Image> {
  // Find the image in the database
  const [image] = await db.select().from(imagesTable).where(eq(imagesTable.id, imageId)).limit(1);

  if (!image) {
    throw new AppError("Image not found", ErrorType.NOT_FOUND);
  }

  // Delete the image file from filesystem
  const imageFilePath = path.join(process.cwd(), "public", image.path);
  if (fs.existsSync(imageFilePath)) {
    try {
      fs.unlinkSync(imageFilePath);
    } catch (error) {
      console.error(`Failed to delete image file ${imageFilePath}:`, error);
      // Continue with database deletion even if file deletion fails
    }
  }

  // Delete the thumbnail file from filesystem if it exists
  if (image.thumbnailPath) {
    const thumbnailFilePath = path.join(process.cwd(), "public", image.thumbnailPath);
    if (fs.existsSync(thumbnailFilePath)) {
      try {
        fs.unlinkSync(thumbnailFilePath);
      } catch (error) {
        console.error(`Failed to delete thumbnail file ${thumbnailFilePath}:`, error);
        // Continue with database deletion even if file deletion fails
      }
    }
  }

  // Delete the image record from database
  await db.delete(imagesTable).where(eq(imagesTable.id, imageId));

  return image;
}

/**
 * Gets all images ordered by displayOrder
 * @returns Array of all images sorted by displayOrder
 */
export async function getAllImages(): Promise<Image[]> {
  return await db.select().from(imagesTable).orderBy(asc(imagesTable.displayOrder));
}

/**
 * Updates the sort order of images
 * @param imageOrders Array of {id, displayOrder} pairs
 * @returns Updated images
 */
export async function updateImageSortOrder(
  imageOrders: Array<{ id: number; displayOrder: number }>
): Promise<Image[]> {
  // Validate that all display orders are unique
  const orders = imageOrders.map((io) => io.displayOrder);
  if (new Set(orders).size !== orders.length) {
    throw new AppError("Display orders must be unique", ErrorType.BAD_REQUEST);
  }

  // Use a transaction to ensure atomicity
  return await db.transaction(async (tx) => {
    // To avoid unique constraint violations, we use a two-phase update:
    // Phase 1: Set all display orders to temporary negative values
    // Phase 2: Set them to their final values

    // Get the minimum displayOrder value to calculate a safe temporary offset
    const [minOrderResult] = await tx
      .select({ minOrder: min(imagesTable.displayOrder) })
      .from(imagesTable);

    // Calculate starting temporary order: 10 less than the minimum, or -10 if no images exist
    const minOrder = minOrderResult?.minOrder ?? 0;
    let tempOrder = minOrder - 10;

    // Phase 1: Set temporary negative values
    for (const { id } of imageOrders) {
      await tx.update(imagesTable).set({ displayOrder: tempOrder }).where(eq(imagesTable.id, id));
      tempOrder--;
    }

    // Phase 2: Set final values
    for (const { id, displayOrder } of imageOrders) {
      await tx.update(imagesTable).set({ displayOrder }).where(eq(imagesTable.id, id));
    }

    // Return all images in the new order
    return await tx.select().from(imagesTable).orderBy(asc(imagesTable.displayOrder));
  });
}
