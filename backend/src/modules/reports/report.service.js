const { pool } = require("../../config/db");

async function createReport({ reporter_id, reported_user_id, tournament_id, reason }) {
  const result = await pool.query(
    `INSERT INTO reports (reporter_id, reported_user_id, tournament_id, reason)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [reporter_id, reported_user_id, tournament_id ?? null, reason],
  );
  const insertId = result.rows[0].id;
  const { rows } = await pool.query(
    "SELECT id, reporter_id, reported_user_id, tournament_id, reason, status, created_at FROM reports WHERE id = $1 LIMIT 1",
    [insertId],
  );
  return rows[0];
}

async function listReports(status = null) {
  let query = `
    SELECT
        r.id, r.reason, r.status, r.created_at, r.tournament_id,
        reporter.id       AS reporter_id,
        reporter.username AS reporter_username,
        reported.id       AS reported_id,
        reported.username AS reported_username
      FROM reports r
      JOIN users reporter ON reporter.id = r.reporter_id
      JOIN users reported ON reported.id = r.reported_user_id
  `;
  const params = [];
  if (status) {
    params.push(status);
    query += ` WHERE r.status = $${params.length}`;
  }
  query += " ORDER BY r.created_at DESC";
  const { rows } = await pool.query(query, params);
  return rows;
}

async function resolveReport(id, status) {
  const existing = await pool.query(
    "SELECT id FROM reports WHERE id = $1 LIMIT 1", [id],
  );
  if (!existing.rows[0]) {
    const err = new Error("Report not found"); err.statusCode = 404; throw err;
  }
  await pool.query("UPDATE reports SET status = $1 WHERE id = $2", [status, id]);
  const { rows } = await pool.query(
    "SELECT id, reporter_id, reported_user_id, tournament_id, reason, status, created_at FROM reports WHERE id = $1 LIMIT 1",
    [id],
  );
  return rows[0];
}

module.exports = { createReport, listReports, resolveReport };