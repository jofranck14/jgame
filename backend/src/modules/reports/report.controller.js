const reportService = require("./report.service");

function toInt(value, fieldName) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) {
    const err = new Error(`${fieldName} must be an integer`);
    err.statusCode = 400;
    throw err;
  }
  return n;
}

async function createReport(req, res, next) {
  try {
    const reported_user_id = toInt(req.body?.reported_user_id, "reported_user_id");
    const reason = req.body?.reason ? String(req.body.reason).trim() : null;
    const tournament_id = req.body?.tournament_id
      ? toInt(req.body.tournament_id, "tournament_id")
      : null;

    if (!reason) {
      res.status(400);
      return next(new Error("reason is required"));
    }
    if (reported_user_id === req.user.id) {
      res.status(400);
      return next(new Error("You cannot report yourself"));
    }

    const report = await reportService.createReport({
      reporter_id: req.user.id,
      reported_user_id,
      tournament_id,
      reason,
    });

    return res.status(201).json({ report });
  } catch (err) {
    if (err?.statusCode) res.status(err.statusCode);
    return next(err);
  }
}

async function listReports(req, res, next) {
  try {
    const status = req.query.status || null;
    const reports = await reportService.listReports(status);
    return res.status(200).json({ reports });
  } catch (err) {
    return next(err);
  }
}

async function resolveReport(req, res, next) {
  try {
    const id = toInt(req.params.id, "id");
    const status = req.body?.status;

    if (!["resolved", "rejected"].includes(status)) {
      res.status(400);
      return next(new Error("status must be resolved or rejected"));
    }

    const report = await reportService.resolveReport(id, status);
    return res.status(200).json({ report });
  } catch (err) {
    if (err?.statusCode) res.status(err.statusCode);
    return next(err);
  }
}

module.exports = { createReport, listReports, resolveReport };