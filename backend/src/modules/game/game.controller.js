const gameService = require("./game.service");

async function listGames(req, res, next) {
  try {
    const games = await gameService.listGames();
    return res.status(200).json({ games });
  } catch (err) { return next(err); }
}

async function createGame(req, res, next) {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) { res.status(400); return next(new Error("Name is required")); }
    const game = await gameService.createGame({ name });
    return res.status(201).json({ game });
  } catch (err) { return next(err); }
}

async function getGame(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400); return next(new Error("Invalid game id")); }
    const game = await gameService.getGameById(id);
    if (!game) { res.status(404); return next(new Error("Game not found")); }
    return res.status(200).json({ game });
  } catch (err) { return next(err); }
}

async function updateGame(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400); return next(new Error("Invalid game id")); }
    const name = String(req.body?.name || "").trim();
    if (!name) { res.status(400); return next(new Error("Name is required")); }
    const game = await gameService.updateGame(id, { name });
    if (!game) { res.status(404); return next(new Error("Game not found")); }
    return res.status(200).json({ game });
  } catch (err) { return next(err); }
}

async function deleteGame(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400); return next(new Error("Invalid game id")); }
    await gameService.deleteGame(id);
    return res.status(200).json({ message: "Game deleted" });
  } catch (err) { return next(err); }
}

module.exports = { listGames, createGame, getGame, updateGame, deleteGame };