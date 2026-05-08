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

// Log erreurs de connexion
pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
});

// Test de connexion au démarrage
pool.query("SELECT 1").then(() => {
  console.log("[DB] Supabase PostgreSQL connecté ✅");
}).catch((err) => {
  console.error("[DB] Erreur connexion Supabase:", err.message);
});

pool.execute = (sql, params) => {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  return pool.query(pgSql, params).then((r) => [r.rows, r]);
};

module.exports = { pool };