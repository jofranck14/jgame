const { pool } = require("../../config/db");

async function createReview({ organizer_id, user_id, rating, comment }) {
  // Vérifier que l'organisateur existe et a bien le rôle organizer ou admin
  const [uRows] = await pool.execute(
    "SELECT id, role FROM users WHERE id = ? LIMIT 1",
    [organizer_id],
  );
  const organizer = uRows[0];
  if (!organizer) {
    const err = new Error("Organizer not found");
    err.statusCode = 404;
    throw err;
  }
  if (!["organizer", "admin"].includes(organizer.role)) {
    const err = new Error("This user is not an organizer");
    err.statusCode = 400;
    throw err;
  }

  const [result] = await pool.execute(
    `INSERT INTO reviews (organizer_id, user_id, rating, comment)
     VALUES (?, ?, ?, ?)`,
    [organizer_id, user_id, rating, comment ?? null],
  );

  const [rows] = await pool.execute(
    "SELECT id, organizer_id, user_id, rating, comment, created_at FROM reviews WHERE id = ? LIMIT 1",
    [result.insertId],
  );

  return rows[0];
}

async function getOrganizerReviews(organizer_id) {
  const [rows] = await pool.execute(
    `SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.id AS reviewer_id,
        u.username AS reviewer_username
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.organizer_id = ?
      ORDER BY r.created_at DESC`,
    [organizer_id],
  );

  const [avgRows] = await pool.execute(
    "SELECT ROUND(AVG(rating), 2) AS average FROM reviews WHERE organizer_id = ?",
    [organizer_id],
  );

  return {
    organizer_id,
    average_rating: Number(avgRows[0]?.average) || 0,
    total_reviews: rows.length,
    reviews: rows,
  };
}

module.exports = { createReview, getOrganizerReviews };