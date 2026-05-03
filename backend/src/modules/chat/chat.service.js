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

/**
 * Retourne la liste des conversations d'un utilisateur :
 * une ligne par interlocuteur distinct, avec le dernier message
 * et le nombre de messages non lus.
 */
async function getConversations(userId) {
  const [rows] = await pool.execute(
    `SELECT
        other.id          AS user_id,
        other.username    AS username,
        last_msg.message  AS last_message,
        last_msg.created_at AS last_at,
        (
          SELECT COUNT(*)
          FROM messages unread
          WHERE unread.sender_id   = other.id
            AND unread.receiver_id = ?
            AND unread.is_read     = 0
        ) AS unread
      FROM (
        SELECT
          CASE
            WHEN m.sender_id   = ? THEN m.receiver_id
            ELSE m.sender_id
          END AS other_id,
          MAX(m.id) AS last_id
        FROM messages m
        WHERE m.sender_id = ? OR m.receiver_id = ?
        GROUP BY other_id
      ) AS convs
      JOIN users other          ON other.id = convs.other_id
      JOIN messages last_msg    ON last_msg.id = convs.last_id
      ORDER BY convs.last_id DESC`,
    [userId, userId, userId, userId],
  );

  return rows;
}

module.exports = { saveMessage, getConversation, getConversations };