const { pool } = require("../../config/db");

async function listGames() {
  const [rows] = await pool.execute("SELECT id, name, created_at FROM games ORDER BY id DESC");
  return rows;
}

async function createGame({ name }) {
  const [result] = await pool.execute("INSERT INTO games (name) VALUES (?)", [name]);
  const [rows]   = await pool.execute("SELECT id, name, created_at FROM games WHERE id = ? LIMIT 1", [result.insertId]);
  const game = rows[0] || null;

  // Notifier tous les joueurs du nouveau jeu
  try {
    const [users] = await pool.execute("SELECT id FROM users WHERE is_banned = 0 OR is_banned IS NULL");
    if (users.length && game) {
      const values = users.map((u) => [
        u.id, "system",
        `🎮 Nouveau jeu disponible : ${name}`,
        `Le jeu "${name}" vient d'être ajouté sur JGAME. Va le sélectionner dans ta liste de jeux !`,
        `/games/${game.id}`, 0,
      ]);
      await pool.query(
        "INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES ?", [values],
      );
    }
  } catch (_) {}

  return game;
}

async function getGameById(id) {
  const [rows] = await pool.execute("SELECT id, name, created_at FROM games WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function updateGame(id, { name }) {
  await pool.execute("UPDATE games SET name = ? WHERE id = ?", [name, id]);
  return getGameById(id);
}

async function deleteGame(id) {
  await pool.execute("DELETE FROM games WHERE id = ?", [id]);
}

module.exports = { listGames, createGame, getGameById, updateGame, deleteGame };