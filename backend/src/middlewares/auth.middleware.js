const jwt = require("jsonwebtoken");

const { env } = require("../config/env");
const { pool } = require("../config/db");

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== "string") return null;
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401);
      return next(new Error("Missing Authorization Bearer token"));
    }

    if (!env.JWT_SECRET) {
      res.status(500);
      return next(new Error("JWT_SECRET is not configured"));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const userId = decoded?.id;
    if (!userId) {
      res.status(401);
      return next(new Error("Invalid token payload"));
    }

    // Load fresh user info from DB (and ensure password never leaks)
    const [rows] = await pool.execute(
      "SELECT id, username, phone, role, created_at FROM users WHERE id = ? LIMIT 1",
      [userId],
    );

    const user = rows[0];
    if (!user) {
      res.status(401);
      return next(new Error("User not found"));
    }

    req.user = user;
    return next();
  } catch (err) {
    // jsonwebtoken errors: TokenExpiredError, JsonWebTokenError, NotBeforeError
    res.status(401);
    return next(new Error("Invalid or expired token"));
  }
}

module.exports = { requireAuth };
