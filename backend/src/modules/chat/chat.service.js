const { pool } = require("../../config/db");

async function saveMessage({ sender_id, receiver_id, message }) {
  const result = await pool.query(
    `INSERT INTO messages (sender_id, receiver_id, message)
     VALUES ($1, $2, $3) RETURNING id`,
    [sender_id, receiver_id, message],
  );
  const insertId = result.rows[0].id;
  const { rows } = await pool.query(
    `SELECT m.id, m.message, m.created_at,
        sender.id AS sender_id, sender.username AS sender_username,
        receiver.id AS receiver_id, receiver.username AS receiver_username
     FROM messages m
     JOIN users sender   ON sender.id   = m.sender_id
     JOIN users receiver ON receiver.id = m.receiver_id
     WHERE m.id = $1 LIMIT 1`,
    [insertId],
  );
  return rows[0];
}

async function getConversation(user1_id, user2_id, limit = 50) {
  try {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const { rows } = await pool.query(
      `SELECT m.id, m.message, m.created_at, m.sender_id, m.receiver_id
       FROM messages m
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at DESC
       LIMIT ${safeLimit}`,
      [user1_id, user2_id],
    );
    return rows.reverse();
  } catch (err) {
    console.error("getConversation error:", err.message);
    throw err;
  }
}

async function getConversations(userId) {
  const { rows } = await pool.query(
    `SELECT
        other.id         AS user_id,
        other.username   AS username,
        last_msg.message AS last_message,
        last_msg.created_at AS last_at,
        (
          SELECT COUNT(*)
          FROM messages unread
          WHERE unread.sender_id   = other.id
            AND unread.receiver_id = $1
            AND unread.is_read     = 0
        ) AS unread
      FROM (
        SELECT
          CASE
            WHEN m.sender_id = $2 THEN m.receiver_id
            ELSE m.sender_id
          END AS other_id,
          MAX(m.id) AS last_id
        FROM messages m
        WHERE m.sender_id = $3 OR m.receiver_id = $4
        GROUP BY other_id
      ) AS convs
      JOIN users other       ON other.id    = convs.other_id
      JOIN messages last_msg ON last_msg.id = convs.last_id
      ORDER BY convs.last_id DESC`,
    [userId, userId, userId, userId],
  );
  return rows;
}

module.exports = { saveMessage, getConversation, getConversations };