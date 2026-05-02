const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const { submitResults, getTournamentResults, getLeaderboard, getGameLeaderboard } = require("./result.controller");

const router = express.Router();

router.post("/", requireAuth, requireRole("organizer", "admin"), submitResults);
router.get("/leaderboard", getLeaderboard);
router.get("/leaderboard/:game_id", getGameLeaderboard);
router.get("/:tournament_id", getTournamentResults);

module.exports = router;