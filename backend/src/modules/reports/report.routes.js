const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const { createReport, listReports, resolveReport } = require("./report.controller");

const router = express.Router();

router.post("/", requireAuth, createReport);
router.get("/", requireAuth, requireRole("admin"), listReports);
router.patch("/:id", requireAuth, requireRole("admin"), resolveReport);

module.exports = router;