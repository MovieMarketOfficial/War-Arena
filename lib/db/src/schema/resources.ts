import { pgTable, integer, real, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { nationsTable } from "./nations";

export const resourcesTable = pgTable("resources", {
  nationId: integer("nation_id").notNull().primaryKey().references(() => nationsTable.id),
  money: real("money").notNull().default(5000),
  food: real("food").notNull().default(200),
  coal: real("coal").notNull().default(0),
  oil: real("oil").notNull().default(0),
  iron: real("iron").notNull().default(0),
  bauxite: real("bauxite").notNull().default(0),
  lead: real("lead").notNull().default(0),
  uranium: real("uranium").notNull().default(0),
  gasoline: real("gasoline").notNull().default(0),
  steel: real("steel").notNull().default(0),
  munitions: real("munitions").notNull().default(0),
  aluminum: real("aluminum").notNull().default(0),
});

export const insertResourcesSchema = createInsertSchema(resourcesTable).omit({});
export type InsertResources = z.infer<typeof insertResourcesSchema>;
export type Resources = typeof resourcesTable.$inferSelect;
