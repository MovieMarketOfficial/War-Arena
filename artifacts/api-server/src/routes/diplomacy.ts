import { Router } from "express";
import { db, messagesTable, nationsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { requireAuth } from "../lib/session";

const router = Router();

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

export default router;
