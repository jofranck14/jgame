const path = require("path");
const dotenv = require("dotenv");

// Load .env from backend root (stable even if process.cwd() differs)
dotenv.config({
  path: process.env.ENV_PATH || path.resolve(__dirname, "../../.env"),
});

function toInt(value, fallback) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const v = String(value).toLowerCase().trim();
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return fallback;
}

const NODE_ENV = process.env.NODE_ENV || "development";

const env = Object.freeze({
  NODE_ENV,
  PORT: toInt(process.env.PORT, 3000),
  TRUST_PROXY: toBool(process.env.TRUST_PROXY, true),

  MORGAN_FORMAT: process.env.MORGAN_FORMAT || (NODE_ENV === "production" ? "combined" : "dev"),

  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  CORS_OPTIONS: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: toBool(process.env.CORS_CREDENTIALS, false),
  },

  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: toInt(process.env.DB_PORT, 3306),
  DB_USER: process.env.DB_USER || "root",
  DB_PASSWORD: process.env.DB_PASSWORD || "",
  DB_NAME: process.env.DB_NAME || "jgame",
  DB_CONNECTION_LIMIT: toInt(process.env.DB_CONNECTION_LIMIT, 10),

  JWT_SECRET: process.env.JWT_SECRET || "",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  BCRYPT_SALT_ROUNDS: toInt(process.env.BCRYPT_SALT_ROUNDS, 10),
});

module.exports = { env };
