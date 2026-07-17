import { Router } from "express";
import { db, marketOffersTable, resourcesTable, nationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/session";

const router = Router();

async function enrichOffer(offer: typeof marketOffersTable.$inferSelect) {
  const [nation] = await db.select({ name: nationsTable.name }).from(nationsTable).where(eq(nationsTable.id, offer.nationId));
  return { ...offer, nationName: nation?.name ?? "Unknown" };
}

// GET /api/market
router.get("/market", async (req, res) => {
  const resource = req.query.resource as string | undefined;
  const type = req.query.type as string | undefined;

  let offers = await db.select().from(marketOffersTable);
  if (resource) offers = offers.filter(o => o.resource === resource);
  if (type) offers = offers.filter(o => o.offerType === type);

  const enriched = await Promise.all(offers.map(enrichOffer));
  res.json(enriched);
});

// POST /api/market
router.post("/market", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const { offerType, resource, quantity, pricePerUnit } = req.body;

  if (!offerType || !resource || !quantity || !pricePerUnit) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }

  const [resources] = await db.select().from(resourcesTable).where(eq(resourcesTable.nationId, nationId));

  if (offerType === "sell") {
    const available = (resources as Record<string, unknown>)[resource] as number ?? 0;
    if (available < quantity) {
      res.status(400).json({ error: `Insufficient ${resource}` }); return;
    }
    // Reserve resources
    await db.update(resourcesTable).set({ [resource]: sql`${sql.identifier(resource)} - ${quantity}` }).where(eq(resourcesTable.nationId, nationId));
  } else {
    const totalCost = quantity * pricePerUnit;
    if (resources.money < totalCost) {
      res.status(400).json({ error: "Insufficient funds" }); return;
    }
    await db.update(resourcesTable).set({ money: sql`money - ${totalCost}` }).where(eq(resourcesTable.nationId, nationId));
  }

  const [offer] = await db.insert(marketOffersTable).values({ nationId, offerType, resource, quantity, pricePerUnit }).returning();
  const enriched = await enrichOffer(offer);
  res.status(201).json(enriched);
});

// DELETE /api/market/:offerId
router.delete("/market/:offerId", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const offerId = parseInt(req.params.offerId);

  const [offer] = await db.select().from(marketOffersTable).where(eq(marketOffersTable.id, offerId));
  if (!offer || offer.nationId !== nationId) { res.status(404).json({ error: "Offer not found" }); return; }

  // Refund
  if (offer.offerType === "sell") {
    await db.update(resourcesTable).set({ [offer.resource]: sql`${sql.identifier(offer.resource)} + ${offer.quantity}` }).where(eq(resourcesTable.nationId, nationId));
  } else {
    const refund = offer.quantity * offer.pricePerUnit;
    await db.update(resourcesTable).set({ money: sql`money + ${refund}` }).where(eq(resourcesTable.nationId, nationId));
  }

  await db.delete(marketOffersTable).where(eq(marketOffersTable.id, offerId));
  res.json({ success: true });
});

// POST /api/market/:offerId/buy
router.post("/market/:offerId/buy", requireAuth, async (req, res) => {
  const buyerNationId = req.session.nationId!;
  const offerId = parseInt(req.params.offerId);
  const { quantity } = req.body;

  const [offer] = await db.select().from(marketOffersTable).where(eq(marketOffersTable.id, offerId));
  if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }
  if (offer.nationId === buyerNationId) { res.status(400).json({ error: "Cannot buy your own offer" }); return; }

  const qty = Math.min(quantity, offer.quantity);
  const totalCost = qty * offer.pricePerUnit;

  const [buyerResources] = await db.select().from(resourcesTable).where(eq(resourcesTable.nationId, buyerNationId));

  if (offer.offerType === "sell") {
    if (buyerResources.money < totalCost) { res.status(400).json({ error: "Insufficient funds" }); return; }
    await db.update(resourcesTable).set({ money: sql`money - ${totalCost}` }).where(eq(resourcesTable.nationId, buyerNationId));
    await db.update(resourcesTable).set({ [offer.resource]: sql`${sql.identifier(offer.resource)} + ${qty}` }).where(eq(resourcesTable.nationId, buyerNationId));
    await db.update(resourcesTable).set({ money: sql`money + ${totalCost}` }).where(eq(resourcesTable.nationId, offer.nationId));
  } else {
    // Buyer is selling to a buy offer
    const sellerAvailable = (buyerResources as Record<string, unknown>)[offer.resource] as number ?? 0;
    if (sellerAvailable < qty) { res.status(400).json({ error: `Insufficient ${offer.resource}` }); return; }
    await db.update(resourcesTable).set({ [offer.resource]: sql`${sql.identifier(offer.resource)} - ${qty}` }).where(eq(resourcesTable.nationId, buyerNationId));
    await db.update(resourcesTable).set({ money: sql`money + ${totalCost}` }).where(eq(resourcesTable.nationId, buyerNationId));
    await db.update(resourcesTable).set({ [offer.resource]: sql`${sql.identifier(offer.resource)} + ${qty}` }).where(eq(resourcesTable.nationId, offer.nationId));
  }

  // Update or remove offer
  if (qty >= offer.quantity) {
    await db.delete(marketOffersTable).where(eq(marketOffersTable.id, offerId));
  } else {
    await db.update(marketOffersTable).set({ quantity: offer.quantity - qty }).where(eq(marketOffersTable.id, offerId));
  }

  const [updatedResources] = await db.select().from(resourcesTable).where(eq(resourcesTable.nationId, buyerNationId));
  res.json({ resource: offer.resource, quantity: qty, totalCost, updatedResources });
});

export default router;
