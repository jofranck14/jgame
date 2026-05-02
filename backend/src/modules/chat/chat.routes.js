const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const chatService = require("./chat.service");

const router = express.Router();

// GET historique conversation avec un user
router.get("/:other_user_id", requireAuth, async (req, res, next) => {
  try {
    const other_user_id = Number.parseInt(req.params.other_user_id, 10);
    if (!Number.isFinite(other_user_id)) {
      res.status(400);
      return next(new Error("Invalid user id"));
    }

    const limit = Math.min(Number.parseInt(req.query.limit) || 50, 200);
    const messages = await chatService.getConversation(req.user.id, other_user_id, limit);
    return res.status(200).json({ messages });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;