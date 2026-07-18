import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import bcrypt from "bcrypt";
import { db, usersTable, nationsTable, resourcesTable, citiesTable, militaryTable, alliancesTable, allianceMembersTable, warsTable, attacksTable, marketOffersTable, messagesTable } from "@workspace/db";
import { eq, ilike, sql, count, or, and, desc } from "drizzle-orm";
import { requireAuth } from "./lib/session";
import { calcNationScore, calcTaxIncome, calcCityPopulation, CITY_BASE_COST, CITY_COST_PER_CITY, INFRA_COST, LAND_COST, MILITARY_COSTS, simulateAttack, type AttackType } from "./lib/game";

const router: IRouter = Router();

// --- from health.ts ---
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// --- from auth.ts ---
// Helper to build full auth response
async function buildAuthResponse(userId: number, nationId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const [nation] = await db.select().from(nationsTable).where(eq(nationsTable.id, nationId));
  const [resources] = await db.select().from(resourcesTable).where(eq(resourcesTable.nationId, nationId));

  let allianceName: string | null = null;
  if (nation.allianceId) {
    const [alliance] = await db.select().from(alliancesTable).where(eq(alliancesTable.id, nation.allianceId));
    if (alliance) allianceName = alliance.name;
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    },
    nation: {
      id: nation.id,
      name: nation.name,
      leaderName: nation.leaderName,
      continent: nation.continent,
      governmentType: nation.governmentType,
      score: nation.score,
      cityCount: 0, // computed below
      population: nation.population,
      gdp: nation.gdp,
      taxRate: nation.taxRate,
      taxCollectedAt: nation.taxCollectedAt,
      flag: nation.flag,
      allianceId: nation.allianceId,
      allianceName,
      beigeUntil: nation.beigeUntil,
      warPolicy: nation.warPolicy,
      domesticPolicy: nation.domesticPolicy,
      resources: resources ?? { money: 5000, food: 200, coal: 0, oil: 0, iron: 0, bauxite: 0, lead: 0, uranium: 0, gasoline: 0, steel: 0, munitions: 0, aluminum: 0 },
      createdAt: nation.createdAt,
    },
  };
}

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  const { username, password, nationName, leaderName, continent, governmentType, flag } = req.body;

  if (!username || !password || !nationName || !leaderName || !continent || !governmentType) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // Check uniqueness
  const existingUser = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existingUser.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }
  const existingNation = await db.select().from(nationsTable).where(eq(nationsTable.name, nationName));
  if (existingNation.length > 0) {
    res.status(409).json({ error: "Nation name already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ username, passwordHash }).returning();

  // Random map position
  const mapX = Math.random() * 360 - 180;
  const mapY = Math.random() * 140 - 70;

  const [nation] = await db.insert(nationsTable).values({
    userId: user.id,
    name: nationName,
    leaderName,
    continent,
    governmentType,
    flag: flag ?? null,
    mapX,
    mapY,
  }).returning();

  // Initial resources, city, military
  await db.insert(resourcesTable).values({ nationId: nation.id });
  const [city] = await db.insert(citiesTable).values({
    nationId: nation.id,
    name: `${nationName} City`,
    infrastructure: 100,
    land: 250,
  }).returning();
  await db.insert(militaryTable).values({ nationId: nation.id });

  // Update city count
  await db.update(nationsTable).set({ score: 100 }).where(eq(nationsTable.id, nation.id));

  req.session.userId = user.id;
  req.session.nationId = nation.id;

  const response = await buildAuthResponse(user.id, nation.id);
  response.nation.cityCount = 1;
  res.status(201).json(response);
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(401).json({ error: "Username and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const [nation] = await db.select().from(nationsTable).where(eq(nationsTable.userId, user.id));
  if (!nation) {
    res.status(401).json({ error: "No nation found for user" });
    return;
  }

  req.session.userId = user.id;
  req.session.nationId = nation.id;

  const cities = await db.select().from(citiesTable).where(eq(citiesTable.nationId, nation.id));
  const response = await buildAuthResponse(user.id, nation.id);
  response.nation.cityCount = cities.length;
  res.json(response);
});

// POST /api/auth/logout
router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const nationId = req.session.nationId!;
  const cities = await db.select().from(citiesTable).where(eq(citiesTable.nationId, nationId));
  const response = await buildAuthResponse(userId, nationId);
  response.nation.cityCount = cities.length;
  res.json(response);
});

// --- from nations.ts ---
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

// GET /api/nations/:nationId/rank
router.get("/nations/:nationId/rank", async (req, res) => {
  const nationId = parseInt(req.params.nationId);
  const [nation] = await db.select({ score: nationsTable.score }).from(nationsTable).where(eq(nationsTable.id, nationId));
  if (!nation) { res.status(404).json({ error: "Nation not found" }); return; }
  const [{ count: total }] = await db.select({ count: count() }).from(nationsTable);
  const [{ count: higherOrEqual }] = await db.select({ count: count() }).from(nationsTable).where(sql`${nationsTable.score} > ${nation.score}`);
  const rank = (higherOrEqual ?? 0) + 1;
  const percentile = total > 0 ? (((rank - 1) / total) * 100).toFixed(2) : "0.00";
  res.json({ nationId, rank, total, percentile });
});

export { getNationDetail };

// --- from cities.ts ---
function formatCity(city: typeof citiesTable.$inferSelect) {
  return {
    id: city.id,
    nationId: city.nationId,
    name: city.name,
    infrastructure: city.infrastructure,
    land: city.land,
    commerce: city.commerce,
    industry: city.industry,
    population: calcCityPopulation(city.infrastructure),
    income: city.infrastructure * 2 + city.commerce * 300,
    createdAt: city.createdAt,
  };
}

// GET /api/nations/me/cities
router.get("/nations/me/cities", requireAuth, async (req, res) => {
  const cities = await db.select().from(citiesTable).where(eq(citiesTable.nationId, req.session.nationId!));
  res.json(cities.map(formatCity));
});

// POST /api/nations/me/cities
router.post("/nations/me/cities", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const { name } = req.body;
  if (!name || name.length < 2) {
    res.status(400).json({ error: "City name must be at least 2 characters" });
    return;
  }

  const existingCities = await db.select().from(citiesTable).where(eq(citiesTable.nationId, nationId));
  const cost = CITY_BASE_COST + existingCities.length * CITY_COST_PER_CITY;

  const [resources] = await db.select().from(resourcesTable).where(eq(resourcesTable.nationId, nationId));
  if (resources.money < cost) {
    res.status(400).json({ error: `Insufficient funds. Need $${cost.toLocaleString()}` });
    return;
  }

  await db.update(resourcesTable).set({ money: sql`money - ${cost}` }).where(eq(resourcesTable.nationId, nationId));
  const [city] = await db.insert(citiesTable).values({ nationId, name }).returning();

  // Update nation score
  const mil = await db.select().from(militaryTable).where(eq(militaryTable.nationId, nationId));
  const allCities = [...existingCities, city];
  const totalInfra = allCities.reduce((s, c) => s + c.infrastructure, 0);
  const m = mil[0] ?? { soldiers: 0, tanks: 0, aircraft: 0, ships: 0, missiles: 0, nukes: 0 };
  const score = calcNationScore(allCities.length, totalInfra, m);
  await db.update(nationsTable).set({ score }).where(eq(nationsTable.id, nationId));

  res.status(201).json(formatCity(city));
});

// GET /api/nations/:nationId/cities
router.get("/nations/:nationId/cities", async (req, res) => {
  const nationId = parseInt(req.params.nationId);
  const cities = await db.select().from(citiesTable).where(eq(citiesTable.nationId, nationId));
  res.json(cities.map(formatCity));
});

// POST /api/nations/me/cities/:cityId/improve
router.post("/nations/me/cities/:cityId/improve", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const cityId = parseInt(req.params.cityId);
  const { type, amount } = req.body;

  const [city] = await db.select().from(citiesTable).where(eq(citiesTable.id, cityId));
  if (!city || city.nationId !== nationId) {
    res.status(404).json({ error: "City not found" });
    return;
  }

  let cost = 0;
  const updates: Record<string, unknown> = {};

  if (type === "infrastructure") {
    cost = amount * INFRA_COST;
    updates.infrastructure = sql`infrastructure + ${amount}`;
  } else if (type === "land") {
    cost = amount * LAND_COST;
    updates.land = sql`land + ${amount}`;
  } else if (type === "commerce") {
    cost = amount * 10_000;
    updates.commerce = sql`commerce + ${Math.round(amount)}`;
  } else if (type === "industry") {
    cost = amount * 15_000;
    updates.industry = sql`industry + ${Math.round(amount)}`;
  } else {
    res.status(400).json({ error: "Invalid improvement type" });
    return;
  }

  const [resources] = await db.select().from(resourcesTable).where(eq(resourcesTable.nationId, nationId));
  if (resources.money < cost) {
    res.status(400).json({ error: `Insufficient funds. Need $${cost.toLocaleString()}` });
    return;
  }

  await db.update(resourcesTable).set({ money: sql`money - ${cost}` }).where(eq(resourcesTable.nationId, nationId));
  await db.update(citiesTable).set(updates).where(eq(citiesTable.id, cityId));

  const [updated] = await db.select().from(citiesTable).where(eq(citiesTable.id, cityId));
  res.json(formatCity(updated));
});

// --- from military.ts ---
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

// --- from wars.ts ---
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

// --- from alliances.ts ---
async function getAllianceDetail(allianceId: number, myNationId?: number) {
  const [alliance] = await db.select().from(alliancesTable).where(eq(alliancesTable.id, allianceId));
  if (!alliance) return null;

  const memberRows = await db.select().from(allianceMembersTable).where(eq(allianceMembersTable.allianceId, allianceId));
  const members = await Promise.all(memberRows.map(async (m) => {
    const [nation] = await db.select().from(nationsTable).where(eq(nationsTable.id, m.nationId));
    return {
      nationId: m.nationId,
      nationName: nation?.name ?? "Unknown",
      leaderName: nation?.leaderName ?? "",
      role: m.role,
      score: nation?.score ?? 0,
      joinedAt: m.joinedAt,
    };
  }));

  const isOfficer = myNationId ? members.some(m => m.nationId === myNationId && (m.role === "leader" || m.role === "officer")) : false;

  return {
    id: alliance.id,
    name: alliance.name,
    acronym: alliance.acronym,
    description: alliance.description,
    flag: alliance.flag,
    forumUrl: alliance.forumUrl,
    score: alliance.score,
    members: members.filter(m => m.role !== "applicant"),
    pendingApplications: isOfficer ? members.filter(m => m.role === "applicant") : [],
    createdAt: alliance.createdAt,
  };
}

// GET /api/alliances
router.get("/alliances", async (_req, res) => {
  const alliances = await db.select().from(alliancesTable);
  const enriched = await Promise.all(alliances.map(async (a) => {
    const members = await db.select().from(allianceMembersTable).where(and(eq(allianceMembersTable.allianceId, a.id), eq(allianceMembersTable.role, "member")));
    const leaders = await db.select().from(allianceMembersTable).where(and(eq(allianceMembersTable.allianceId, a.id), eq(allianceMembersTable.role, "leader")));
    const officers = await db.select().from(allianceMembersTable).where(and(eq(allianceMembersTable.allianceId, a.id), eq(allianceMembersTable.role, "officer")));
    return {
      id: a.id,
      name: a.name,
      acronym: a.acronym,
      memberCount: members.length + leaders.length + officers.length,
      score: a.score,
      flag: a.flag,
      forumUrl: a.forumUrl,
      createdAt: a.createdAt,
    };
  }));
  res.json(enriched);
});

// POST /api/alliances
router.post("/alliances", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;

  // Check if already in alliance
  const [existing] = await db.select().from(allianceMembersTable).where(eq(allianceMembersTable.nationId, nationId));
  if (existing) { res.status(400).json({ error: "Already in an alliance" }); return; }

  const { name, acronym, description, flag, forumUrl } = req.body;
  if (!name || !acronym) { res.status(400).json({ error: "Name and acronym required" }); return; }

  const [alliance] = await db.insert(alliancesTable).values({ name, acronym, description, flag, forumUrl }).returning();
  await db.insert(allianceMembersTable).values({ nationId, allianceId: alliance.id, role: "leader" });
  await db.update(nationsTable).set({ allianceId: alliance.id }).where(eq(nationsTable.id, nationId));

  const detail = await getAllianceDetail(alliance.id, nationId);
  res.status(201).json(detail);
});

// GET /api/alliances/:allianceId
router.get("/alliances/:allianceId", async (req, res) => {
  const allianceId = parseInt(req.params.allianceId);
  const detail = await getAllianceDetail(allianceId);
  if (!detail) { res.status(404).json({ error: "Alliance not found" }); return; }
  res.json(detail);
});

// POST /api/alliances/:allianceId/apply
router.post("/alliances/:allianceId/apply", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const allianceId = parseInt(req.params.allianceId);

  const [existing] = await db.select().from(allianceMembersTable).where(eq(allianceMembersTable.nationId, nationId));
  if (existing) { res.status(400).json({ error: "Already in an alliance" }); return; }

  await db.insert(allianceMembersTable).values({ nationId, allianceId, role: "applicant" });
  res.json({ success: true });
});

// PUT /api/alliances/:allianceId/applications/:nationId
router.put("/alliances/:allianceId/applications/:applicantNationId", requireAuth, async (req, res) => {
  const officerNationId = req.session.nationId!;
  const allianceId = parseInt(req.params.allianceId);
  const applicantNationId = parseInt(req.params.applicantNationId);
  const { accepted } = req.body;

  // Check officer
  const [officerMembership] = await db.select().from(allianceMembersTable).where(and(eq(allianceMembersTable.nationId, officerNationId), eq(allianceMembersTable.allianceId, allianceId)));
  if (!officerMembership || !["leader", "officer"].includes(officerMembership.role)) {
    res.status(403).json({ error: "Not authorized" }); return;
  }

  if (accepted) {
    await db.update(allianceMembersTable).set({ role: "member" }).where(and(eq(allianceMembersTable.nationId, applicantNationId), eq(allianceMembersTable.allianceId, allianceId)));
    await db.update(nationsTable).set({ allianceId }).where(eq(nationsTable.id, applicantNationId));
  } else {
    await db.delete(allianceMembersTable).where(and(eq(allianceMembersTable.nationId, applicantNationId), eq(allianceMembersTable.allianceId, allianceId)));
  }

  res.json({ success: true });
});

// POST /api/alliances/:allianceId/leave
router.post("/alliances/:allianceId/leave", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const allianceId = parseInt(req.params.allianceId);
  await db.delete(allianceMembersTable).where(and(eq(allianceMembersTable.nationId, nationId), eq(allianceMembersTable.allianceId, allianceId)));
  await db.update(nationsTable).set({ allianceId: null }).where(eq(nationsTable.id, nationId));
  res.json({ success: true });
});

// --- from market.ts ---
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

// --- from diplomacy.ts ---
async function enrichMessage(msg: typeof messagesTable.$inferSelect) {
  const [from] = await db.select({ name: nationsTable.name }).from(nationsTable).where(eq(nationsTable.id, msg.fromNationId));
  const [to] = await db.select({ name: nationsTable.name }).from(nationsTable).where(eq(nationsTable.id, msg.toNationId));
  return {
    ...msg,
    fromNationName: from?.name ?? "Unknown",
    toNationName: to?.name ?? "Unknown",
  };
}

// GET /api/messages
router.get("/messages", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const type = req.query.type === "sent" ? "sent" : "inbox";

  const msgs = type === "inbox"
    ? await db.select().from(messagesTable).where(eq(messagesTable.toNationId, nationId))
    : await db.select().from(messagesTable).where(eq(messagesTable.fromNationId, nationId));

  const enriched = await Promise.all(msgs.map(enrichMessage));
  res.json(enriched);
});

// POST /api/messages
router.post("/messages", requireAuth, async (req, res) => {
  const fromNationId = req.session.nationId!;
  const { toNationId, subject, body } = req.body;

  const [targetNation] = await db.select().from(nationsTable).where(eq(nationsTable.id, parseInt(toNationId)));
  if (!targetNation) { res.status(400).json({ error: "Target nation not found" }); return; }

  const [msg] = await db.insert(messagesTable).values({ fromNationId, toNationId: parseInt(toNationId), subject, body }).returning();
  const enriched = await enrichMessage(msg);
  res.status(201).json(enriched);
});

// GET /api/messages/:messageId
router.get("/messages/:messageId", requireAuth, async (req, res) => {
  const nationId = req.session.nationId!;
  const messageId = parseInt(req.params.messageId);

  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId));
  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
  if (msg.toNationId !== nationId && msg.fromNationId !== nationId) { res.status(403).json({ error: "Not authorized" }); return; }

  // Mark as read
  if (msg.toNationId === nationId && !msg.read) {
    await db.update(messagesTable).set({ read: true }).where(eq(messagesTable.id, messageId));
  }

  const enriched = await enrichMessage({ ...msg, read: true });
  res.json(enriched);
});

// --- from map.ts ---
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

// --- from leaderboard.ts ---
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