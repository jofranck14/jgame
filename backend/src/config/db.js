const { Pool } = require("pg");
const { env } = require("./env");

const pool = new Pool({
  host:     env.DB_HOST,
  port:     env.DB_PORT,
  user:     env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  max:      env.DB_CONNECTION_LIMIT,
  ssl:      { rejectUnauthorized: false },
  family:   4, // ← Force IPv4
});

pool.execute = (sql, params) => pool.query(sql, params);

module.exports = { pool };