import { Router } from "express";
import { db, citiesTable, resourcesTable, nationsTable, militaryTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/session";
import { CITY_BASE_COST, CITY_COST_PER_CITY, INFRA_COST, LAND_COST, calcNationScore, calcCityPopulation } from "../lib/game";

const router = Router();

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

export default router;
