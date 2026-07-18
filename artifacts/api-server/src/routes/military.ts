import { Router } from "express";
import { db, militaryTable, resourcesTable, nationsTable, citiesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/session";
import { MILITARY_COSTS, calcNationScore } from "../lib/game";

const router = Router();

type UnitType = "soldiers" | "tanks" | "aircraft" | "ships" | "missiles" | "nukes";
const UNITS: UnitType[] = ["soldiers", "tanks", "aircraft", "ships", "missiles", "nukes"];

// GET /api/nations/me/military
router.get("/nations/me/military", requireAuth, async (req, res) => {
  const [mil] = await db.select().from(militaryTable).where(eq(militaryTable.nationId, req.session.nationId!));
  res.json(mil ?? { nationId: req.session.nationId, soldiers: 0, tanks: 0, aircraft: 0, ships: 0, missiles: 0, nukes: 0, actionPointsUsed: 0 });
});

// GET /api/nations/:nationId/military
router.get("/nations/:nationId/military", async (req, res) => {
  const nationId = parseInt(req.params.nationId);
  const [mil] = await db.select({ nationId: militaryTable.nationId, soldiers: militaryTable.soldiers, tanks: militaryTable.tanks, aircraft: militaryTable.aircraft, ships: militaryTable.ships }).from(militaryTable).where(eq(militaryTable.nationId, nationId));
  res.json(mil ?? { nationId, soldiers: 0, tanks: 0, aircraft: 0, ships: 0 });
});

// POST /api/nations/me/military/buy
router.post("/nations/me/military/buy", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const [resources] = await db.select().from(resourcesTable).where(eq(resourcesTable.nationId, nationId));
  const [mil] = await db.select().from(militaryTable).where(eq(militaryTable.nationId, nationId));

  let totalMoney = 0;
  let steelNeeded = 0;
  let gasolineNeeded = 0;
  let munitionsNeeded = 0;
  let aluminumNeeded = 0;
  let uraniumNeeded = 0;

  const updates: Partial<Record<UnitType, number>> = {};

  for (const unit of UNITS) {
    const qty = parseInt(req.body[unit] ?? "0");
    if (!qty || qty <= 0) continue;
    const cost = MILITARY_COSTS[unit];
    if (!cost) continue;
    totalMoney += cost.money * qty;
    if (cost.steel) steelNeeded += cost.steel * qty;
    if (cost.gasoline) gasolineNeeded += cost.gasoline * qty;
    if (cost.munitions) munitionsNeeded += cost.munitions * qty;
    if (cost.aluminum) aluminumNeeded += cost.aluminum * qty;
    if (cost.uranium) uraniumNeeded += cost.uranium * qty;
    updates[unit] = qty;
  }

  if (resources.money < totalMoney) { res.status(400).json({ error: "Insufficient funds" }); return; }
  if (resources.steel < steelNeeded) { res.status(400).json({ error: "Insufficient steel" }); return; }
  if (resources.gasoline < gasolineNeeded) { res.status(400).json({ error: "Insufficient gasoline" }); return; }
  if (resources.munitions < munitionsNeeded) { res.status(400).json({ error: "Insufficient munitions" }); return; }
  if (resources.aluminum < aluminumNeeded) { res.status(400).json({ error: "Insufficient aluminum" }); return; }
  if (resources.uranium < uraniumNeeded) { res.status(400).json({ error: "Insufficient uranium" }); return; }

  const resourceUpdates: Record<string, unknown> = { money: sql`money - ${totalMoney}` };
  if (steelNeeded) resourceUpdates.steel = sql`steel - ${steelNeeded}`;
  if (gasolineNeeded) resourceUpdates.gasoline = sql`gasoline - ${gasolineNeeded}`;
  if (munitionsNeeded) resourceUpdates.munitions = sql`munitions - ${munitionsNeeded}`;
  if (aluminumNeeded) resourceUpdates.aluminum = sql`aluminum - ${aluminumNeeded}`;
  if (uraniumNeeded) resourceUpdates.uranium = sql`uranium - ${uraniumNeeded}`;

  await db.update(resourcesTable).set(resourceUpdates).where(eq(resourcesTable.nationId, nationId));

  const milUpdates: Record<string, unknown> = {};
  for (const [unit, qty] of Object.entries(updates)) {
    milUpdates[unit] = sql`${sql.identifier(unit)} + ${qty}`;
  }
  if (Object.keys(milUpdates).length > 0) {
    await db.update(militaryTable).set(milUpdates).where(eq(militaryTable.nationId, nationId));
  }

  // Recalc score
  const [newMil] = await db.select().from(militaryTable).where(eq(militaryTable.nationId, nationId));
  const cities = await db.select().from(citiesTable).where(eq(citiesTable.nationId, nationId));
  const totalInfra = cities.reduce((s, c) => s + c.infrastructure, 0);
  const score = calcNationScore(cities.length, totalInfra, newMil);
  await db.update(nationsTable).set({ score }).where(eq(nationsTable.id, nationId));

  res.json(newMil);
});

// POST /api/nations/me/military/sell
router.post("/nations/me/military/sell", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const [mil] = await db.select().from(militaryTable).where(eq(militaryTable.nationId, nationId));
  let totalRefund = 0;
  const milUpdates: Record<string, unknown> = {};

  for (const unit of UNITS) {
    const qty = Math.min(parseInt(req.body[unit] ?? "0"), mil[unit]);
    if (!qty || qty <= 0) continue;
    const cost = MILITARY_COSTS[unit];
    totalRefund += (cost.money * qty) * 0.4; // 40% refund
    milUpdates[unit] = sql`${sql.identifier(unit)} - ${qty}`;
  }

  if (Object.keys(milUpdates).length > 0) {
    await db.update(militaryTable).set(milUpdates).where(eq(militaryTable.nationId, nationId));
  }
  await db.update(resourcesTable).set({ money: sql`money + ${totalRefund}` }).where(eq(resourcesTable.nationId, nationId));

  const [newMil] = await db.select().from(militaryTable).where(eq(militaryTable.nationId, nationId));
  res.json(newMil);
});

export default router;
