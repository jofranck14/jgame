const { pool } = require("../../config/db");

function pickPublic(row) {
  if (!row) return null;
  const { password, ...rest } = row;
  return rest;
}

async function getMe(userId) {
  const { rows } = await pool.query(
    "SELECT id, username, phone, email, avatar, points, role, city, bio, is_banned, created_at FROM users WHERE id = $1 LIMIT 1",
    [userId],
  );
  return pickPublic(rows[0]);
}

async function updateMe(userId, { username, phone, city, bio, avatar }) {
  const updates = [];
  const params  = [];
  let   idx     = 1;

  if (username !== undefined) { updates.push(`username = $${idx++}`); params.push(String(username).trim()); }
  if (phone !== undefined) {
    const ex = await pool.query(
      `SELECT id FROM users WHERE phone = $1 AND id <> $2 LIMIT 1`, [phone, userId]
    );
    if (ex.rows.length > 0) { const e = new Error("Phone already in use"); e.statusCode = 409; throw e; }
    updates.push(`phone = $${idx++}`); params.push(phone);
  }
  if (city   !== undefined) { updates.push(`city = $${idx++}`);   params.push(city   || null); }
  if (bio    !== undefined) { updates.push(`bio = $${idx++}`);    params.push(bio    || null); }
  if (avatar !== undefined) { updates.push(`avatar = $${idx++}`); params.push(avatar); }

  if (updates.length === 0) return getMe(userId);
  params.push(userId);
  await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}`, params);
  return getMe(userId);
}

async function getPublicProfileById(id) {
  const { rows } = await pool.query(
    "SELECT id, username, avatar, points, role, city, bio, created_at FROM users WHERE id = $1 LIMIT 1",
    [id],
  );
  return pickPublic(rows[0]);
}

async function getMyStatsByGame(userId) {
  const { rows } = await pool.query(
    "SELECT game_id, wins, losses, points FROM user_game_stats WHERE user_id = $1",
    [userId],
  );
  return rows.map((r) => ({ gameId: r.game_id, wins: Number(r.wins)||0, losses: Number(r.losses)||0, points: Number(r.points)||0 }));
}

async function listUsers({ game_id, city, level, role: filterRole } = {}) {
  let query = `
    SELECT DISTINCT u.id, u.username, u.avatar, u.points, u.role, u.city, u.bio,
           u.is_banned, u.created_at
    FROM users u
  `;
  const params = [];
  const where  = ["(u.is_banned = 0 OR u.is_banned IS NULL)"];
  let   idx    = 1;

  if (game_id) {
    query += ` JOIN user_games ug ON ug.user_id = u.id AND ug.game_id = $${idx++}`;
    params.push(Number(game_id));
  }
  if (city)       { where.push(`u.city = $${idx++}`);  params.push(city); }
  if (filterRole) { where.push(`u.role = $${idx++}`);  params.push(filterRole); }

  if (where.length) query += " WHERE " + where.join(" AND ");
  query += " ORDER BY u.points DESC LIMIT 100";

  const { rows } = await pool.query(query, params);
  let users = rows.map(pickPublic);

  if (level) {
    users = users.filter((u) => {
      const pts = u.points || 0;
      if (level === "goat")      return pts >= 200;
      if (level === "legendary") return pts >= 100 && pts < 200;
      return pts < 100;
    });
  }

  if (users.length > 0) {
    const ids = users.map((u) => u.id);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const gRows = await pool.query(
      `SELECT ug.user_id, g.name FROM user_games ug JOIN games g ON g.id = ug.game_id WHERE ug.user_id IN (${placeholders})`,
      ids,
    );
    const gamesByUser = {};
    for (const gr of gRows.rows) {
      if (!gamesByUser[gr.user_id]) gamesByUser[gr.user_id] = [];
      gamesByUser[gr.user_id].push(gr.name);
    }
    users = users.map((u) => ({ ...u, games: gamesByUser[u.id] || [] }));
  }

  return users;
}

async function updateUserAdmin(id, { role, is_banned }) {
  const updates = []; const params = [];
  const validRoles = ["player","organizer","admin"];
  let idx = 1;
  if (role !== undefined && validRoles.includes(role)) { updates.push(`role = $${idx++}`); params.push(role); }
  if (is_banned !== undefined) { updates.push(`is_banned = $${idx++}`); params.push(is_banned ? 1 : 0); }
  if (!updates.length) { const e = new Error("Nothing to update"); e.statusCode = 400; throw e; }
  params.push(id);
  await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}`, params);
  const { rows } = await pool.query(
    "SELECT id, username, email, role, city, points, is_banned FROM users WHERE id = $1 LIMIT 1", [id],
  );
  return rows[0] || null;
}

async function deleteUser(id) {
  await pool.query("DELETE FROM participants    WHERE user_id = $1", [id]);
  await pool.query("DELETE FROM payments        WHERE user_id = $1", [id]);
  await pool.query("DELETE FROM results         WHERE user_id = $1", [id]);
  await pool.query("DELETE FROM reports         WHERE reporter_id = $1 OR reported_user_id = $1", [id]);
  await pool.query("DELETE FROM reviews         WHERE user_id = $1 OR organizer_id = $1", [id]);
  await pool.query("DELETE FROM user_games      WHERE user_id = $1", [id]);
  await pool.query("DELETE FROM user_game_stats WHERE user_id = $1", [id]);
  await pool.query("DELETE FROM messages        WHERE sender_id = $1 OR receiver_id = $1", [id]);
  await pool.query("DELETE FROM notifications   WHERE user_id = $1", [id]);
  await pool.query("DELETE FROM users           WHERE id = $1", [id]);
}

async function getUserGames(userId) {
  const { rows } = await pool.query(
    `SELECT ug.id, ug.game_id, g.name, ug.points, ug.level,
            COALESCE(ugs.wins,0) AS wins, COALESCE(ugs.losses,0) AS losses
     FROM user_games ug
     JOIN games g ON g.id = ug.game_id
     LEFT JOIN user_game_stats ugs ON ugs.user_id = ug.user_id AND ugs.game_id = ug.game_id
     WHERE ug.user_id = $1 ORDER BY ug.id DESC`, [userId],
  );
  return rows;
}

async function addUserGame(userId, gameId) {
  try {
    const r = await pool.query(
      "INSERT INTO user_games (user_id, game_id) VALUES ($1, $2) RETURNING id",
      [userId, gameId]
    );
    const { rows } = await pool.query(
      "SELECT ug.id, ug.game_id, g.name, ug.points, ug.level FROM user_games ug JOIN games g ON g.id = ug.game_id WHERE ug.id = $1 LIMIT 1",
      [r.rows[0].id],
    );
    return rows[0] || null;
  } catch (e) {
    if (e?.code === "23505") { const err = new Error("Game already added"); err.statusCode = 409; throw err; }
    throw e;
  }
}

async function removeUserGame(userId, gameId) {
  await pool.query(
    "DELETE FROM user_games WHERE user_id = $1 AND game_id = $2", [userId, gameId]
  );
}

module.exports = {
  getMe, updateMe, getPublicProfileById, getMyStatsByGame,
  listUsers, updateUserAdmin, deleteUser,
  getUserGames, addUserGame, removeUserGame,
};