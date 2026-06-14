const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const chatService = require("./chat.service");

const router = express.Router();

// GET liste des conversations (interlocuteurs distincts + dernier msg)
// ⚠️ DOIT être avant /:other_user_id pour ne pas être capturé
router.get("/conversations", requireAuth, async (req, res, next) => {
  try {
    const conversations = await chatService.getConversations(req.user.id);
    return res.status(200).json({ conversations });
  } catch (err) {
    return next(err);
  }
});

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