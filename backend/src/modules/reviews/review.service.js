const { pool } = require("../../config/db");

async function createReview({ organizer_id, user_id, rating, comment }) {
  const uRes = await pool.query(
    "SELECT id, role FROM users WHERE id = $1 LIMIT 1", [organizer_id],
  );
  const organizer = uRes.rows[0];
  if (!organizer) {
    const err = new Error("Organizer not found"); err.statusCode = 404; throw err;
  }
  if (!["organizer", "admin"].includes(organizer.role)) {
    const err = new Error("This user is not an organizer"); err.statusCode = 400; throw err;
  }

  const result = await pool.query(
    `INSERT INTO reviews (organizer_id, user_id, rating, comment)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [organizer_id, user_id, rating, comment ?? null],
  );
  const insertId = result.rows[0].id;
  const { rows } = await pool.query(
    "SELECT id, organizer_id, user_id, rating, comment, created_at FROM reviews WHERE id = $1 LIMIT 1",
    [insertId],
  );
  return rows[0];
}

async function getOrganizerReviews(organizer_id) {
  const { rows } = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at,
        u.id AS reviewer_id, u.username AS reviewer_username
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     WHERE r.organizer_id = $1
     ORDER BY r.created_at DESC`,
    [organizer_id],
  );
  const avgRes = await pool.query(
    "SELECT ROUND(AVG(rating), 2) AS average FROM reviews WHERE organizer_id = $1",
    [organizer_id],
  );
  return {
    organizer_id,
    average_rating: Number(avgRes.rows[0]?.average) || 0,
    total_reviews:  rows.length,
    reviews:        rows,
  };
}

module.exports = { createReview, getOrganizerReviews };