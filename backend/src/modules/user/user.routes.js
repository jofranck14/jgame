const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { requireRole, protectSuperAdmin } = require("../../middlewares/role.middleware");
const { uploadAvatar } = require("../../middlewares/upload.middleware");
const {
  getMe, patchMe, getPublicProfile, getMyStatsByGame,
  listUsers, updateUserAdmin, deleteUser,
  getUserGames, addUserGame, removeUserGame,
} = require("./user.controller");

const router = express.Router();

// Routes "me" AVANT /:id
router.get("/me",               requireAuth, getMe);
router.patch("/me",             requireAuth, uploadAvatar.single("avatar"), patchMe);
router.get("/me/stats/by-game", requireAuth, getMyStatsByGame);

// Admin : liste tous les users (avec filtres matchmaking)
router.get("/",                 requireAuth, requireRole("admin", "organizer", "player"), listUsers);

// User games
router.get("/:id/games",        getUserGames);
router.post("/:id/games",       requireAuth, addUserGame);
router.delete("/:id/games/:gameId", requireAuth, removeUserGame);

// Admin : modifier / supprimer
router.patch("/:id",  requireAuth, requireRole("admin"), protectSuperAdmin, updateUserAdmin);
router.delete("/:id", requireAuth, requireRole("admin"), protectSuperAdmin, deleteUser);

// Profil public — en dernier
router.get("/:id", getPublicProfile);

module.exports = router;