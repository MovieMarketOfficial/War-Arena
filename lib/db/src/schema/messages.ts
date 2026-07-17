import { pgTable, serial, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { nationsTable } from "./nations";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromNationId: integer("from_nation_id").notNull().references(() => nationsTable.id),
  toNationId: integer("to_nation_id").notNull().references(() => nationsTable.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Message = typeof messagesTable.$inferSelect;
