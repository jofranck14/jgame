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
  family:   4,
});

// Convertit les ? MySQL en $1 $2 ... PostgreSQL
pool.execute = (sql, params) => {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  return pool.query(pgSql, params).then((r) => [r.rows, r]);
};

module.exports = { pool };