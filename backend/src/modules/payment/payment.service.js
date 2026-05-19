const { pool } = require("../../config/db");

async function createPayment(userId, { tournament_id, method, transaction_ref, proof_image }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tRes = await client.query(
      "SELECT id, price FROM tournaments WHERE id = $1 LIMIT 1 FOR UPDATE",
      [tournament_id],
    );
    const t = tRes.rows[0];
    if (!t) { const err = new Error("Tournament not found"); err.statusCode = 404; throw err; }
    const amount = Number(t.price) || 0;
    if (amount <= 0) { const err = new Error("This tournament does not require payment"); err.statusCode = 400; throw err; }

    const existing = await client.query(
      "SELECT id, status FROM payments WHERE tournament_id = $1 AND user_id = $2 ORDER BY id DESC LIMIT 1",
      [tournament_id, userId],
    );
    if (existing.rows[0] && ["pending","success"].includes(existing.rows[0].status)) {
      const err = new Error("Payment already exists for this tournament"); err.statusCode = 409; throw err;
    }

    const res = await client.query(
      `INSERT INTO payments (user_id, tournament_id, amount, status, method, transaction_ref, proof_image, verified_by_admin)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, 0) RETURNING id`,
      [userId, tournament_id, amount, method || null, transaction_ref || null, proof_image || null],
    );
    const payment = await getPaymentById(res.rows[0].id, userId, client);
    await client.query("COMMIT");
    return payment;
  } catch (err) { await client.query("ROLLBACK"); throw err; }
  finally { client.release(); }
}

async function getPaymentById(id, userId, conn = pool) {
  const { rows } = await conn.query(
    `SELECT id, user_id, tournament_id, amount, status, method, transaction_ref, proof_image, verified_by_admin, created_at
     FROM payments WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [id, userId],
  );
  return rows[0] || null;
}

async function confirmPayment(userId, { payment_id }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pRes = await client.query(
      "SELECT id, user_id, tournament_id, amount, status, verified_by_admin FROM payments WHERE id = $1 FOR UPDATE",
      [payment_id],
    );
    const payment = pRes.rows[0];
    if (!payment) { const err = new Error("Payment not found"); err.statusCode = 404; throw err; }
    if (Number(payment.user_id) !== Number(userId)) { const err = new Error("Forbidden"); err.statusCode = 403; throw err; }

    if (payment.status === "success") {
      const updated = await getPaymentById(payment.id, userId, client);
      await client.query("COMMIT");
      return { payment: updated, alreadyConfirmed: true, participationGranted: Boolean(updated?.verified_by_admin) };
    }
    if (payment.status !== "pending") {
      const err = new Error("Payment cannot be confirmed"); err.statusCode = 409; throw err;
    }

    await client.query("UPDATE payments SET status = 'success' WHERE id = $1", [payment.id]);

    if (!payment.verified_by_admin) {
      const updated = await getPaymentById(payment.id, userId, client);
      await client.query("COMMIT");
      return { payment: updated, alreadyConfirmed: false, participationGranted: false, message: "Payment marked as success, pending admin verification" };
    }

    const tRes = await client.query(
      `SELECT t.id, t.max_players, COUNT(p.id) AS current_players
       FROM tournaments t LEFT JOIN participants p ON p.tournament_id = t.id
       WHERE t.id = $1 GROUP BY t.id, t.max_players FOR UPDATE`,
      [payment.tournament_id],
    );
    const t = tRes.rows[0];
    if (!t) { const err = new Error("Tournament not found"); err.statusCode = 404; throw err; }
    if (Number(t.current_players) >= Number(t.max_players)) {
      const err = new Error("Tournament is full"); err.statusCode = 409; throw err;
    }

    try {
      await client.query(
        "INSERT INTO participants (tournament_id, user_id, payment_status) VALUES ($1, $2, 'paid')",
        [payment.tournament_id, userId],
      );
    } catch (e) {
      if (e?.code === "23505") {
        await client.query(
          "UPDATE participants SET payment_status = 'paid' WHERE tournament_id = $1 AND user_id = $2",
          [payment.tournament_id, userId],
        );
      } else throw e;
    }

    const updated = await getPaymentById(payment.id, userId, client);
    await client.query("COMMIT");
    return { payment: updated, alreadyConfirmed: false, participationGranted: true };
  } catch (err) { await client.query("ROLLBACK"); throw err; }
  finally { client.release(); }
}

async function verifyPaymentByAdmin({ payment_id }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pRes = await client.query(
      "SELECT id, user_id, tournament_id, status, amount, verified_by_admin FROM payments WHERE id = $1 FOR UPDATE",
      [payment_id],
    );
    const payment = pRes.rows[0];
    if (!payment) { const e = new Error("Payment not found"); e.statusCode = 404; throw e; }
    if (payment.verified_by_admin) { await client.query("COMMIT"); return { alreadyVerified: true }; }

    await client.query("UPDATE payments SET verified_by_admin = 1 WHERE id = $1", [payment.id]);

    const existing = await client.query(
      "SELECT id FROM participants WHERE tournament_id = $1 AND user_id = $2 LIMIT 1",
      [payment.tournament_id, payment.user_id],
    );
    if (!existing.rows.length) {
      await client.query(
        "INSERT INTO participants (tournament_id, user_id, payment_status) VALUES ($1, $2, 'paid')",
        [payment.tournament_id, payment.user_id],
      );
    }

    const tRes = await client.query(
      "SELECT title FROM tournaments WHERE id = $1 LIMIT 1", [payment.tournament_id],
    );
    const tournamentTitle = tRes.rows[0]?.title || `Tournoi #${payment.tournament_id}`;

    await client.query(
      "INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES ($1, 'payment', $2, $3, $4, 0)",
      [
        payment.user_id,
        "✅ Participation confirmée !",
        `Ton paiement de ${Number(payment.amount).toLocaleString()} FCFA pour "${tournamentTitle}" a été validé. Tu es officiellement inscrit !`,
        `/tournaments/${payment.tournament_id}`,
      ],
    );

    await client.query("COMMIT");
    return { verified: true, payment };
  } catch (err) { await client.query("ROLLBACK"); throw err; }
  finally { client.release(); }
}

async function cancelVerifyPayment({ payment_id }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const pRes = await client.query(
      "SELECT id, user_id, tournament_id, verified_by_admin FROM payments WHERE id = $1 FOR UPDATE",
      [payment_id],
    );
    const payment = pRes.rows[0];
    if (!payment) { const e = new Error("Payment not found"); e.statusCode = 404; throw e; }
    if (!payment.verified_by_admin) {
      const e = new Error("Payment not verified yet"); e.statusCode = 400; throw e;
    }

    // Annuler la validation
    await client.query("UPDATE payments SET verified_by_admin = 0 WHERE id = $1", [payment_id]);

    // Retirer le joueur des participants
    await client.query(
      "DELETE FROM participants WHERE tournament_id = $1 AND user_id = $2",
      [payment.tournament_id, payment.user_id],
    );

    // Notifier le joueur
    const tRes = await client.query(
      "SELECT title FROM tournaments WHERE id = $1 LIMIT 1", [payment.tournament_id],
    );
    const tournamentTitle = tRes.rows[0]?.title || `Tournoi #${payment.tournament_id}`;

    await client.query(
      "INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES ($1, 'payment', $2, $3, $4, 0)",
      [
        payment.user_id,
        "❌ Validation annulée",
        `La validation de ton paiement pour "${tournamentTitle}" a été annulée par l'admin. Contacte le support si c'est une erreur.`,
        `/tournaments/${payment.tournament_id}`,
      ],
    );

    await client.query("COMMIT");
    return { cancelled: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}


module.exports = { createPayment, confirmPayment, getPaymentById, verifyPaymentByAdmin, cancelVerifyPayment };