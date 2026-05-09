const resultService = require("./result.service");

function toInt(value, fieldName) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) {
    const err = new Error(`${fieldName} must be an integer`);
    err.statusCode = 400;
    throw err;
  }
  return n;
}

async function submitResults(req, res, next) {
  try {
    const tournament_id = toInt(req.body?.tournament_id, "tournament_id");
    const rankings = req.body?.rankings;

    if (!Array.isArray(rankings) || rankings.length === 0) {
      res.status(400);
      return next(new Error("rankings must be a non-empty array"));
    }

    // Validate each entry
    for (const entry of rankings) {
      toInt(entry?.user_id, "user_id");
      toInt(entry?.rank, "rank");
      if (entry.rank < 1 || entry.rank > 3) {
        res.status(400);
        return next(new Error("rank must be 1, 2 or 3"));
      }
    }

    const result = await resultService.submitResults(tournament_id, rankings);
    return res.status(201).json(result);
  } catch (err) {
    if (err?.statusCode) res.status(err.statusCode);
    return next(err);
  }
}

async function getTournamentResults(req, res, next) {
  try {
    const tournament_id = toInt(req.params.tournament_id, "tournament_id");
    const results = await resultService.getTournamentResults(tournament_id);
    return res.status(200).json({ results });
  } catch (err) {
    return next(err);
  }
}

async function getLeaderboard(req, res, next) {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit) || 1000, 10000);
    const leaderboard = await resultService.getGlobalLeaderboard(limit);
    return res.status(200).json({ leaderboard });
  } catch (err) {
    return next(err);
  }
}

async function getGameLeaderboard(req, res, next) {
  try {
    const game_id = toInt(req.params.game_id, "game_id");
    const limit = Math.min(Number.parseInt(req.query.limit) || 1000, 10000);
    const leaderboard = await resultService.getGameLeaderboard(game_id, limit);
    return res.status(200).json({ leaderboard });
  } catch (err) {
    return next(err);
  }
}

module.exports = { submitResults, getTournamentResults, getLeaderboard, getGameLeaderboard };