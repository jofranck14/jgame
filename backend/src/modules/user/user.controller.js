const userService = require("./user.service");

async function getMe(req, res, next) {
  try { return res.json({ user: await userService.getMe(req.user.id) }); }
  catch (e) { return next(e); }
}

async function patchMe(req, res, next) {
  try {
    const { username, phone, city, bio } = req.body || {};
    const avatar = req.file?.path ?? undefined;
    const user = await userService.updateMe(req.user.id, { username, phone, city, bio, avatar });
    return res.json({ user });
  } catch (e) { if (e?.statusCode) res.status(e.statusCode); return next(e); }
}

async function getPublicProfile(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400); return next(new Error("Invalid user id")); }
    const user = await userService.getPublicProfileById(id);
    if (!user) { res.status(404); return next(new Error("User not found")); }
    return res.json({ user });
  } catch (e) { return next(e); }
}

async function getMyStatsByGame(req, res, next) {
  try { return res.json({ stats: await userService.getMyStatsByGame(req.user.id) }); }
  catch (e) { return next(e); }
}

async function listUsers(req, res, next) {
  try {
    const { game_id, city, level, role } = req.query;
    const users = await userService.listUsers({ game_id, city, level, role });
    return res.json({ users });
  } catch (e) { return next(e); }
}

async function updateUserAdmin(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400); return next(new Error("Invalid id")); }
    const user = await userService.updateUserAdmin(id, req.body || {});
    return res.json({ user });
  } catch (e) { if (e?.statusCode) res.status(e.statusCode); return next(e); }
}

async function deleteUser(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400); return next(new Error("Invalid id")); }
    if (id === req.user.id) { res.status(400); return next(new Error("Cannot delete your own account")); }
    await userService.deleteUser(id);
    return res.json({ message: "User deleted" });
  } catch (e) { return next(e); }
}

async function getUserGames(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400); return next(new Error("Invalid id")); }
    return res.json({ games: await userService.getUserGames(id) });
  } catch (e) { return next(e); }
}

async function addUserGame(req, res, next) {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    if (userId !== req.user.id && req.user.role !== "admin") { res.status(403); return next(new Error("Forbidden")); }
    const gameId = Number.parseInt(req.body?.game_id, 10);
    if (!Number.isFinite(gameId)) { res.status(400); return next(new Error("Invalid game_id")); }
    return res.status(201).json({ userGame: await userService.addUserGame(userId, gameId) });
  } catch (e) { if (e?.statusCode) res.status(e.statusCode); return next(e); }
}

async function removeUserGame(req, res, next) {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    if (userId !== req.user.id && req.user.role !== "admin") { res.status(403); return next(new Error("Forbidden")); }
    const gameId = Number.parseInt(req.params.gameId, 10);
    if (!Number.isFinite(gameId)) { res.status(400); return next(new Error("Invalid gameId")); }
    await userService.removeUserGame(userId, gameId);
    return res.json({ message: "Game removed" });
  } catch (e) { return next(e); }
}

module.exports = { getMe, patchMe, getPublicProfile, getMyStatsByGame, listUsers, updateUserAdmin, deleteUser, getUserGames, addUserGame, removeUserGame };