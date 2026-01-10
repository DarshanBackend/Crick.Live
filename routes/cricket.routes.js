import express from "express";
import {
  home,
  liveMatches,
  scoreCard,
  commentary,
  matchInfo
} from "../controllers/cricket.controller.js";

const router = express.Router();

router.get("/home", home);
router.get("/live", liveMatches);
router.get("/match/:matchId/scorecard", scoreCard);
router.get("/match/:matchId/commentary", commentary);
router.get("/match/:matchId", matchInfo);

export default router;