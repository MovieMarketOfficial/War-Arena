import { pgTable, serial, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const nationsTable = pgTable("nations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  name: text("name").notNull().unique(),
  leaderName: text("leader_name").notNull(),
  continent: text("continent").notNull(),
  governmentType: text("government_type").notNull(),
  score: real("score").notNull().default(0),
  population: integer("population").notNull().default(100000),
  gdp: real("gdp").notNull().default(50000),
  taxRate: real("tax_rate").notNull().default(25),
  taxCollectedAt: timestamp("tax_collected_at", { withTimezone: true }),
  flag: text("flag"),
  allianceId: integer("alliance_id"),
  beigeUntil: timestamp("beige_until", { withTimezone: true }),
  warPolicy: text("war_policy").notNull().default("Attrition"),
  domesticPolicy: text("domestic_policy").notNull().default("Open Markets"),
  mapX: real("map_x").notNull().default(0),
  mapY: real("map_y").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertNationSchema = createInsertSchema(nationsTable).omit({ id: true, createdAt: true, score: true, population: true, gdp: true });
export type InsertNation = z.infer<typeof insertNationSchema>;
export type Nation = typeof nationsTable.$inferSelect;
