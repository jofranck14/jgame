const { pool } = require("../../config/db");

const POINTS_MAP = { 1: 20, 2: 10, 3: 5 };
const LEVEL_MAP  = [{ min: 200, label: "goat" }, { min: 100, label: "legendary" }, { min: 0, label: "beginner" }];
function getLevel(points) { return LEVEL_MAP.find((l) => points >= l.min)?.label ?? "beginner"; }

async function submitResults(tournament_id, rankings) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tRes = await client.query(
      "SELECT id, game_id, status FROM tournaments WHERE id = $1 LIMIT 1 FOR UPDATE", [tournament_id],
    );
    const tournament = tRes.rows[0];
    if (!tournament) { const err = new Error("Tournament not found"); err.statusCode = 404; throw err; }
    if (tournament.status === "completed") { const err = new Error("Results already submitted"); err.statusCode = 409; throw err; }

    const game_id  = tournament.game_id;
    const inserted = [];

    for (const entry of rankings) {
      const user_id        = Number.parseInt(String(entry.user_id), 10);
      const rank           = Number.parseInt(String(entry.rank), 10);
      const points_awarded = POINTS_MAP[rank] ?? 0;

      await client.query(
        "INSERT INTO results (tournament_id, user_id, rank_position, points_awarded) VALUES ($1, $2, $3, $4)",
        [tournament_id, user_id, rank, points_awarded],
      );
      await client.query("UPDATE users SET points = points + $1 WHERE id = $2", [points_awarded, user_id]);

      // PostgreSQL : ON CONFLICT à la place de ON DUPLICATE KEY
      await client.query(
        `INSERT INTO user_game_stats (user_id, game_id, points, wins, losses)
         VALUES ($1, $2, $3, $4, 0)
         ON CONFLICT (user_id, game_id) DO UPDATE SET
           points = user_game_stats.points + EXCLUDED.points,
           wins   = user_game_stats.wins + CASE WHEN EXCLUDED.wins > 0 THEN 1 ELSE 0 END`,
        [user_id, game_id, points_awarded, rank === 1 ? 1 : 0],
      );

      const ugRes = await client.query(
        "SELECT id FROM user_games WHERE user_id = $1 AND game_id = $2 LIMIT 1", [user_id, game_id],
      );
      if (ugRes.rows.length > 0) {
        await client.query(
          "UPDATE user_games SET points = points + $1 WHERE user_id = $2 AND game_id = $3",
          [points_awarded, user_id, game_id],
        );
      }

      const uRes = await client.query("SELECT points FROM users WHERE id = $1 LIMIT 1", [user_id]);
      const totalPoints = Number(uRes.rows[0]?.points) || 0;
      inserted.push({ user_id, rank, points_awarded, total_points: totalPoints, level: getLevel(totalPoints) });
    }

    await client.query("UPDATE tournaments SET status = 'completed' WHERE id = $1", [tournament_id]);
    await client.query("COMMIT");
    return { tournament_id, results: inserted };
  } catch (err) { await client.query("ROLLBACK"); throw err; }
  finally { client.release(); }
}

async function getTournamentResults(tournament_id) {
  const { rows } = await pool.query(
    `SELECT r.rank_position AS rank, r.points_awarded,
        u.id AS user_id, u.username, u.avatar, u.points AS total_points
     FROM results r JOIN users u ON u.id = r.user_id
     WHERE r.tournament_id = $1 ORDER BY r.rank_position ASC`,
    [tournament_id],
  );
  return rows;
}

async function getGlobalLeaderboard(limit = 100) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const { rows } = await pool.query(
    `SELECT id AS user_id, username, avatar, points,
        CASE WHEN points >= 200 THEN 'goat' WHEN points >= 100 THEN 'legendary' ELSE 'beginner' END AS level
     FROM users WHERE is_banned = 0 ORDER BY points DESC LIMIT ${safeLimit}`,
  );
  return rows;
}

async function getGameLeaderboard(game_id, limit = 100) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.username, u.avatar, ugs.points, ugs.wins, ugs.losses,
        CASE WHEN ugs.points >= 200 THEN 'goat' WHEN ugs.points >= 100 THEN 'legendary' ELSE 'beginner' END AS level
     FROM user_game_stats ugs JOIN users u ON u.id = ugs.user_id
     WHERE ugs.game_id = $1 ORDER BY ugs.points DESC LIMIT ${safeLimit}`,
    [game_id],
  );
  return rows;
}

module.exports = { submitResults, getTournamentResults, getGlobalLeaderboard, getGameLeaderboard };