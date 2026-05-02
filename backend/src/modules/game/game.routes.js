const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const { listGames, createGame, getGame, updateGame, deleteGame } = require("./game.controller");

const router = express.Router();

router.get("/",    listGames);
router.get("/:id", getGame);
router.post("/",        requireAuth, requireRole("admin"), createGame);
router.patch("/:id",    requireAuth, requireRole("admin"), updateGame);
router.delete("/:id",   requireAuth, requireRole("admin"), deleteGame);

module.exports = router;