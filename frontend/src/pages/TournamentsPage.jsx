import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/authStore";
import { listTournamentsApi, listGamesApi } from "../features/tournaments/tournamentApi";
import Navbar from "../components/layout/Navbar";

const PER_PAGE = 10;

const STATUS_LABELS = {
  pending:   { label: "En attente", color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
  ongoing:   { label: "En cours",   color: "#10B981", bg: "rgba(16,185,129,0.15)" },
  completed: { label: "Terminé",    color: "#94A3B8", bg: "rgba(148,163,184,0.15)" },
  cancelled: { label: "Annulé",     color: "#EF4444", bg: "rgba(239,68,68,0.15)" },
};

const TYPE_LABELS = {
  online:   { label: "En ligne",    icon: "🌐" },
  physical: { label: "Présentiel",  icon: "📍" },
};

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || { label: status, color: "#94A3B8", bg: "rgba(148,163,184,0.15)" };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.color}44`,
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

function TournamentCard({ tournament, onClick }) {
  const { title, game, type, price, max_players, status, city, start_date } = tournament;
  const typeInfo = TYPE_LABELS[type] || { label: type, icon: "🎮" };
  const date = start_date
    ? new Date(start_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  return (
    <div
      onClick={onClick}
      style={{
        background: "rgba(30,41,59,0.5)",
        border: "1px solid rgba(51,65,85,0.5)",
        borderRadius: 16,
        padding: "1rem 1.25rem",
        cursor: "pointer",
        transition: "border-color 0.2s, background 0.2s",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)";
        e.currentTarget.style.background = "rgba(30,41,59,0.8)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(51,65,85,0.5)";
        e.currentTarget.style.background = "rgba(30,41,59,0.5)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: "#F1F5F9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#94A3B8" }}>
            {game?.name || "—"} · {typeInfo.icon} {typeInfo.label}{city ? ` · ${city}` : ""}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#94A3B8", flexWrap: "wrap", alignItems: "center" }}>
        <span>📅 {date}</span>
        <span>👥 {tournament.current_players || 0}/{max_players} joueurs</span>
        <span style={{ color: "#06B6D4", fontWeight: 700, marginLeft: "auto" }}>
          {price > 0 ? `${Number(price).toLocaleString("fr-FR")} FCFA` : "Gratuit"}
        </span>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  const btn = (active, disabled = false) => ({
    padding: "6px 12px",
    borderRadius: 8,
    border: active ? "1px solid #7C3AED" : "1px solid rgba(51,65,85,0.8)",
    background: active ? "rgba(124,58,237,0.2)" : "transparent",
    color: active ? "#A78BFA" : "#94A3B8",
    cursor: disabled ? "default" : "pointer",
    fontWeight: active ? 600 : 400,
    fontSize: 14,
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: "1.5rem", alignItems: "center" }}>
      <button style={btn(false, page === 1)} disabled={page === 1} onClick={() => onPageChange(page - 1)}>←</button>
      {start > 1 && <span style={{ color: "#94A3B8", fontSize: 14 }}>...</span>}
      {pages.map((p) => (
        <button key={p} style={btn(p === page)} onClick={() => p !== page && onPageChange(p)}>{p}</button>
      ))}
      {end < totalPages && <span style={{ color: "#94A3B8", fontSize: 14 }}>...</span>}
      <button style={btn(false, page === totalPages)} disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>→</button>
    </div>
  );
}

export default function TournamentsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [tournaments, setTournaments] = useState([]);
  const [games,       setGames]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const [search,       setSearch]       = useState("");
  const [filterGame,   setFilterGame]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType,   setFilterType]   = useState("");
  const [page,         setPage]         = useState(1);

  const canCreate = ["organizer", "admin"].includes(user?.role);

  useEffect(() => {
    listGamesApi()
      .then((res) => setGames(res.data?.games || res.data || []))
      .catch(() => {});
  }, []);

  const fetchTournaments = useCallback(() => {
    setLoading(true);
    setError(null);
    listTournamentsApi()
      .then((res) => {
        const data = res.data?.tournaments || res.data?.data || res.data || [];
        setTournaments(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Impossible de charger les tournois."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTournaments();
    setPage(1);
  }, [fetchTournaments]);

  const filtered = tournaments.filter((t) => {
    const matchSearch = !search       || t.title?.toLowerCase().includes(search.toLowerCase());
    const matchGame   = !filterGame   || String(t.game_id) === String(filterGame);
    const matchStatus = !filterStatus || t.status === filterStatus;
    const matchType   = !filterType   || t.type   === filterType;
    return matchSearch && matchGame && matchStatus && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasFilters = search || filterGame || filterStatus || filterType;

  const resetFilters = () => {
    setSearch(""); setFilterGame(""); setFilterStatus(""); setFilterType(""); setPage(1);
  };

  const inputStyle = {
    flex: 1,
    minWidth: 130,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid rgba(51,65,85,0.8)",
    background: "rgba(15,23,42,0.8)",
    color: "#F1F5F9",
    fontSize: 14,
    outline: "none",
  };

  return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#F1F5F9", fontFamily: "Poppins, sans-serif" }}>
              🏆 Tournois
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#94A3B8" }}>
              {loading ? "Chargement..." : `${filtered.length} tournoi${filtered.length !== 1 ? "s" : ""} trouvé${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => navigate("/tournaments/create")}
              style={{
                padding: "9px 20px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              + Créer un tournoi
            </button>
          )}
        </div>

        {/* Filtres */}
        <div style={{
          background: "rgba(30,41,59,0.5)",
          border: "1px solid rgba(51,65,85,0.5)",
          borderRadius: 16,
          padding: "1rem",
          marginBottom: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}>
          <input
            type="text"
            placeholder="Rechercher un tournoi par titre..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ ...inputStyle, flex: "none", width: "100%", boxSizing: "border-box" }}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={filterGame} onChange={(e) => { setFilterGame(e.target.value); setPage(1); }} style={inputStyle}>
              <option value="">Tous les jeux</option>
              {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>

            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} style={inputStyle}>
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="ongoing">En cours</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
            </select>

            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} style={inputStyle}>
              <option value="">Tous les types</option>
              <option value="online">🌐 En ligne</option>
              <option value="physical">📍 Présentiel</option>
            </select>

            {hasFilters && (
              <button
                onClick={resetFilters}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(51,65,85,0.8)",
                  background: "transparent",
                  color: "#94A3B8",
                  fontSize: 14,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                ✕ Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Contenu */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 90, borderRadius: 16, background: "rgba(30,41,59,0.5)", animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <p style={{ color: "#EF4444", fontSize: 14, marginBottom: 12 }}>{error}</p>
            <button
              onClick={fetchTournaments}
              style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #EF4444", background: "transparent", color: "#EF4444", cursor: "pointer", fontSize: 13 }}
            >
              Réessayer
            </button>
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "#94A3B8" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎮</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#F1F5F9", margin: "0 0 6px" }}>Aucun tournoi trouvé</p>
            <p style={{ fontSize: 14 }}>{hasFilters ? "Essaie d'autres filtres." : "Il n'y a pas encore de tournois."}</p>
            {hasFilters && (
              <button
                onClick={resetFilters}
                style={{ marginTop: 16, padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(51,65,85,0.8)", background: "transparent", color: "#F1F5F9", cursor: "pointer", fontSize: 13 }}
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {paginated.map((t) => (
              <TournamentCard key={t.id} tournament={t} onClick={() => navigate(`/tournaments/${t.id}`)} />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

        {!loading && !error && filtered.length > 0 && (
          <p style={{ textAlign: "center", fontSize: 13, color: "#475569", marginTop: "1rem" }}>
            Page {page} / {totalPages} — {filtered.length} tournoi{filtered.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}