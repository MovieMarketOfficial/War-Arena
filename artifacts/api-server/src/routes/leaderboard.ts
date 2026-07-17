import { Router } from "express";
import { db, nationsTable, citiesTable, militaryTable, alliancesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { count } from "drizzle-orm";
import { warsTable } from "@workspace/db";

const router = Router();

// GET /api/leaderboard
router.get("/leaderboard", async (req, res) => {
  const category = String(req.query.category ?? "score");

  const nations = await db.select().from(nationsTable).orderBy(desc(nationsTable.score)).limit(50);

  const enriched = await Promise.all(nations.map(async (n, idx) => {
    const cities = await db.select({ id: citiesTable.id }).from(citiesTable).where(eq(citiesTable.nationId, n.id));
    const [mil] = await db.select().from(militaryTable).where(eq(militaryTable.nationId, n.id));
    let allianceName: string | null = null;
    if (n.allianceId) {
      const [a] = await db.select({ name: alliancesTable.name }).from(alliancesTable).where(eq(alliancesTable.id, n.allianceId));
      if (a) allianceName = a.name;
    }

    const milScore = mil ? mil.soldiers * 0.0005 + mil.tanks * 0.01 + mil.aircraft * 0.5 + mil.ships * 2 + mil.missiles * 5 + mil.nukes * 100 : 0;
    const economyScore = cities.length * 100;

    return {
      rank: idx + 1,
      nationId: n.id,
      nationName: n.name,
      leaderName: n.leaderName,
      allianceName,
      score: n.score,
      cityCount: cities.length,
      militaryScore: milScore,
      economyScore,
    };
  }));

  // Sort by category
  if (category === "military") enriched.sort((a, b) => b.militaryScore - a.militaryScore);
  else if (category === "economy") enriched.sort((a, b) => b.economyScore - a.economyScore);
  else if (category === "cities") enriched.sort((a, b) => b.cityCount - a.cityCount);

  enriched.forEach((e, i) => { e.rank = i + 1; });
  res.json(enriched);
});

// GET /api/stats
router.get("/stats", async (_req, res) => {
  const [nationCount] = await db.select({ count: count() }).from(nationsTable);
  const [allianceCount] = await db.select({ count: count() }).from(alliancesTable);
  const [activeWarCount] = await db.select({ count: count() }).from(warsTable).where(eq(warsTable.status, "active"));
  const [cityCount] = await db.select({ count: count() }).from(citiesTable);

  res.json({
    totalNations: nationCount?.count ?? 0,
    totalAlliances: allianceCount?.count ?? 0,
    activeWars: activeWarCount?.count ?? 0,
    totalCities: cityCount?.count ?? 0,
    totalMoney: 0,
  });
});

export default router;
