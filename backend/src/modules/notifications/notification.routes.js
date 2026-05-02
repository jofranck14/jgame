const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const { getMyNotifications, markOneRead, markAllRead, announce } = require("./notification.controller");

const router = express.Router();

router.get("/",             requireAuth, getMyNotifications);
router.patch("/read-all",   requireAuth, markAllRead);          // AVANT /:id
router.patch("/:id/read",   requireAuth, markOneRead);
router.post("/announce",    requireAuth, requireRole("admin"), announce);

module.exports = router;