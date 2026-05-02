import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import Card from "../components/ui/Card";
import { formatDateTime } from "../utils/formatDate";
import api from "../services/api";

const PER_PAGE_T = 5; // tournois par page
const PER_PAGE_L = 10; // leaderboard par page

const STATUS_META = {
  pending:   { label: "À venir",  cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  ongoing:   { label: "En cours", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
  completed: { label: "Terminé",  cls: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  cancelled: { label: "Annulé",   cls: "bg-red-500/20 text-red-400 border-red-500/30" },
};
const getLevelKey = (pts) => pts >= 200 ? "goat" : pts >= 100 ? "legendary" : "beginner";
const LEVEL_ICONS = { goat: "👑", legendary: "⭐", beginner: "🌱" };

function Paginator({ page, total, perPage, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;
  return (
    <div className="flex gap-2 justify-center mt-4">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}
        className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white disabled:opacity-40 text-sm transition-all">
        ←
      </button>
      <span className="px-3 py-1.5 text-slate-400 text-sm">
        {page} / {totalPages}
      </span>
      <button disabled={page === totalPages} onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white disabled:opacity-40 text-sm transition-all">
        →
      </button>
    </div>
  );
}

export default function Game() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [game, setGame]               = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]         = useState(true);

  // Filtres tournois
  const [statusFilter, setStatusFilter] = useState("");
  const [pageT, setPageT]               = useState(1);

  // Pagination leaderboard
  const [pageL, setPageL] = useState(1);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [gRes, tRes, lRes] = await Promise.all([
          api.get(`/games/${id}`),
          api.get(`/tournaments?game_id=${id}`),
          api.get(`/results/leaderboard/${id}`).catch(() => ({ data: { leaderboard: [] } })),
        ]);
        setGame(gRes.data?.game || gRes.data);
        setTournaments(tRes.data?.tournaments || tRes.data?.data || tRes.data || []);
        setLeaderboard(lRes.data?.leaderboard || lRes.data || []);
      } catch {
        toast.error("Jeu introuvable");
        navigate("/games");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-48 rounded-3xl bg-slate-800/50 animate-pulse" />
        <div className="h-64 rounded-2xl bg-slate-800/50 animate-pulse" />
      </div>
    </div>
  );
  if (!game) return null;

  // Tournois filtrés + paginés
  const filteredT = statusFilter ? tournaments.filter((t) => t.status === statusFilter) : tournaments;
  const totalT    = filteredT.length;
  const paginatedT = filteredT.slice((pageT - 1) * PER_PAGE_T, pageT * PER_PAGE_T);

  // Leaderboard filtré (sans 0 pts) + paginé
  const filteredL  = leaderboard.filter((p) => (p.points || 0) > 0);
  const paginatedL = filteredL.slice((pageL - 1) * PER_PAGE_L, pageL * PER_PAGE_L);

  return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Hero jeu */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden p-8"
          style={{ background: "linear-gradient(135deg,#1e1040 0%,#0F172A 60%,#0c1a2e 100%)" }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 30% 50%,#7C3AED 0%,transparent 50%)" }} />
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl flex-shrink-0"
              style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(6,182,212,0.2))", border: "1px solid rgba(124,58,237,0.4)" }}>
              🎮
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: "Poppins,sans-serif" }}>
                {game.name}
              </h1>
              <p className="text-slate-400 text-sm">
                {tournaments.length} tournoi{tournaments.length !== 1 ? "s" : ""}
                {" · "}{filteredL.length} joueur{filteredL.length !== 1 ? "s" : ""} classés
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Tournois ── */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-xl font-bold text-white">🏆 Tournois</h2>
            {/* Menu déroulant filtre statut */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPageT(1); }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-300 text-sm focus:outline-none focus:border-purple-500 transition-colors">
              <option value="">Tous les statuts</option>
              <option value="pending">À venir</option>
              <option value="ongoing">En cours</option>
              <option value="completed">Terminés</option>
              <option value="cancelled">Annulés</option>
            </select>
          </div>

          {paginatedT.length === 0 ? (
            <Card className="text-center py-10">
              <div className="text-3xl mb-3">🏆</div>
              <p className="text-slate-400">
                {statusFilter ? "Aucun tournoi avec ce statut" : "Aucun tournoi pour ce jeu"}
              </p>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedT.map((t) => {
                  const sM = STATUS_META[t.status] || STATUS_META.pending;
                  const progress = t.max_players ? Math.round((t.current_players / t.max_players) * 100) : 0;
                  const isFull   = t.current_players >= t.max_players;
                  return (
                    <motion.div key={t.id} whileHover={{ scale: 1.01 }}>
                      <Card className="cursor-pointer" onClick={() => navigate(`/tournaments/${t.id}`)}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm truncate">{t.title}</p>
                            <p className="text-slate-400 text-xs mt-0.5">
                              {t.type === "physical" ? "📍 Présentiel" : "🌐 En ligne"}
                              {t.city ? ` · ${t.city}` : ""}
                              {t.date ? ` · ${formatDateTime(t.date)}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${sM.cls}`}>{sM.label}</span>
                            <span className="text-cyan-400 font-bold text-sm">
                              {Number(t.price) > 0 ? `${Number(t.price).toLocaleString()} F` : "Gratuit"}
                            </span>
                          </div>
                        </div>

                        {/* Barre de places */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className={isFull ? "text-red-400 font-semibold" : "text-slate-400"}>
                              {isFull ? "🔴 Complet" : `👥 ${t.current_players} / ${t.max_players} places`}
                            </span>
                            <span className="text-slate-500">{progress}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full" style={{ background: "#1E293B" }}>
                            <div className="h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${progress}%`,
                                background: isFull
                                  ? "linear-gradient(90deg,#EF4444,#DC2626)"
                                  : progress >= 75
                                    ? "linear-gradient(90deg,#F59E0B,#EF4444)"
                                    : "linear-gradient(90deg,#7C3AED,#06B6D4)",
                              }} />
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
              <Paginator page={pageT} total={totalT} perPage={PER_PAGE_T} onChange={(p) => { setPageT(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              <p className="text-center text-slate-500 text-xs mt-2">
                {totalT} tournoi{totalT !== 1 ? "s" : ""} · page {pageT}/{Math.max(1, Math.ceil(totalT / PER_PAGE_T))}
              </p>
            </>
          )}
        </section>

        {/* ── Classement ── */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">🏅 Classement — {game.name}</h2>
          <Card>
            {filteredL.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🌱</div>
                <p className="text-white font-semibold mb-1">Aucun joueur classé</p>
                <p className="text-slate-500 text-sm">Participe à un tournoi pour apparaître ici !</p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  {paginatedL.map((p, i) => {
                    const globalIdx = (pageL - 1) * PER_PAGE_L + i;
                    const level     = getLevelKey(p.points || 0);
                    const medal =
                      globalIdx === 0 ? { bg: "bg-yellow-500", txt: "text-black", icon: "🥇" } :
                      globalIdx === 1 ? { bg: "bg-slate-400",  txt: "text-black", icon: "🥈" } :
                      globalIdx === 2 ? { bg: "bg-amber-700",  txt: "text-white", icon: "🥉" } :
                                        { bg: "bg-slate-800",  txt: "text-slate-300", icon: null };
                    return (
                      <div key={p.user_id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-700/30 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/profile/${p.user_id}`)}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${medal.bg} ${medal.txt}`}>
                          {medal.icon || globalIdx + 1}
                        </div>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
                          {p.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate group-hover:text-purple-300 transition-colors">
                            {p.username}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {LEVEL_ICONS[level]} {level}
                            {p.wins != null ? ` · ${p.wins}V ${p.losses || 0}D` : ""}
                          </p>
                        </div>
                        <p className="text-purple-400 font-bold text-sm flex-shrink-0">
                          {p.points} <span className="text-slate-500 font-normal text-xs">pts</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
                <Paginator page={pageL} total={filteredL.length} perPage={PER_PAGE_L} onChange={setPageL} />
              </>
            )}
          </Card>
        </section>

      </div>
    </div>
  );
}