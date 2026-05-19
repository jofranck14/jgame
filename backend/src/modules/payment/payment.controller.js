const paymentService = require("./payment.service");
const { pool } = require("../../config/db");

function toInt(value, fieldName) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) {
    const err = new Error(`${fieldName} must be an integer`);
    err.statusCode = 400;
    throw err;
  }
  return n;
}

async function pay(req, res, next) {
  try {
    const tournament_id   = toInt(req.body?.tournament_id, "tournament_id");
    const method          = req.body?.method ? String(req.body.method).trim() : null;
    const transaction_ref = req.body?.transaction_ref ? String(req.body.transaction_ref).trim() : null;
    const proof_image     = req.file?.path ?? null; // ← Cloudinary URL

    const payment = await paymentService.createPayment(req.user.id, {
      tournament_id, method, transaction_ref, proof_image,
    });
    return res.status(201).json({ payment });
  } catch (err) {
    if (err?.statusCode) res.status(err.statusCode);
    return next(err);
  }
}

async function listPayments(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, user_id, tournament_id, amount, status, method, transaction_ref,
              proof_image, verified_by_admin, created_at
       FROM payments ORDER BY created_at DESC`
    );
    return res.status(200).json({ payments: rows });
  } catch (err) {
    return next(err);
  }
}

async function confirm(req, res, next) {
  try {
    const payment_id = toInt(req.body?.payment_id, "payment_id");
    const result = await paymentService.confirmPayment(req.user.id, { payment_id });
    return res.status(200).json(result);
  } catch (err) {
    if (err?.statusCode) res.status(err.statusCode);
    return next(err);
  }
}

async function verify(req, res, next) {
  try {
    const payment_id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(payment_id)) {
      res.status(400);
      return next(new Error("Invalid payment id"));
    }
    const result = await paymentService.verifyPaymentByAdmin({ payment_id });
    return res.status(200).json(result);
  } catch (err) {
    if (err?.statusCode) res.status(err.statusCode);
    return next(err);
  }
}

async function updateProof(req, res, next) {
  try {
    const payment_id  = toInt(req.body?.payment_id, "payment_id");
    const method      = req.body?.method ? String(req.body.method).trim() : null;
    const proof_image = req.file?.path ?? null;

    if (!proof_image) {
      res.status(400); return next(new Error("proof_image is required"));
    }

    const existing = await pool.query(
      "SELECT id, user_id, tournament_id, amount FROM payments WHERE id = $1 LIMIT 1",
      [payment_id]
    );
    if (!existing.rows[0]) { res.status(404); return next(new Error("Payment not found")); }
    if (Number(existing.rows[0].user_id) !== Number(req.user.id)) {
      res.status(403); return next(new Error("Forbidden"));
    }

    await pool.query(
      "UPDATE payments SET proof_image = $1, method = COALESCE($2, method) WHERE id = $3",
      [proof_image, method, payment_id]
    );

    // ✅ Notification admin envoyée ICI, après upload de la capture
    try {
      const admins = await pool.query("SELECT id FROM users WHERE role = 'admin'");
      if (admins.rows.length) {
        const uRows = await pool.query(
          "SELECT username FROM users WHERE id = $1 LIMIT 1", [req.user.id]
        );
        const username = uRows.rows[0]?.username || `#${req.user.id}`;
        const tRows = await pool.query(
          "SELECT title FROM tournaments WHERE id = $1 LIMIT 1",
          [existing.rows[0].tournament_id]
        );
        const tournamentTitle = tRows.rows[0]?.title || `Tournoi #${existing.rows[0].tournament_id}`;
        const amount = Number(existing.rows[0].amount);

        for (const a of admins.rows) {
          await pool.query(
            "INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES ($1, $2, $3, $4, $5, 0)",
            [
              a.id, "payment",
              "💳 Paiement en attente",
              `${username} a soumis une preuve de paiement de ${amount.toLocaleString()} FCFA pour "${tournamentTitle}". À valider.`,
              "/admin"
            ]
          );
        }
      }
    } catch (_) {}

    const { rows } = await pool.query(
      "SELECT id, user_id, tournament_id, amount, status, method, proof_image, verified_by_admin, created_at FROM payments WHERE id = $1 LIMIT 1",
      [payment_id]
    );
    return res.status(200).json({ payment: rows[0] });
  } catch (err) {
    if (err?.statusCode) res.status(err.statusCode);
    return next(err);
  }
}

async function getPayment(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      res.status(400);
      return next(new Error("Invalid payment id"));
    }
    const payment = await paymentService.getPaymentById(id, req.user.id);
    if (!payment) {
      res.status(404);
      return next(new Error("Payment not found"));
    }
    return res.status(200).json({ payment });
  } catch (err) {
    return next(err);
  }
}


async function cancelVerify(req, res, next) {
  try {
    const payment_id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(payment_id)) {
      res.status(400); return next(new Error("Invalid payment id"));
    }
    await paymentService.cancelVerifyPayment({ payment_id });
    return res.status(200).json({ cancelled: true });
  } catch (err) {
    if (err?.statusCode) res.status(err.statusCode);
    return next(err);
  }
}

module.exports = { pay, confirm, verify, cancelVerify, getPayment, listPayments, updateProof };