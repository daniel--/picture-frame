import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { db } from "./db/index.js";
import { imagesTable, Image } from "./db/schema.js";
import { AppError, ErrorType } from "./errors.js";
import { max } from "drizzle-orm";

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

