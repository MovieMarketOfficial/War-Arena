import { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId: number;
    nationId: number;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId || !req.session.nationId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}
