import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { listTournamentsApi, listGamesApi, getLeaderboardApi } from "../features/tournaments/tournamentApi";
import { formatDateTime } from "../utils/formatDate";
import { useAuthStore } from "../features/auth/authStore";
import api from "../services/api";

const MAX_TOURNAMENTS = 6;
const MAX_GAMES = 8;

function StatusBadge({ status }) {
  const map = {
    pending:   { label: "À venir",  className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    ongoing:   { label: "En cours", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    completed: { label: "Terminé",  className: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
    cancelled: { label: "Annulé",   className: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${s.className}`}>
      {s.label}
    </span>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [games, setGames]             = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [conversations, setConversations] = useState([]);
  const [showConvs, setShowConvs]         = useState(false);
  const [unreadCount, setUnreadCount]     = useState(0);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tRes, gRes, lRes] = await Promise.all([
          listTournamentsApi(),
          listGamesApi(),
          getLeaderboardApi(),
        ]);
        setTournaments(tRes.data?.tournaments || tRes.data?.data || tRes.data || []);
        setGames(gRes.data?.games || gRes.data || []);
        setLeaderboard(lRes.data?.leaderboard || lRes.data || []);
      } catch {
        toast.error("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Charger les conversations
  useEffect(() => {
    if (!user) return;
    api.get("/chat/conversations")
      .then((res) => {
        const convs = res.data?.conversations || res.data || [];
        setConversations(convs);
        // Compter les messages non lus
        const unread = convs.filter((c) => c.is_read === 0 || c.is_read === false).length;
        setUnreadCount(unread);
      })
      .catch(() => {});
  }, [user]);

  const visibleTournaments = tournaments.slice(0, MAX_TOURNAMENTS);
  const visibleGames = games.slice(0, MAX_GAMES);
  const hasMoreTournaments = tournaments.length > MAX_TOURNAMENTS;
  const hasMoreGames = games.length > MAX_GAMES;

  return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden p-8 md:p-12"
          style={{ background: "linear-gradient(135deg, #1e1040 0%, #0F172A 50%, #0c1a2e 100%)" }}
        >
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, #7C3AED 0%, transparent 50%), radial-gradient(circle at 80% 50%, #06B6D4 0%, transparent 50%)"
          }} />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-1.5 mb-4">
              <span className="text-purple-300 text-sm font-medium">⚡ Plateforme Gaming #1 au Cameroun</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
              Joue. Compétis.{" "}
              <span style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Domine.
              </span>
            </h1>
            <p className="text-slate-400 text-lg mb-6 max-w-xl">
              Rejoins des tournois, affronte des joueurs locaux et grimpe dans le classement.
            </p>
            <Button size="lg" onClick={() => navigate("/tournaments")}>
              Voir tous les tournois
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { emoji: "🏆", label: "Tournois", value: tournaments.length },
            { emoji: "🎮", label: "Jeux",     value: games.length },
            { emoji: "👥", label: "Joueurs",  value: leaderboard.length },
          ].map((stat) => (
            <Card key={stat.label} className="text-center">
              <div className="text-2xl mb-2">{stat.emoji}</div>
              <p className="text-2xl font-bold text-white">{loading ? "—" : stat.value}</p>
              <p className="text-slate-400 text-sm">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Tournois récents */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">🏆 Tournois récents</h2>
            <button
              onClick={() => navigate("/tournaments")}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
            >
              Voir tous ({tournaments.length}) →
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-800/50 rounded-2xl h-40 animate-pulse" />
              ))}
            </div>
          ) : visibleTournaments.length === 0 ? (
            <Card className="text-center py-12">
              <div className="text-4xl mb-3">🏆</div>
              <p className="text-slate-400">Aucun tournoi disponible</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleTournaments.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card glow className="cursor-pointer h-full" onClick={() => navigate(`/tournaments/${t.id}`)}>
                      <div className="flex items-start justify-between mb-3">
                        <StatusBadge status={t.status || "pending"} />
                        <span className="text-cyan-400 font-bold text-sm">
                          {t.price > 0 ? `${Number(t.price).toLocaleString()} FCFA` : "Gratuit"}
                        </span>
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-1 line-clamp-1">{t.title}</h3>
                      <p className="text-slate-400 text-sm mb-3">
                        {t.type === "physical" ? "📍 Physique" : "🌐 En ligne"}
                        {t.city ? ` · ${t.city}` : ""}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">
                          👥 {t.current_players || 0}/{t.max_players} joueurs
                        </span>
                        <span className="text-slate-500 text-xs">{formatDateTime(t.start_date)}</span>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
              {hasMoreTournaments && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => navigate("/tournaments")}
                    className="px-6 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:border-purple-500/50 hover:text-purple-300 transition-all text-sm font-medium"
                  >
                    + {tournaments.length - MAX_TOURNAMENTS} autres tournois
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Jeux populaires */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">🎮 Jeux populaires</h2>
            {hasMoreGames && (
              <span className="text-sm text-slate-500">{games.length} jeux disponibles</span>
            )}
          </div>
          {loading ? (
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-shrink-0 w-28 h-28 rounded-2xl bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : visibleGames.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-slate-400">Aucun jeu enregistré</p>
            </Card>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {visibleGames.map((game) => (
                <motion.div
                  key={game.id}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => navigate(`/games/${game.id}`)}
                  className="flex-shrink-0 cursor-pointer"
                >
                  <div
                    className="w-28 h-28 rounded-2xl flex items-center justify-center border border-slate-700/50 hover:border-purple-500/40 transition-colors"
                    style={{ background: "linear-gradient(135deg, #1e1040, #0c1a2e)" }}
                  >
                    <div className="text-center p-2">
                      <div className="text-3xl mb-1">🎮</div>
                      <div className="text-xs text-slate-300 line-clamp-2 leading-tight">{game.name}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {hasMoreGames && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  onClick={() => navigate("/tournaments")}
                  className="flex-shrink-0 cursor-pointer"
                >
                  <div
                    className="w-28 h-28 rounded-2xl flex items-center justify-center border border-purple-500/30 hover:border-purple-500/60 transition-colors"
                    style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.1))" }}
                  >
                    <div className="text-center p-2">
                      <div className="text-2xl mb-1">+{games.length - MAX_GAMES}</div>
                      <div className="text-xs text-purple-400 font-medium">Voir tous</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </section>

        {/* Leaderboard */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">🏅 Top Joueurs</h2>
            <button
              onClick={() => navigate("/leaderboard")}
              className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 hover:border-purple-500/50 hover:text-purple-300 transition-all cursor-pointer"
            >
              Classement général →
            </button>
          </div>
          <Card>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-slate-700/30 animate-pulse" />
                ))}
              </div>
            ) : leaderboard.filter((p) => p.points > 0).length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🌱</div>
                <p className="text-slate-400 font-medium">Aucun joueur classé pour l'instant</p>
                <p className="text-slate-600 text-sm mt-1">Participe à un tournoi pour apparaître ici !</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.filter((p) => p.points > 0).slice(0, 5).map((player, index) => {
                  const medal =
                    index === 0 ? { bg: "bg-yellow-500", text: "text-black", icon: "🥇" } :
                    index === 1 ? { bg: "bg-slate-400",  text: "text-black", icon: "🥈" } :
                    index === 2 ? { bg: "bg-amber-700",  text: "text-white", icon: "🥉" } :
                                  { bg: "bg-slate-700",  text: "text-slate-300", icon: null };
                  const levelColors = { beginner: "text-slate-400", legendary: "text-yellow-400", goat: "text-purple-400" };
                  const levelIcons  = { beginner: "🌱", legendary: "⭐", goat: "👑" };
                  const level = player.level || "beginner";
                  return (
                    <div
                      key={player.user_id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-700/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/profile/${player.user_id}`)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${medal.bg} ${medal.text}`}>
                        {medal.icon || index + 1}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {player.username?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate group-hover:text-purple-300 transition-colors">{player.username}</p>
                        <p className={`text-xs capitalize flex items-center gap-1 ${levelColors[level]}`}>
                          <span>{levelIcons[level]}</span>
                          {level}
                          {player.wins != null && (
                            <span className="text-slate-500 ml-1">· {player.wins}V / {player.losses || 0}D</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-purple-400 font-bold text-sm">{player.points} pts</p>
                        {player.wins != null && (
                          <p className="text-xs text-slate-500">{player.wins + (player.losses || 0)} matchs</p>
                        )}
                      </div>
                      <span className="text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0">›</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>


        {/* Bannière communauté WhatsApp */}
        <motion.a
          href="https://chat.whatsapp.com/G9VneqjbXbdJEz82PghwiA"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-4 p-4 rounded-2xl border border-green-500/30 cursor-pointer transition-all hover:border-green-500/60"
          style={{ background: "linear-gradient(135deg, rgba(37,211,102,0.1), rgba(37,211,102,0.05))" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Rejoins la communauté JGAME</p>
            <p className="text-green-400 text-xs mt-0.5">Tournois, actus et rencontres de joueurs sur WhatsApp</p>
          </div>
          <span className="text-green-400 text-lg flex-shrink-0">›</span>
        </motion.a>

      </div>


      {/* FAB conversations */}
      {user && (
        <div className="fixed bottom-6 left-6 z-50">
          {/* Liste conversations */}
          <AnimatePresence>
            {showConvs && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="mb-3 w-72 rounded-2xl border border-slate-700 shadow-xl overflow-hidden"
                style={{ background: "#1E293B" }}
              >
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <span className="text-white font-semibold text-sm">💬 Conversations</span>
                  <button
                    onClick={() => navigate("/chat")}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Voir tout →
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-400 text-sm">Aucune conversation</p>
                    </div>
                  ) : (
                    conversations.slice(0, 6).map((conv) => (
                      <div
                        key={conv.user_id || conv.id}
                        onClick={() => { navigate(`/chat/${conv.user_id || conv.id}`); setShowConvs(false); }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-slate-700/50 last:border-0"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {conv.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{conv.username}</p>
                          <p className="text-slate-400 text-xs truncate">{conv.last_message || "..."}</p>
                        </div>
                        {conv.is_read === 0 && (
                          <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouton principal */}
          <button
            onClick={() => setShowConvs((v) => !v)}
            className="w-14 h-14 rounded-full text-white text-2xl shadow-lg shadow-cyan-500/30 flex items-center justify-center transition-transform hover:scale-110 relative"
            style={{ background: "linear-gradient(135deg, #06B6D4, #7C3AED)" }}
            title="Conversations"
          >
            💬
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* FAB créer tournoi */}
      {["organizer", "admin"].includes(user?.role) && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => navigate("/tournaments/create")}
            className="w-14 h-14 rounded-full text-white text-2xl shadow-lg shadow-purple-500/30 flex items-center justify-center transition-transform hover:scale-110"
            style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }}
            title="Créer un tournoi"
          >
            ➕
          </button>
        </div>
      )}

      
    </div>
  );
}