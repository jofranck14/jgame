const reviewService = require("./review.service");

function toInt(value, fieldName) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) {
    const err = new Error(`${fieldName} must be an integer`);
    err.statusCode = 400;
    throw err;
  }
  return n;
}

async function createReview(req, res, next) {
  try {
    const organizer_id = toInt(req.body?.organizer_id, "organizer_id");
    const rating = toInt(req.body?.rating, "rating");
    const comment = req.body?.comment ? String(req.body.comment).trim() : null;

    if (rating < 1 || rating > 5) {
      res.status(400);
      return next(new Error("rating must be between 1 and 5"));
    }

    if (organizer_id === req.user.id) {
      res.status(400);
      return next(new Error("You cannot review yourself"));
    }

    const review = await reviewService.createReview({
      organizer_id,
      user_id: req.user.id,
      rating,
      comment,
    });

    return res.status(201).json({ review });
  } catch (err) {
    if (err?.statusCode) res.status(err.statusCode);
    return next(err);
  }
}

async function getOrganizerReviews(req, res, next) {
  try {
    const organizer_id = toInt(req.params.organizer_id, "organizer_id");
    const data = await reviewService.getOrganizerReviews(organizer_id);
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { createReview, getOrganizerReviews };