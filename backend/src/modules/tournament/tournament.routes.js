const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const {
  createTournament, listTournaments, getTournament,
  joinTournament, updateTournament, deleteTournament, messageParticipants
} = require("./tournament.controller");

const router = express.Router();
router.get("/",    listTournaments);
router.get("/:id", getTournament);
router.post("/",                requireAuth, requireRole("organizer","admin"), createTournament);
router.post("/:id/join",        requireAuth, joinTournament);
router.post("/:id/message",     requireAuth, messageParticipants);
router.patch("/:id",            requireAuth, requireRole("organizer","admin"), updateTournament);
router.delete("/:id",           requireAuth, requireRole("admin"), deleteTournament);
module.exports = router;