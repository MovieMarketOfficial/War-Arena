import { Router } from "express";
import { db, nationsTable, citiesTable, alliancesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/map
router.get("/map", async (_req, res) => {
  const nations = await db.select().from(nationsTable);
  const enriched = await Promise.all(nations.map(async (n) => {
    const cities = await db.select({ id: citiesTable.id }).from(citiesTable).where(eq(citiesTable.nationId, n.id));
    let allianceName: string | null = null;
    if (n.allianceId) {
      const [a] = await db.select({ name: alliancesTable.name }).from(alliancesTable).where(eq(alliancesTable.id, n.allianceId));
      if (a) allianceName = a.name;
    }
    return {
      id: n.id,
      name: n.name,
      leaderName: n.leaderName,
      continent: n.continent,
      governmentType: n.governmentType,
      score: n.score,
      cityCount: cities.length,
      flag: n.flag,
      allianceId: n.allianceId,
      allianceName,
      mapX: n.mapX,
      mapY: n.mapY,
    };
  }));
  res.json(enriched);
});

export default router;
