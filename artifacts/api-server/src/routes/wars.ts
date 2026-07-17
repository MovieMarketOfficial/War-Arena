import { Router } from "express";
import { db, warsTable, attacksTable, nationsTable, militaryTable, resourcesTable, citiesTable } from "@workspace/db";
import { eq, or, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/session";
import { simulateAttack, type AttackType } from "../lib/game";

const router = Router();

async function enrichWar(war: typeof warsTable.$inferSelect) {
  const [attacker] = await db.select({ name: nationsTable.name }).from(nationsTable).where(eq(nationsTable.id, war.attackerId));
  const [defender] = await db.select({ name: nationsTable.name }).from(nationsTable).where(eq(nationsTable.id, war.defenderId));
  return {
    ...war,
    attackerName: attacker?.name ?? "Unknown",
    defenderName: defender?.name ?? "Unknown",
  };
}

// GET /api/wars
router.get("/wars", async (req, res) => {
  const nationId = req.query.nationId ? parseInt(String(req.query.nationId)) : null;
  const activeOnly = req.query.active !== "false";

  let wars: (typeof warsTable.$inferSelect)[];
  if (nationId) {
    wars = await db.select().from(warsTable).where(
      and(
        activeOnly ? eq(warsTable.status, "active") : undefined,
        or(eq(warsTable.attackerId, nationId), eq(warsTable.defenderId, nationId))
      )
    );
  } else {
    wars = activeOnly
      ? await db.select().from(warsTable).where(eq(warsTable.status, "active"))
      : await db.select().from(warsTable);
  }

  const enriched = await Promise.all(wars.map(enrichWar));
  res.json(enriched);
});

// POST /api/wars
router.post("/wars", requireAuth, async (req, res) => {
  const attackerId = req.session.nationId!;
  const { targetNationId, reason } = req.body;
  const defenderId = parseInt(targetNationId);

  if (attackerId === defenderId) {
    res.status(400).json({ error: "Cannot declare war on yourself" });
    return;
  }

  // Check defender exists
  const [defender] = await db.select().from(nationsTable).where(eq(nationsTable.id, defenderId));
  if (!defender) { res.status(400).json({ error: "Target nation not found" }); return; }

  // Check beige protection
  if (defender.beigeUntil && defender.beigeUntil > new Date()) {
    res.status(400).json({ error: "Target nation is under beige protection" });
    return;
  }

  // Check already at war with this nation
  const existingWar = await db.select().from(warsTable).where(
    and(
      eq(warsTable.status, "active"),
      or(
        and(eq(warsTable.attackerId, attackerId), eq(warsTable.defenderId, defenderId)),
        and(eq(warsTable.attackerId, defenderId), eq(warsTable.defenderId, attackerId))
      )
    )
  );
  if (existingWar.length > 0) {
    res.status(400).json({ error: "Already at war with this nation" });
    return;
  }

  const [war] = await db.insert(warsTable).values({ attackerId, defenderId, reason: reason ?? "No reason given" }).returning();
  const enriched = await enrichWar(war);
  res.status(201).json(enriched);
});

// GET /api/wars/:warId
router.get("/wars/:warId", async (req, res) => {
  const warId = parseInt(req.params.warId);
  const [war] = await db.select().from(warsTable).where(eq(warsTable.id, warId));
  if (!war) { res.status(404).json({ error: "War not found" }); return; }
  const attacks = await db.select().from(attacksTable).where(eq(attacksTable.warId, warId));
  const enriched = await enrichWar(war);
  res.json({ war: enriched, attacks });
});

// POST /api/wars/:warId/attack
router.post("/wars/:warId/attack", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const warId = parseInt(req.params.warId);
  const { type } = req.body;

  const [war] = await db.select().from(warsTable).where(eq(warsTable.id, warId));
  if (!war || war.status !== "active") { res.status(400).json({ error: "War not found or not active" }); return; }

  const isAttacker = war.attackerId === nationId;
  const isDefender = war.defenderId === nationId;
  if (!isAttacker && !isDefender) { res.status(400).json({ error: "Not a participant in this war" }); return; }

  const myId = nationId;
  const enemyId = isAttacker ? war.defenderId : war.attackerId;

  const [myMil] = await db.select().from(militaryTable).where(eq(militaryTable.nationId, myId));
  const [enemyMil] = await db.select().from(militaryTable).where(eq(militaryTable.nationId, enemyId));
  const enemyCities = await db.select().from(citiesTable).where(eq(citiesTable.nationId, enemyId));
  const totalEnemyInfra = enemyCities.reduce((s, c) => s + c.infrastructure, 0);

  const result = simulateAttack(type as AttackType, myMil, enemyMil ?? { soldiers: 0, tanks: 0, aircraft: 0, ships: 0, missiles: 0, nukes: 0 }, totalEnemyInfra);

  // Apply casualties
  const myUpdates: Record<string, unknown> = {};
  const enemyUpdates: Record<string, unknown> = {};
  if (result.attackerCasualties > 0) {
    if (type === "ground") {
      myUpdates.soldiers = sql`GREATEST(soldiers - ${result.attackerCasualties}, 0)`;
    } else if (type === "airstrike") {
      myUpdates.aircraft = sql`GREATEST(aircraft - ${result.attackerCasualties}, 0)`;
    } else if (type === "naval") {
      myUpdates.ships = sql`GREATEST(ships - ${result.attackerCasualties}, 0)`;
    }
  }
  if (result.defenderCasualties > 0) {
    if (type === "ground") {
      enemyUpdates.soldiers = sql`GREATEST(soldiers - ${result.defenderCasualties}, 0)`;
    } else if (type === "airstrike") {
      enemyUpdates.aircraft = sql`GREATEST(aircraft - ${result.defenderCasualties}, 0)`;
    } else if (type === "naval") {
      enemyUpdates.ships = sql`GREATEST(ships - ${result.defenderCasualties}, 0)`;
    } else if (type === "ground" || type === "missile" || type === "nuke") {
      enemyUpdates.soldiers = sql`GREATEST(soldiers - ${result.defenderCasualties}, 0)`;
    }
  }

  if (Object.keys(myUpdates).length) await db.update(militaryTable).set(myUpdates).where(eq(militaryTable.nationId, myId));
  if (Object.keys(enemyUpdates).length) await db.update(militaryTable).set(enemyUpdates).where(eq(militaryTable.nationId, enemyId));

  // Apply infra damage (spread across cities)
  if (result.infraDestroyed > 0 && enemyCities.length > 0) {
    const dmgPerCity = result.infraDestroyed / enemyCities.length;
    for (const city of enemyCities) {
      await db.update(citiesTable).set({ infrastructure: Math.max(0, city.infrastructure - dmgPerCity) }).where(eq(citiesTable.id, city.id));
    }
  }

  // Loot money
  if (result.moneyLooted > 0) {
    await db.update(resourcesTable).set({ money: sql`GREATEST(money - ${result.moneyLooted}, 0)` }).where(eq(resourcesTable.nationId, enemyId));
    await db.update(resourcesTable).set({ money: sql`money + ${result.moneyLooted}` }).where(eq(resourcesTable.nationId, myId));
  }

  // Record attack
  const [attack] = await db.insert(attacksTable).values({
    warId,
    attackerNationId: nationId,
    type,
    outcome: result.outcome,
    attackerCasualties: result.attackerCasualties,
    defenderCasualties: result.defenderCasualties,
    infraDestroyed: result.infraDestroyed,
    moneyLooted: result.moneyLooted,
  }).returning();

  // Update war score
  if (isAttacker) {
    await db.update(warsTable).set({ attackerWarScore: sql`attacker_war_score + ${result.warScore}` }).where(eq(warsTable.id, warId));
  } else {
    await db.update(warsTable).set({ defenderWarScore: sql`defender_war_score + ${result.warScore}` }).where(eq(warsTable.id, warId));
  }

  const looted = result.moneyLooted > 0 ? { money: result.moneyLooted, food: 0, coal: 0, oil: 0, iron: 0, bauxite: 0, lead: 0, uranium: 0, gasoline: 0, steel: 0, munitions: 0, aluminum: 0 } : undefined;

  res.json({
    attack,
    attackerCasualties: { soldiers: result.attackerCasualties, tanks: 0, aircraft: type === "airstrike" ? result.attackerCasualties : 0, ships: type === "naval" ? result.attackerCasualties : 0, missiles: 0, nukes: 0 },
    defenderCasualties: { soldiers: result.defenderCasualties, tanks: 0, aircraft: 0, ships: 0, missiles: 0, nukes: 0 },
    infraDestroyed: result.infraDestroyed,
    warScore: result.warScore,
    looted,
  });
});

// POST /api/wars/:warId/peace
router.post("/wars/:warId/peace", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const warId = parseInt(req.params.warId);
  const { action } = req.body;

  const [war] = await db.select().from(warsTable).where(eq(warsTable.id, warId));
  if (!war) { res.status(404).json({ error: "War not found" }); return; }

  const isParticipant = war.attackerId === nationId || war.defenderId === nationId;
  if (!isParticipant) { res.status(403).json({ error: "Not a participant" }); return; }

  if (action === "offer") {
    await db.update(warsTable).set({ status: "peace_offered", peaceOfferedBy: nationId }).where(eq(warsTable.id, warId));
  } else if (action === "accept") {
    await db.update(warsTable).set({ status: "ended", endedAt: new Date() }).where(eq(warsTable.id, warId));
    // Give beige protection to the defender
    const beigeUntil = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await db.update(nationsTable).set({ beigeUntil }).where(eq(nationsTable.id, war.defenderId));
  } else if (action === "reject") {
    await db.update(warsTable).set({ status: "active", peaceOfferedBy: null }).where(eq(warsTable.id, warId));
  }

  const [updated] = await db.select().from(warsTable).where(eq(warsTable.id, warId));
  const enriched = {
    ...updated,
    attackerName: "",
    defenderName: "",
  };
  const [a] = await db.select({ name: nationsTable.name }).from(nationsTable).where(eq(nationsTable.id, updated.attackerId));
  const [d] = await db.select({ name: nationsTable.name }).from(nationsTable).where(eq(nationsTable.id, updated.defenderId));
  enriched.attackerName = a?.name ?? "";
  enriched.defenderName = d?.name ?? "";
  res.json(enriched);
});

export default router;
