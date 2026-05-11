const { pool } = require("../../config/db");

async function createTournament(organizerId, payload) {
  const { title, game_id, price, max_players, date, city, type, location_details } = payload;

  const result = await pool.query(
    `INSERT INTO tournaments
      (organizer_id, title, game_id, price, max_players, start_date, city, type, location_details, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
     RETURNING id`,
    [organizerId, title, game_id, price, max_players, date, city ?? null, type ?? "online", location_details ?? null],
  );

  const insertId = result.rows[0].id;
  const tournament = await getTournamentById(insertId);

  try {
    const players = await pool.query(
      "SELECT id FROM users WHERE (is_banned = 0 OR is_banned IS NULL) AND id <> $1", [organizerId],
    );
    if (players.rows.length > 0) {
      for (const u of players.rows) {
        await pool.query(
          "INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES ($1, $2, $3, $4, $5, 0)",
          [
            u.id, "tournament",
            `🏆 Nouveau tournoi : ${title}`,
            `Un nouveau tournoi ${type === "physical" ? "présentiel" : "en ligne"} a été créé${city ? ` à ${city}` : ""}. Prix : ${Number(price) > 0 ? Number(price).toLocaleString() + " FCFA" : "Gratuit"}.`,
            `/tournaments/${insertId}`,
          ]
        );
      }
    }
  } catch (_) {}

  return tournament;
}

async function listTournaments(game_id = null) {
  let query = `
    SELECT t.id, t.title, t.game_id, g.name AS game_name, t.price, t.max_players,
           t.status, t.type, t.city, t.location_details, t.start_date AS date, t.created_at,
           COUNT(p.id) AS current_players
    FROM tournaments t
    LEFT JOIN games g ON g.id = t.game_id
    LEFT JOIN participants p ON p.tournament_id = t.id
  `;
  const params = [];
  if (game_id && Number.isFinite(game_id)) {
    query += " WHERE t.game_id = $1";
    params.push(game_id);
  }
  query += ` GROUP BY t.id, t.title, t.game_id, g.name, t.price, t.max_players,
             t.status, t.type, t.city, t.location_details, t.start_date, t.created_at
             ORDER BY t.id DESC`;

  const { rows } = await pool.query(query, params);
  return rows.map((r) => ({
    id: r.id, title: r.title, game_id: r.game_id, game_name: r.game_name,
    price: Number(r.price), max_players: Number(r.max_players), status: r.status,
    type: r.type, city: r.city, location_details: r.location_details,
    date: r.date, current_players: Number(r.current_players) || 0, created_at: r.created_at,
  }));
}

async function getTournamentById(id) {
  const { rows } = await pool.query(
    `SELECT t.id, t.title, t.game_id, g.name AS game_name, t.price, t.max_players,
            t.status, t.type, t.city, t.location_details, t.start_date AS date,
            t.organizer_id, t.created_at, COUNT(p.id) AS current_players
     FROM tournaments t
     LEFT JOIN games g ON g.id = t.game_id
     LEFT JOIN participants p ON p.tournament_id = t.id
     WHERE t.id = $1
     GROUP BY t.id, t.title, t.game_id, g.name, t.price, t.max_players,
              t.status, t.type, t.city, t.location_details, t.start_date, t.organizer_id, t.created_at
     LIMIT 1`, [id],
  );
  const r = rows[0];
  if (!r) return null;

  const parts = await pool.query(
    `SELECT p.user_id, u.username, p.payment_status
     FROM participants p JOIN users u ON u.id = p.user_id
     WHERE p.tournament_id = $1`, [id],
  );

  return {
    id: r.id, title: r.title, game_id: r.game_id, game_name: r.game_name,
    price: Number(r.price), max_players: Number(r.max_players), status: r.status,
    type: r.type, city: r.city, location_details: r.location_details,
    date: r.date, organizer_id: r.organizer_id,
    current_players: Number(r.current_players) || 0,
    created_at: r.created_at, participants: parts.rows,
  };
}

async function updateTournament(id, updates) {
  if (!Object.keys(updates).length) return getTournamentById(id);
  const allowed = ["title","status","city","type","max_players","price","start_date","location_details"];
  const filtered = {};
  for (const k of allowed) if (updates[k] !== undefined) filtered[k] = updates[k];
  if (!Object.keys(filtered).length) return getTournamentById(id);
  const sets   = Object.keys(filtered).map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = [...Object.values(filtered), id];
  await pool.query(`UPDATE tournaments SET ${sets} WHERE id = $${values.length}`, values);
  return getTournamentById(id);
}

async function deleteTournament(id) {
  await pool.query("DELETE FROM participants WHERE tournament_id = $1", [id]);
  await pool.query("DELETE FROM payments     WHERE tournament_id = $1", [id]);
  await pool.query("DELETE FROM results      WHERE tournament_id = $1", [id]);
  await pool.query("DELETE FROM tournaments  WHERE id = $1", [id]);
}

async function joinTournament(tournamentId, userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Verrouiller la ligne du tournoi SANS GROUP BY
    const tRes = await client.query(
      "SELECT id, title, price, max_players FROM tournaments WHERE id = $1 FOR UPDATE",
      [tournamentId],
    );
    const t = tRes.rows[0];
    if (!t) { const e = new Error("Tournament not found"); e.statusCode = 404; throw e; }

    // 2. Compter les participants séparément
    const countRes = await client.query(
      "SELECT COUNT(*) AS current_players FROM participants WHERE tournament_id = $1",
      [tournamentId],
    );
    const currentPlayers = Number(countRes.rows[0]?.current_players) || 0;

    if (currentPlayers >= Number(t.max_players)) {
      const e = new Error("Tournament is full"); e.statusCode = 409; throw e;
    }

    const amount = Number(t.price) || 0;
    if (amount > 0) {
      const pRows = await client.query(
        "SELECT id, status FROM payments WHERE tournament_id = $1 AND user_id = $2 ORDER BY id DESC LIMIT 1",
        [tournamentId, userId],
      );
      let paymentId = pRows.rows[0]?.id || null;
      let paymentStatus = pRows.rows[0]?.status || null;

      if (!paymentId) {
        const pRes = await client.query(
          "INSERT INTO payments (user_id, tournament_id, amount, status, verified_by_admin) VALUES ($1, $2, $3, 'pending', 0) RETURNING id",
          [userId, tournamentId, amount],
        );
        paymentId = pRes.rows[0].id;
        paymentStatus = "pending";

        try {
          const admins = await client.query("SELECT id FROM users WHERE role = 'admin'");
          if (admins.rows.length) {
            const uRows = await client.query("SELECT username FROM users WHERE id = $1 LIMIT 1", [userId]);
            const username = uRows.rows[0]?.username || `#${userId}`;
            for (const a of admins.rows) {
              await client.query(
                "INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES ($1, $2, $3, $4, $5, 0)",
                [a.id, "payment", "💳 Paiement en attente",
                 `${username} a soumis un paiement de ${amount.toLocaleString()} FCFA pour "${t.title}". À valider.`,
                 "/admin"]
              );
            }
          }
        } catch (_) {}
      }

      await client.query("COMMIT");
      return {
        paymentRequired: true,
        payment: { id: paymentId, tournament_id: tournamentId, user_id: userId, amount, status: paymentStatus },
        tournament: await getTournamentById(tournamentId),
      };
    }

    try {
      await client.query(
        "INSERT INTO participants (tournament_id, user_id, payment_status) VALUES ($1, $2, 'paid')",
        [tournamentId, userId],
      );
    } catch (e) {
      if (e?.code === "23505") { const err = new Error("Already joined"); err.statusCode = 409; throw err; }
      throw e;
    }

    await client.query("COMMIT");
    return getTournamentById(tournamentId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createTournament, listTournaments, getTournamentById, updateTournament, deleteTournament, joinTournament };