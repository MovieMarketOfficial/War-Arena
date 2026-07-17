import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { nationsTable } from "./nations";

export const citiesTable = pgTable("cities", {
  id: serial("id").primaryKey(),
  nationId: integer("nation_id").notNull().references(() => nationsTable.id),
  name: text("name").notNull(),
  infrastructure: real("infrastructure").notNull().default(100),
  land: real("land").notNull().default(250),
  commerce: integer("commerce").notNull().default(0),
  industry: integer("industry").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertCitySchema = createInsertSchema(citiesTable).omit({ id: true, createdAt: true });
export type InsertCity = z.infer<typeof insertCitySchema>;
export type City = typeof citiesTable.$inferSelect;
