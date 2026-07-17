import { Router } from "express";
import { db, nationsTable, resourcesTable, citiesTable, militaryTable, alliancesTable, allianceMembersTable } from "@workspace/db";
import { eq, ilike, sql, count } from "drizzle-orm";
import { requireAuth } from "../lib/session";
import { calcNationScore, calcTaxIncome, calcCityPopulation, CITY_BASE_COST, CITY_COST_PER_CITY } from "../lib/game";

const router = Router();

async function getNationDetail(nationId: number) {
  const [nation] = await db.select().from(nationsTable).where(eq(nationsTable.id, nationId));
  if (!nation) return null;
  const [resources] = await db.select().from(resourcesTable).where(eq(resourcesTable.nationId, nationId));
  const cities = await db.select().from(citiesTable).where(eq(citiesTable.nationId, nationId));

  let allianceName: string | null = null;
  if (nation.allianceId) {
    const [alliance] = await db.select().from(alliancesTable).where(eq(alliancesTable.id, nation.allianceId));
    if (alliance) allianceName = alliance.name;
  }

  const totalInfra = cities.reduce((s, c) => s + c.infrastructure, 0);
  const population = cities.reduce((s, c) => s + calcCityPopulation(c.infrastructure), 0);

  return {
    id: nation.id,
    name: nation.name,
    leaderName: nation.leaderName,
    continent: nation.continent,
    governmentType: nation.governmentType,
    score: nation.score,
    cityCount: cities.length,
    population,
    gdp: population * 50,
    taxRate: nation.taxRate,
    taxCollectedAt: nation.taxCollectedAt,
    flag: nation.flag,
    allianceId: nation.allianceId,
    allianceName,
    beigeUntil: nation.beigeUntil,
    warPolicy: nation.warPolicy,
    domesticPolicy: nation.domesticPolicy,
    resources: resources ?? { money: 0, food: 0, coal: 0, oil: 0, iron: 0, bauxite: 0, lead: 0, uranium: 0, gasoline: 0, steel: 0, munitions: 0, aluminum: 0 },
    createdAt: nation.createdAt,
  };
}

// GET /api/nations
router.get("/nations", async (req, res) => {
  const page = parseInt(String(req.query.page ?? "1"));
  const limit = Math.min(parseInt(String(req.query.limit ?? "50")), 100);
  const search = String(req.query.search ?? "");
  const offset = (page - 1) * limit;

  let query = db.select({
    id: nationsTable.id,
    name: nationsTable.name,
    leaderName: nationsTable.leaderName,
    continent: nationsTable.continent,
    governmentType: nationsTable.governmentType,
    score: nationsTable.score,
    flag: nationsTable.flag,
    allianceId: nationsTable.allianceId,
    beigeUntil: nationsTable.beigeUntil,
    createdAt: nationsTable.createdAt,
  }).from(nationsTable);

  const allNations = await (search
    ? db.select({ id: nationsTable.id, name: nationsTable.name, leaderName: nationsTable.leaderName, continent: nationsTable.continent, governmentType: nationsTable.governmentType, score: nationsTable.score, flag: nationsTable.flag, allianceId: nationsTable.allianceId, beigeUntil: nationsTable.beigeUntil, createdAt: nationsTable.createdAt }).from(nationsTable).where(ilike(nationsTable.name, `%${search}%`)).limit(limit).offset(offset)
    : db.select({ id: nationsTable.id, name: nationsTable.name, leaderName: nationsTable.leaderName, continent: nationsTable.continent, governmentType: nationsTable.governmentType, score: nationsTable.score, flag: nationsTable.flag, allianceId: nationsTable.allianceId, beigeUntil: nationsTable.beigeUntil, createdAt: nationsTable.createdAt }).from(nationsTable).limit(limit).offset(offset));

  const total = await db.select({ count: count() }).from(nationsTable);

  // Enrich with cityCount and allianceName
  const enriched = await Promise.all(allNations.map(async (n) => {
    const cities = await db.select({ id: citiesTable.id }).from(citiesTable).where(eq(citiesTable.nationId, n.id));
    let allianceName: string | null = null;
    if (n.allianceId) {
      const [alliance] = await db.select().from(alliancesTable).where(eq(alliancesTable.id, n.allianceId));
      if (alliance) allianceName = alliance.name;
    }
    return { ...n, cityCount: cities.length, allianceName };
  }));

  res.json({ nations: enriched, total: total[0]?.count ?? 0 });
});

// GET /api/nations/me
router.get("/nations/me", requireAuth, async (req, res) => {
  const detail = await getNationDetail(req.session.nationId!);
  if (!detail) { res.status(404).json({ error: "Nation not found" }); return; }
  res.json(detail);
});

// PATCH /api/nations/me
router.patch("/nations/me", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const { leaderName, flag, taxRate, warPolicy, domesticPolicy } = req.body;
  const updates: Record<string, unknown> = {};
  if (leaderName !== undefined) updates.leaderName = leaderName;
  if (flag !== undefined) updates.flag = flag;
  if (taxRate !== undefined) updates.taxRate = Math.min(100, Math.max(0, taxRate));
  if (warPolicy !== undefined) updates.warPolicy = warPolicy;
  if (domesticPolicy !== undefined) updates.domesticPolicy = domesticPolicy;
  await db.update(nationsTable).set(updates).where(eq(nationsTable.id, nationId));
  const detail = await getNationDetail(nationId);
  res.json(detail);
});

// POST /api/nations/me/collect-taxes
router.post("/nations/me/collect-taxes", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const [nation] = await db.select().from(nationsTable).where(eq(nationsTable.id, nationId));

  const now = new Date();
  const cooldown = 2 * 60 * 60 * 1000; // 2 hours
  if (nation.taxCollectedAt && now.getTime() - nation.taxCollectedAt.getTime() < cooldown) {
    const nextAvailableAt = new Date(nation.taxCollectedAt.getTime() + cooldown);
    res.status(400).json({ error: "Too soon to collect taxes", nextAvailableAt });
    return;
  }

  const cities = await db.select().from(citiesTable).where(eq(citiesTable.nationId, nationId));
  const income = calcTaxIncome(cities, nation.taxRate);

  await db.update(resourcesTable)
    .set({ money: sql`money + ${income}` })
    .where(eq(resourcesTable.nationId, nationId));
  await db.update(nationsTable)
    .set({ taxCollectedAt: now })
    .where(eq(nationsTable.id, nationId));

  const [resources] = await db.select().from(resourcesTable).where(eq(resourcesTable.nationId, nationId));
  const nextAvailableAt = new Date(now.getTime() + cooldown);
  res.json({ moneyCollected: income, nextAvailableAt, resources });
});

// POST /api/nations/me/change-government
router.post("/nations/me/change-government", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const { governmentType } = req.body;
  const validTypes = ["Democracy", "Republic", "Monarchy", "Dictatorship", "Communist", "Theocracy", "Oligarchy", "Anarchy"];
  if (!validTypes.includes(governmentType)) {
    res.status(400).json({ error: "Invalid government type" });
    return;
  }
  await db.update(nationsTable).set({ governmentType }).where(eq(nationsTable.id, nationId));
  const detail = await getNationDetail(nationId);
  res.json(detail);
});

// GET /api/nations/:nationId
router.get("/nations/:nationId", async (req, res) => {
  const nationId = parseInt(req.params.nationId);
  const detail = await getNationDetail(nationId);
  if (!detail) { res.status(404).json({ error: "Nation not found" }); return; }
  res.json(detail);
});

export { getNationDetail };
export default router;
