import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import nationsRouter from "./nations";
import citiesRouter from "./cities";
import militaryRouter from "./military";
import warsRouter from "./wars";
import alliancesRouter from "./alliances";
import marketRouter from "./market";
import diplomacyRouter from "./diplomacy";
import mapRouter from "./map";
import leaderboardRouter from "./leaderboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(nationsRouter);
router.use(citiesRouter);
router.use(militaryRouter);
router.use(warsRouter);
router.use(alliancesRouter);
router.use(marketRouter);
router.use(diplomacyRouter);
router.use(mapRouter);
router.use(leaderboardRouter);

export default router;
