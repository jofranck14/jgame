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
    const proof_image     = req.file ? `/uploads/${req.file.filename}` : null;

    const payment = await paymentService.createPayment(req.user.id, {
      tournament_id,
      method,
      transaction_ref,
      proof_image,
    });

    return res.status(201).json({ payment });
  } catch (err) {
    if (err?.statusCode) res.status(err.statusCode);
    return next(err);
  }
}
async function listPayments(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, user_id, tournament_id, amount, status, method, transaction_ref, proof_image, verified_by_admin, created_at
       FROM payments
       ORDER BY created_at DESC`
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
    const payment_id = toInt(req.body?.payment_id, "payment_id");
    const method     = req.body?.method ? String(req.body.method).trim() : null;
    const proof_image = req.file ? `/uploads/${req.file.filename}` : null;

    if (!proof_image) {
      res.status(400);
      return next(new Error("proof_image is required"));
    }

    const [existing] = await pool.execute(
      "SELECT id, user_id FROM payments WHERE id = ? LIMIT 1",
      [payment_id]
    );

    if (!existing[0]) {
      res.status(404);
      return next(new Error("Payment not found"));
    }

    if (Number(existing[0].user_id) !== Number(req.user.id)) {
      res.status(403);
      return next(new Error("Forbidden"));
    }

    await pool.execute(
      "UPDATE payments SET proof_image = ?, method = COALESCE(?, method) WHERE id = ?",
      [proof_image, method, payment_id]
    );

    const [rows] = await pool.execute(
      "SELECT id, user_id, tournament_id, amount, status, method, proof_image, verified_by_admin, created_at FROM payments WHERE id = ? LIMIT 1",
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

module.exports = { pay, confirm, verify, getPayment, listPayments, updateProof };
