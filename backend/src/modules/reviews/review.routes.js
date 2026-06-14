const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { createReview, getOrganizerReviews } = require("./review.controller");

const router = express.Router();

router.post("/", requireAuth, createReview);
router.get("/organizer/:organizer_id", getOrganizerReviews);

module.exports = router;