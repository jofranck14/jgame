const { pool } = require("../../config/db");

async function saveMessage({ sender_id, receiver_id, message }) {
  const [result] = await pool.execute(
    `INSERT INTO messages (sender_id, receiver_id, message)
     VALUES (?, ?, ?)`,
    [sender_id, receiver_id, message],
  );

  const [rows] = await pool.execute(
    `SELECT
        m.id,
        m.message,
        m.created_at,
        sender.id   AS sender_id,
        sender.username AS sender_username,
        receiver.id AS receiver_id,
        receiver.username AS receiver_username
      FROM messages m
      JOIN users sender   ON sender.id   = m.sender_id
      JOIN users receiver ON receiver.id = m.receiver_id
      WHERE m.id = ? LIMIT 1`,
    [result.insertId],
  );

  return rows[0];
}

async function getConversation(user1_id, user2_id, limit = 50) {
  const [rows] = await pool.execute(
    `SELECT
        m.id,
        m.message,
        m.created_at,
        m.sender_id,
        m.receiver_id
      FROM messages m
      WHERE
        (m.sender_id = ? AND m.receiver_id = ?)
        OR
        (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at DESC
      LIMIT ?`,
    [user1_id, user2_id, user2_id, user1_id, limit],
  );

  return rows.reverse();
}

module.exports = { saveMessage, getConversation };