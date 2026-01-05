import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  teamName: text("team_name"),
  isRunningTest: boolean("is_running_test").default(false),
  highestScore: integer("highest_score").default(0),
  promptCount: integer("prompt_count").default(0),
  lastActive: timestamp("last_active").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const promptVersions = pgTable("prompt_versions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  text: text("text").notNull(),
  score: integer("score"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  isLocked: boolean("is_locked").default(false),
});

export const promptTemplates = pgTable("prompt_templates", {
  id: serial("id").primaryKey(),
  template: text("template").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scenarios = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  expected: text("expected").notNull(),
  imagePath: text("image_path").notNull(),
  imageData: text("image_data"),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const precisionRecallStudents = pgTable("precision_recall_students", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  highestScore: integer("highest_score").default(0),
  gamesPlayed: integer("games_played").default(0),
  lastActive: timestamp("last_active").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const demoPrds = pgTable("demo_prds", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertStudentSchema = createInsertSchema(students).pick({
  email: true,
});

export const insertPromptVersionSchema = createInsertSchema(promptVersions).pick({
  studentId: true,
  versionNumber: true,
  text: true,
  score: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type PromptVersion = typeof promptVersions.$inferSelect;
export type InsertPromptVersion = z.infer<typeof insertPromptVersionSchema>;
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;
export type PrecisionRecallStudent = typeof precisionRecallStudents.$inferSelect;
export type DemoPrd = typeof demoPrds.$inferSelect;
