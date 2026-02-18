import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DB_FILE_NAME;
if (!dbUrl) throw new Error("DB_FILE_NAME environment variable is required");

export default defineConfig({
  out: "./drizzle",
  schema: "./src/server/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: dbUrl,
  },
});
