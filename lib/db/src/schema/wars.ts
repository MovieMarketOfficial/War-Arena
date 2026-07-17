import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { nationsTable } from "./nations";

export const warsTable = pgTable("wars", {
  id: serial("id").primaryKey(),
  attackerId: integer("attacker_id").notNull().references(() => nationsTable.id),
  defenderId: integer("defender_id").notNull().references(() => nationsTable.id),
  status: text("status").notNull().default("active"), // active, peace_offered, ended
  attackerWarScore: real("attacker_war_score").notNull().default(0),
  defenderWarScore: real("defender_war_score").notNull().default(0),
  reason: text("reason").notNull().default(""),
  peaceOfferedBy: integer("peace_offered_by"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const attacksTable = pgTable("attacks", {
  id: serial("id").primaryKey(),
  warId: integer("war_id").notNull().references(() => warsTable.id),
  attackerNationId: integer("attacker_nation_id").notNull().references(() => nationsTable.id),
  type: text("type").notNull(), // ground, airstrike, naval, missile, nuke
  outcome: text("outcome").notNull(), // pyrrhic_victory, moderate_success, immense_triumph, utter_failure
  attackerCasualties: integer("attacker_casualties").notNull().default(0),
  defenderCasualties: integer("defender_casualties").notNull().default(0),
  infraDestroyed: real("infra_destroyed").notNull().default(0),
  moneyLooted: real("money_looted").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type War = typeof warsTable.$inferSelect;
export type Attack = typeof attacksTable.$inferSelect;
