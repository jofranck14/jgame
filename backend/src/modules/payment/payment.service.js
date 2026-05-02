const { pool } = require("../../config/db");

async function createPayment(userId, { tournament_id, method, transaction_ref, proof_image }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [tRows] = await conn.execute(
      "SELECT id, price FROM tournaments WHERE id = ? LIMIT 1 FOR UPDATE",
      [tournament_id],
    );

    const t = tRows[0];
    if (!t) {
      const err = new Error("Tournament not found");
      err.statusCode = 404;
      throw err;
    }

    const amount = Number(t.price) || 0;
    if (amount <= 0) {
      const err = new Error("This tournament does not require payment");
      err.statusCode = 400;
      throw err;
    }

    const [existing] = await conn.execute(
      "SELECT id, status FROM payments WHERE tournament_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1",
      [tournament_id, userId],
    );

    if (existing[0] && (existing[0].status === "pending" || existing[0].status === "success")) {
      const err = new Error("Payment already exists for this tournament");
      err.statusCode = 409;
      throw err;
    }

    const [res] = await conn.execute(
      `INSERT INTO payments (user_id, tournament_id, amount, status, method, transaction_ref, proof_image, verified_by_admin)
       VALUES (?, ?, ?, 'pending', ?, ?, ?, 0)`,
      [userId, tournament_id, amount, method || null, transaction_ref || null, proof_image || null],
    );

    const payment = await getPaymentById(res.insertId, userId, conn);
    await conn.commit();
    return payment;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getPaymentById(id, userId, conn = pool) {
  const [rows] = await conn.execute(
    `SELECT
        id, user_id, tournament_id, amount, status, method, transaction_ref, proof_image, verified_by_admin, created_at
      FROM payments
      WHERE id = ? AND user_id = ?
      LIMIT 1`,
    [id, userId],
  );
  return rows[0] || null;
}

async function confirmPayment(userId, { payment_id }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [pRows] = await conn.execute(
      "SELECT id, user_id, tournament_id, amount, status, verified_by_admin FROM payments WHERE id = ? FOR UPDATE",
      [payment_id],
    );

    const payment = pRows[0];
    if (!payment) {
      const err = new Error("Payment not found");
      err.statusCode = 404;
      throw err;
    }
    if (Number(payment.user_id) !== Number(userId)) {
      const err = new Error("Forbidden");
      err.statusCode = 403;
      throw err;
    }

    if (payment.status === "success") {
      const updated = await getPaymentById(payment.id, userId, conn);
      await conn.commit();
      return {
        payment: updated,
        alreadyConfirmed: true,
        participationGranted: Boolean(updated?.verified_by_admin),
      };
    }

    if (payment.status !== "pending") {
      const err = new Error("Payment cannot be confirmed");
      err.statusCode = 409;
      throw err;
    }

    // Mark as success (table enum: pending/success/failed)
    await conn.execute(
      "UPDATE payments SET status = 'success' WHERE id = ?",
      [payment.id],
    );

    // Only admin-verified payments grant participation.
    if (!payment.verified_by_admin) {
      const updated = await getPaymentById(payment.id, userId, conn);
      await conn.commit();
      return {
        payment: updated,
        alreadyConfirmed: false,
        participationGranted: false,
        message: "Payment marked as success, pending admin verification",
      };
    }

    // Add participant only after confirmed + verified payment
    const tournamentId = payment.tournament_id;

    const [tRows] = await conn.execute(
      `SELECT
          t.id,
          t.max_players,
          COUNT(p.id) AS current_players
        FROM tournaments t
        LEFT JOIN participants p ON p.tournament_id = t.id
        WHERE t.id = ?
        GROUP BY t.id, t.max_players
        FOR UPDATE`,
      [tournamentId],
    );

    const t = tRows[0];
    if (!t) {
      const err = new Error("Tournament not found");
      err.statusCode = 404;
      throw err;
    }

    const currentPlayers = Number(t.current_players) || 0;
    const maxPlayers = Number(t.max_players);
    if (currentPlayers >= maxPlayers) {
      const err = new Error("Tournament is full");
      err.statusCode = 409;
      throw err;
    }

    try {
      await conn.execute(
        "INSERT INTO participants (tournament_id, user_id, payment_status) VALUES (?, ?, 'paid')",
        [tournamentId, userId],
      );
    } catch (e) {
      if (e && e.code === "ER_DUP_ENTRY") {
        // already a participant: ensure payment_status is up-to-date
        await conn.execute(
          "UPDATE participants SET payment_status = 'paid' WHERE tournament_id = ? AND user_id = ?",
          [tournamentId, userId],
        );
      } else {
        throw e;
      }
    }

    const updated = await getPaymentById(payment.id, userId, conn);
    await conn.commit();
    return { payment: updated, alreadyConfirmed: false, participationGranted: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Dans payment.service.js — remplacer verifyPaymentByAdmin
async function verifyPaymentByAdmin({ payment_id }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [pRows] = await conn.execute(
      "SELECT id, user_id, tournament_id, status, amount, verified_by_admin FROM payments WHERE id = ? FOR UPDATE",
      [payment_id],
    );
    const payment = pRows[0];
    if (!payment) { const e = new Error("Payment not found"); e.statusCode = 404; throw e; }
    if (payment.verified_by_admin) { await conn.commit(); return { alreadyVerified: true }; }

    await conn.execute("UPDATE payments SET verified_by_admin = 1 WHERE id = ?", [payment.id]);

    if (payment.status === "success" || true) {
      // Ajouter le joueur aux participants si pas encore dedans
      const [existing] = await conn.execute(
        "SELECT id FROM participants WHERE tournament_id = ? AND user_id = ? LIMIT 1",
        [payment.tournament_id, payment.user_id],
      );
      if (!existing.length) {
        await conn.execute(
          "INSERT INTO participants (tournament_id, user_id, payment_status) VALUES (?, ?, 'paid')",
          [payment.tournament_id, payment.user_id],
        );
      }

      // Récupérer infos tournoi pour la notif
      const [tRows] = await conn.execute(
        "SELECT title FROM tournaments WHERE id = ? LIMIT 1", [payment.tournament_id],
      );
      const tournamentTitle = tRows[0]?.title || `Tournoi #${payment.tournament_id}`;

      // Notifier le joueur que sa participation est confirmée
      await conn.execute(
        "INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES (?, 'payment', ?, ?, ?, 0)",
        [
          payment.user_id,
          "✅ Participation confirmée !",
          `Ton paiement de ${Number(payment.amount).toLocaleString()} FCFA pour "${tournamentTitle}" a été validé. Tu es officiellement inscrit !`,
          `/tournaments/${payment.tournament_id}`,
        ],
      );
    }

    await conn.commit();
    return { verified: true, payment };
  } catch (err) { await conn.rollback(); throw err; }
  finally { conn.release(); }
}

module.exports = { createPayment, confirmPayment, getPaymentById, verifyPaymentByAdmin };

