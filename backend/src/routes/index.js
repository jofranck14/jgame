const express = require("express");
const authRoutes         = require("../modules/auth/auth.routes");
const usersRoutes        = require("../modules/user/user.routes");
const gamesRoutes        = require("../modules/game/game.routes");
const tournamentsRoutes  = require("../modules/tournament/tournament.routes");
const paymentsRoutes     = require("../modules/payment/payment.routes");
const resultsRoutes      = require("../modules/result/result.routes");
const reviewsRoutes      = require("../modules/reviews/review.routes");
const reportsRoutes      = require("../modules/reports/report.routes");
const chatRoutes         = require("../modules/chat/chat.routes");
const notificationRoutes = require("../modules/notifications/notification.routes");

const router = express.Router();

router.use("/auth",          authRoutes);
router.use("/users",         usersRoutes);
router.use("/games",         gamesRoutes);
router.use("/tournaments",   tournamentsRoutes);
router.use("/payments",      paymentsRoutes);
router.use("/results",       resultsRoutes);
router.use("/reviews",       reviewsRoutes);
router.use("/reports",       reportsRoutes);
router.use("/chat",          chatRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;