import { pgTable, integer } from "drizzle-orm/pg-core";
import { nationsTable } from "./nations";

export const militaryTable = pgTable("military", {
  nationId: integer("nation_id").notNull().primaryKey().references(() => nationsTable.id),
  soldiers: integer("soldiers").notNull().default(0),
  tanks: integer("tanks").notNull().default(0),
  aircraft: integer("aircraft").notNull().default(0),
  ships: integer("ships").notNull().default(0),
  missiles: integer("missiles").notNull().default(0),
  nukes: integer("nukes").notNull().default(0),
  actionPointsUsed: integer("action_points_used").notNull().default(0),
});

export type Military = typeof militaryTable.$inferSelect;
