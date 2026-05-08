const { pool } = require("../../config/db");

async function listGames() {
  const { rows } = await pool.query("SELECT id, name, created_at FROM games ORDER BY id DESC");
  return rows;
}

async function createGame({ name }) {
  const result = await pool.query(
    "INSERT INTO games (name) VALUES ($1) RETURNING id", [name]
  );
  const insertId = result.rows[0].id;
  const gameRes = await pool.query(
    "SELECT id, name, created_at FROM games WHERE id = $1 LIMIT 1", [insertId]
  );
  const game = gameRes.rows[0] || null;

  try {
    const users = await pool.query("SELECT id FROM users WHERE is_banned = 0 OR is_banned IS NULL");
    if (users.rows.length && game) {
      for (const u of users.rows) {
        await pool.query(
          "INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES ($1, $2, $3, $4, $5, 0)",
          [
            u.id, "system",
            `🎮 Nouveau jeu disponible : ${name}`,
            `Le jeu "${name}" vient d'être ajouté sur JGAME. Va le sélectionner dans ta liste de jeux !`,
            `/games/${game.id}`,
          ]
        );
      }
    }
  } catch (_) {}

  return game;
}

async function getGameById(id) {
  const { rows } = await pool.query(
    "SELECT id, name, created_at FROM games WHERE id = $1 LIMIT 1", [id]
  );
  return rows[0] || null;
}

async function updateGame(id, { name }) {
  await pool.query("UPDATE games SET name = $1 WHERE id = $2", [name, id]);
  return getGameById(id);
}

async function deleteGame(id) {
  await pool.query("DELETE FROM games WHERE id = $1", [id]);
}

module.exports = { listGames, createGame, getGameById, updateGame, deleteGame };