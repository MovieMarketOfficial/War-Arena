import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { nationsTable } from "./nations";

export const marketOffersTable = pgTable("market_offers", {
  id: serial("id").primaryKey(),
  nationId: integer("nation_id").notNull().references(() => nationsTable.id),
  offerType: text("offer_type").notNull(), // buy, sell
  resource: text("resource").notNull(),
  quantity: real("quantity").notNull(),
  pricePerUnit: real("price_per_unit").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MarketOffer = typeof marketOffersTable.$inferSelect;
