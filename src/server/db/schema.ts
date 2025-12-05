import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { InferInsertModel, InferSelectModel, sql } from "drizzle-orm";

const baseSchema = {
  id: int().primaryKey({ autoIncrement: true }),
  createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text().default(sql`(CURRENT_TIMESTAMP)`),
};

export const usersTable = sqliteTable("users_table", {
  ...baseSchema,
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text().notNull(),
});

export const imagesTable = sqliteTable("images_table", {
  ...baseSchema,
  userId: int().notNull(),
  filename: text().notNull(),
  originalName: text().notNull(),
  mimeType: text().notNull(),
  size: int().notNull(),
  path: text().notNull(),
  thumbnailPath: text(),
  displayOrder: int().notNull().default(0).unique(),
});

export const settingsTable = sqliteTable("settings_table", {
  ...baseSchema,
  key: text().notNull().unique(),
  value: text().notNull(),
});

export type Image = InferSelectModel<typeof imagesTable>;
export type NewImage = InferInsertModel<typeof imagesTable>;
export type User = InferSelectModel<typeof usersTable>;
export type NewUser = InferInsertModel<typeof usersTable>;
export type Setting = InferSelectModel<typeof settingsTable>;
export type NewSetting = InferInsertModel<typeof settingsTable>;
