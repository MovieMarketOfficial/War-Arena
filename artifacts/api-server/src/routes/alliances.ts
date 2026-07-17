import { Router } from "express";
import { db, alliancesTable, allianceMembersTable, nationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/session";

const router = Router();

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

export default router;
