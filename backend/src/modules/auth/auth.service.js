const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const { pool } = require("../../config/db");
const { env }  = require("../../config/env");

const SUPERADMIN_ID    = 681640130;
const SUPERADMIN_PHONE = "681640130";

function toPublicUser(row) {
  if (!row) return null;
  const { password, ...user } = row;
  return user;
}

function signToken(user) {
  if (!env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(
    { id: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );
}

async function register({ username, phone, password }) {
  // Bloquer toute tentative d'enregistrement avec le numéro superadmin
  if (String(phone) === SUPERADMIN_PHONE) {
    const err = new Error("Phone already registered");
    err.statusCode = 409;
    throw err;
  }

  const [existing] = await pool.execute(
    "SELECT id FROM users WHERE phone = ? LIMIT 1", [phone],
  );
  if (existing.length > 0) {
    const err = new Error("Phone already registered");
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS ?? 10);
  const [result] = await pool.execute(
    "INSERT INTO users (username, phone, password, role) VALUES (?, ?, ?, 'player')",
    [username, phone, passwordHash],
  );
  const [rows] = await pool.execute(
    "SELECT id, username, phone, role, created_at FROM users WHERE id = ? LIMIT 1",
    [result.insertId],
  );
  const user  = toPublicUser(rows[0]);
  const token = signToken(user);
  return { token, user };
}

async function login({ phone, password }) {
  // Chercher par phone (le champ "phone" du formulaire peut contenir le numéro superadmin)
  const [rows] = await pool.execute(
    `SELECT id, username, phone, email, role, password, points, city, bio, avatar, is_banned, created_at
     FROM users WHERE phone = ? LIMIT 1`,
    [String(phone).trim()],
  );

  const userRow = rows[0];
  if (!userRow) {
    const err = new Error("Identifiants incorrects");
    err.statusCode = 401;
    throw err;
  }

  // Vérifier si l'utilisateur est banni (sauf superadmin)
  if (userRow.is_banned && userRow.id !== SUPERADMIN_ID) {
    const err = new Error("Compte suspendu. Contacte le support JGAME.");
    err.statusCode = 403;
    throw err;
  }

  const ok = await bcrypt.compare(String(password), userRow.password);
  if (!ok) {
    const err = new Error("Identifiants incorrects");
    err.statusCode = 401;
    throw err;
  }

  // Garantir que le superadmin est toujours admin même si quelqu'un a modifié sa BDD
  if (userRow.id === SUPERADMIN_ID && userRow.role !== "admin") {
    await pool.execute("UPDATE users SET role = 'admin' WHERE id = ?", [SUPERADMIN_ID]);
    userRow.role = "admin";
  }

  const user  = toPublicUser(userRow);
  const token = signToken(user);
  return { token, user };
}

module.exports = { register, login };