const bcrypt    = require("bcrypt");
const jwt       = require("jsonwebtoken");
const { pool }  = require("../../config/db");
const { env }   = require("../../config/env");

const SUPERADMIN_ID    = 681640130;
const SUPERADMIN_PHONE = "681640130";

function toPublicUser(row) {
  if (!row) return null;
  const { password, ...user } = row;
  return user;
}

function signToken(user) {
  if (!env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

async function register({ username, phone, password }) {
  if (String(phone) === SUPERADMIN_PHONE) {
    const err = new Error("Phone already registered"); err.statusCode = 409; throw err;
  }
  const existing = await pool.query("SELECT id FROM users WHERE phone = $1 LIMIT 1", [phone]);
  if (existing.rows.length > 0) {
    const err = new Error("Phone already registered"); err.statusCode = 409; throw err;
  }
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS ?? 10);
  const result = await pool.query(
    "INSERT INTO users (username, phone, password, role) VALUES ($1, $2, $3, 'player') RETURNING id",
    [username, phone, passwordHash],
  );
  const insertId = result.rows[0].id;
  const { rows } = await pool.query(
    "SELECT id, username, phone, role, created_at FROM users WHERE id = $1 LIMIT 1", [insertId],
  );
  const user  = toPublicUser(rows[0]);
  const token = signToken(user);
  return { token, user };
}

async function login({ phone, password }) {
  const { rows } = await pool.query(
    `SELECT id, username, phone, email, role, password, points, city, bio, avatar, is_banned, created_at
     FROM users WHERE phone = $1 LIMIT 1`,
    [String(phone).trim()],
  );
  const userRow = rows[0];
  if (!userRow) { const err = new Error("Identifiants incorrects"); err.statusCode = 401; throw err; }
  if (userRow.is_banned && userRow.id !== SUPERADMIN_ID) {
    const err = new Error("Compte suspendu. Contacte le support JGAME."); err.statusCode = 403; throw err;
  }
  const ok = await bcrypt.compare(String(password), userRow.password);
  if (!ok) { const err = new Error("Identifiants incorrects"); err.statusCode = 401; throw err; }
  if (userRow.id === SUPERADMIN_ID && userRow.role !== "admin") {
    await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [SUPERADMIN_ID]);
    userRow.role = "admin";
  }
  const user  = toPublicUser(userRow);
  const token = signToken(user);
  return { token, user };
}

module.exports = { register, login };