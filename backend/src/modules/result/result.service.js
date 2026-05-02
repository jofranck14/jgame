const { pool } = require("../../config/db");

const POINTS_MAP = { 1: 20, 2: 10, 3: 5 };

const LEVEL_MAP = [
  { min: 200, label: "goat" },
  { min: 100, label: "legendary" },
  { min: 0,   label: "beginner" },
];

function getLevel(points) {
  return LEVEL_MAP.find((l) => points >= l.min)?.label ?? "beginner";
}

async function submitResults(tournament_id, rankings) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Vérifier que le tournoi existe et est en cours ou pending
    const [tRows] = await conn.execute(
      "SELECT id, game_id, status FROM tournaments WHERE id = ? LIMIT 1 FOR UPDATE",
      [tournament_id],
    );
    const tournament = tRows[0];
    if (!tournament) {
      const err = new Error("Tournament not found");
      err.statusCode = 404;
      throw err;
    }
    if (tournament.status === "completed") {
      const err = new Error("Results already submitted for this tournament");
      err.statusCode = 409;
      throw err;
    }

    const game_id = tournament.game_id;
    const inserted = [];

    for (const entry of rankings) {
      const user_id = Number.parseInt(String(entry.user_id), 10);
      const rank = Number.parseInt(String(entry.rank), 10);
      const points_awarded = POINTS_MAP[rank] ?? 0;

      // Insérer le résultat
      await conn.execute(
        `INSERT INTO results (tournament_id, user_id, rank_position, points_awarded)
         VALUES (?, ?, ?, ?)`,
        [tournament_id, user_id, rank, points_awarded],
      );

      // Mettre à jour points globaux user
      await conn.execute(
        "UPDATE users SET points = points + ? WHERE id = ?",
        [points_awarded, user_id],
      );

      // Mettre à jour user_game_stats
      await conn.execute(
        `INSERT INTO user_game_stats (user_id, game_id, points, wins, losses)
         VALUES (?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE
           points = points + VALUES(points),
           wins   = wins + IF(VALUES(wins) > 0, 1, 0)`,
        [user_id, game_id, points_awarded, rank === 1 ? 1 : 0],
      );

      // Mettre à jour user_games level
      const [ugRows] = await conn.execute(
        "SELECT id FROM user_games WHERE user_id = ? AND game_id = ? LIMIT 1",
        [user_id, game_id],
      );
      if (ugRows.length > 0) {
        await conn.execute(
          "UPDATE user_games SET points = points + ? WHERE user_id = ? AND game_id = ?",
          [points_awarded, user_id, game_id],
        );
      }

      // Récupérer points totaux pour calculer le niveau
      const [uRows] = await conn.execute(
        "SELECT points FROM users WHERE id = ? LIMIT 1",
        [user_id],
      );
      const totalPoints = Number(uRows[0]?.points) || 0;
      const level = getLevel(totalPoints);

      inserted.push({ user_id, rank, points_awarded, total_points: totalPoints, level });
    }

    // Marquer le tournoi comme completed
    await conn.execute(
      "UPDATE tournaments SET status = 'completed' WHERE id = ?",
      [tournament_id],
    );

    await conn.commit();
    return { tournament_id, results: inserted };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getTournamentResults(tournament_id) {
  const [rows] = await pool.execute(
    `SELECT
        r.rank_position AS rank,
        r.points_awarded,
        u.id AS user_id,
        u.username,
        u.avatar,
        u.points AS total_points
      FROM results r
      JOIN users u ON u.id = r.user_id
      WHERE r.tournament_id = ?
      ORDER BY r.rank_position ASC`,
    [tournament_id],
  );
  return rows;
}

async function getGlobalLeaderboard(limit = 20) {
  const [rows] = await pool.execute(
    `SELECT
        id AS user_id,
        username,
        avatar,
        points,
        CASE
          WHEN points >= 200 THEN 'goat'
          WHEN points >= 100 THEN 'legendary'
          ELSE 'beginner'
        END AS level
      FROM users
      ORDER BY points DESC
      LIMIT ?`,
    [limit],
  );
  return rows;
}

async function getGameLeaderboard(game_id, limit = 20) {
  const [rows] = await pool.execute(
    `SELECT
        u.id AS user_id,
        u.username,
        u.avatar,
        ugs.points,
        ugs.wins,
        ugs.losses,
        CASE
          WHEN ugs.points >= 200 THEN 'goat'
          WHEN ugs.points >= 100 THEN 'legendary'
          ELSE 'beginner'
        END AS level
      FROM user_game_stats ugs
      JOIN users u ON u.id = ugs.user_id
      WHERE ugs.game_id = ?
      ORDER BY ugs.points DESC
      LIMIT ?`,
    [game_id, limit],
  );
  return rows;
}

module.exports = { submitResults, getTournamentResults, getGlobalLeaderboard, getGameLeaderboard };