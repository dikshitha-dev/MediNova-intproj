import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { remindersTable } from "./reminders";

export const doseLogsTable = pgTable("dose_logs", {
  id: serial("id").primaryKey(),
  reminderId: integer("reminder_id").notNull().references(() => remindersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // taken | missed | skipped
  scheduledTime: text("scheduled_time").notNull(),
  takenAt: timestamp("taken_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDoseLogSchema = createInsertSchema(doseLogsTable).omit({ id: true, createdAt: true });
export type InsertDoseLog = z.infer<typeof insertDoseLogSchema>;
export type DoseLog = typeof doseLogsTable.$inferSelect;
