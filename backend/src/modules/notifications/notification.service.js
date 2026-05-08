const { pool } = require("../../config/db");

async function createNotification(userId, { type = "system", title, message, link = null }) {
  await pool.query(
    "INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES ($1, $2, $3, $4, $5, 0)",
    [userId, type, title, message, link],
  );
}

async function notifyAllAdmins({ type, title, message, link = null }) {
  const { rows: admins } = await pool.query("SELECT id FROM users WHERE role = 'admin'");
  for (const admin of admins) {
    await createNotification(admin.id, { type, title, message, link });
  }
}

async function getNotifications(userId) {
  const { rows } = await pool.query(
    "SELECT id, type, title, message, is_read, link, created_at FROM notifications WHERE user_id = $1 ORDER BY id DESC LIMIT 60",
    [userId],
  );
  return rows;
}

async function markRead(notifId, userId) {
  await pool.query(
    "UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2",
    [notifId, userId]
  );
}

async function markAllRead(userId) {
  await pool.query(
    "UPDATE notifications SET is_read = 1 WHERE user_id = $1",
    [userId]
  );
}

async function sendAnnouncement({ title, message, target = "all" }) {
  let query = "SELECT id FROM users WHERE is_banned = 0 OR is_banned IS NULL";
  const params = [];
  if (target === "players")    { query += " AND role = $1"; params.push("player"); }
  if (target === "organizers") { query += " AND role = $1"; params.push("organizer"); }

  const { rows: users } = await pool.query(query, params);
  if (!users.length) return { sent: 0 };

  for (const u of users) {
    await pool.query(
      "INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES ($1, $2, $3, $4, $5, 0)",
      [u.id, "system", title, message, null]
    );
  }

  return { sent: users.length };
}

module.exports = { createNotification, notifyAllAdmins, getNotifications, markRead, markAllRead, sendAnnouncement };