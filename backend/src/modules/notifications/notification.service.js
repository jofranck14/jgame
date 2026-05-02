const { pool } = require("../../config/db");

async function createNotification(userId, { type = "system", title, message, link = null }) {
  await pool.execute(
    "INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES (?, ?, ?, ?, ?, 0)",
    [userId, type, title, message, link],
  );
}

async function notifyAllAdmins({ type, title, message, link = null }) {
  const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'admin'");
  for (const admin of admins) {
    await createNotification(admin.id, { type, title, message, link });
  }
}

async function getNotifications(userId) {
  const [rows] = await pool.execute(
    "SELECT id, type, title, message, is_read, link, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 60",
    [userId],
  );
  return rows;
}

async function markRead(notifId, userId) {
  await pool.execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [notifId, userId]);
}

async function markAllRead(userId) {
  await pool.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [userId]);
}

async function sendAnnouncement({ title, message, target = "all" }) {
  let query = "SELECT id FROM users WHERE is_banned = 0 OR is_banned IS NULL";
  const params = [];
  if (target === "players")    { query += " AND role = ?"; params.push("player"); }
  if (target === "organizers") { query += " AND role = ?"; params.push("organizer"); }

  const [users] = await pool.execute(query, params);
  if (!users.length) return { sent: 0 };

  const values = users.map((u) => [u.id, "system", title, message, null, 0]);
  await pool.query("INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES ?", [values]);
  return { sent: users.length };
}

module.exports = { createNotification, notifyAllAdmins, getNotifications, markRead, markAllRead, sendAnnouncement };