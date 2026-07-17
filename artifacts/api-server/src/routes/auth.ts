import { Router } from "express";
import bcrypt from "bcrypt";
import { db, usersTable, nationsTable, resourcesTable, citiesTable, militaryTable, alliancesTable, allianceMembersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/session";

const router = Router();

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

export default router;
