import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { nationsTable } from "./nations";

export const alliancesTable = pgTable("alliances", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  acronym: text("acronym").notNull(),
  description: text("description"),
  flag: text("flag"),
  forumUrl: text("forum_url"),
  score: real("score").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const allianceMembersTable = pgTable("alliance_members", {
  nationId: integer("nation_id").notNull().primaryKey().references(() => nationsTable.id),
  allianceId: integer("alliance_id").notNull().references(() => alliancesTable.id),
  role: text("role").notNull().default("member"), // leader, officer, member, applicant
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Alliance = typeof alliancesTable.$inferSelect;
export type AllianceMember = typeof allianceMembersTable.$inferSelect;
