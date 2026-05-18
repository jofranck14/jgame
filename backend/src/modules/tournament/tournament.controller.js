const tournamentService = require("./tournament.service");

function toInt(v, f) {
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n)) { const e = new Error(`${f} must be integer`); e.statusCode = 400; throw e; }
  return n;
}

async function createTournament(req, res, next) {
  try {
    const title            = String(req.body?.title || "").trim();
    const game_id          = toInt(req.body?.game_id, "game_id");
    const price            = Number(req.body?.price) || 0;
    const max_players      = toInt(req.body?.max_players, "max_players");
    const date             = req.body?.date;
    const city             = req.body?.city ? String(req.body.city).trim() : null;
    const type             = req.body?.type === "physical" ? "physical" : "online";
    const location_details = req.body?.location_details ? String(req.body.location_details).trim() : null;
    if (!title) { res.status(400); return next(new Error("title required")); }
    if (!date)  { res.status(400); return next(new Error("date required")); }
    const tournament = await tournamentService.createTournament(req.user.id, {
      title, game_id, price, max_players, date, city, type, location_details,
    });
    return res.status(201).json({ tournament });
  } catch (e) { if (e?.statusCode) res.status(e.statusCode); return next(e); }
}

async function listTournaments(req, res, next) {
  try {
    const game_id = req.query.game_id ? Number.parseInt(req.query.game_id, 10) : null;
    return res.json({ tournaments: await tournamentService.listTournaments(game_id) });
  } catch (e) { return next(e); }
}

async function getTournament(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400); return next(new Error("Invalid id")); }
    const tournament = await tournamentService.getTournamentById(id);
    if (!tournament) { res.status(404); return next(new Error("Not found")); }
    return res.json({ tournament });
  } catch (e) { return next(e); }
}

async function joinTournament(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400); return next(new Error("Invalid id")); }
    const result = await tournamentService.joinTournament(id, req.user.id);
    if (result?.paymentRequired) return res.json(result);
    return res.json({ tournament: result });
  } catch (e) { if (e?.statusCode) res.status(e.statusCode); return next(e); }
}

async function updateTournament(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400); return next(new Error("Invalid id")); }
    const allowed = ["title","status","city","type","max_players","price","start_date","location_details"];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    return res.json({ tournament: await tournamentService.updateTournament(id, updates) });
  } catch (e) { return next(e); }
}

async function deleteTournament(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400); return next(new Error("Invalid id")); }
    await tournamentService.deleteTournament(id);
    return res.json({ message: "Tournament deleted" });
  } catch (e) { return next(e); }
}

async function messageParticipants(req, res, next) {
  try {
    const id      = toInt(req.params.id, "id");
    const message = String(req.body?.message || "").trim();
    if (!message) { res.status(400); return next(new Error("message required")); }

    const tournament = await tournamentService.getTournamentById(id);
    if (!tournament) { res.status(404); return next(new Error("Not found")); }
    if (tournament.organizer_id !== req.user.id && req.user.role !== "admin") {
      res.status(403); return next(new Error("Forbidden"));
    }

    const result = await tournamentService.messageParticipants(id, req.user.id, message);
    return res.json({ message: "Messages envoyés", sent: result.sent });
  } catch (e) {
    if (e?.statusCode) res.status(e.statusCode);
    return next(e);
  }
}

module.exports = {
  createTournament, listTournaments, getTournament,
  joinTournament, updateTournament, deleteTournament, messageParticipants
};