const mysql = require("mysql2/promise");
const { env } = require("./env");

// Pool is created eagerly, but no connection is opened until first query.
const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: env.DB_CONNECTION_LIMIT,
  queueLimit: 0,
  namedPlaceholders: true,
});

module.exports = { pool };
