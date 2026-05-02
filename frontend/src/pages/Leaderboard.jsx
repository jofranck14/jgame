import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import Card   from "../components/ui/Card";
import { getLeaderboardApi, getGameLeaderboard, listGamesApi } from "../features/tournaments/tournamentApi";

function getLevel(pts) {
  if (pts >= 200) return { label: "GOAT",      emoji: "👑", color: "text-yellow-400" };
  if (pts >= 100) return { label: "Légendaire", emoji: "⚡", color: "text-purple-400" };
  return                  { label: "Débutant",  emoji: "🌱", color: "text-slate-400" };
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [global,    setGlobal]    = useState([]);
  const [byGame,    setByGame]    = useState([]);
  const [games,     setGames]     = useState([]);
  const [tab,       setTab]       = useState("global");
  const [gameId,    setGameId]    = useState("");
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getLeaderboardApi(), listGamesApi()])
      .then(([lRes, gRes]) => {
        setGlobal(lRes.data?.leaderboard || lRes.data || []);
        setGames(gRes.data?.games || gRes.data || []);
      })
      .catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== "game" || !gameId) return;
    setLoading(true);
    getGameLeaderboard(gameId)
      .then((res) => setByGame(res.data?.leaderboard || res.data || []))
      .catch(() => toast.error("Erreur"))
      .finally(() => setLoading(false));
  }, [gameId, tab]);

  const list = tab === "global" ? global.filter((p) => p.points > 0) : byGame.filter((p) => p.points > 0);

  return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden p-8"
          style={{ background: "linear-gradient(135deg,#1e1040 0%,#0F172A 60%,#0c1a2e 100%)" }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 50%,#06B6D4 0%,transparent 60%)" }} />
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "Poppins,sans-serif" }}>📊 Classement</h1>
            <p className="text-slate-400 text-sm">Les meilleurs joueurs de JGAME</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2">
          {["global", "game"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                tab === t ? "border-purple-500/50 bg-purple-500/20 text-purple-300" : "border-slate-700 text-slate-400 hover:text-white"
              }`}>
              {t === "global" ? "🌍 Général" : "🎮 Par jeu"}
            </button>
          ))}
        </div>

        {/* Sélecteur de jeu */}
        {tab === "game" && (
          <select value={gameId} onChange={(e) => setGameId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
            <option value="">-- Choisir un jeu --</option>
            {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}

        {/* Liste */}
        <Card>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map((i) => <div key={i} className="h-14 bg-slate-700/30 rounded-xl animate-pulse" />)}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🌱</div>
              <p className="text-white font-semibold mb-1">Aucun joueur classé</p>
              <p className="text-slate-400 text-sm">{tab === "game" && !gameId ? "Sélectionne un jeu" : "Participe à un tournoi pour apparaître ici !"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((player, index) => {
                const level  = getLevel(player.points);
                const medals = ["🥇","🥈","🥉"];
                const medal  = medals[index];
                return (
                  <motion.div key={player.user_id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-700/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/profile/${player.user_id}`)}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      index === 0 ? "bg-yellow-500 text-black" : index === 1 ? "bg-slate-400 text-black" : index === 2 ? "bg-amber-700 text-white" : "bg-slate-700 text-slate-300"
                    }`}>
                      {medal || index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {player.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate group-hover:text-purple-300 transition-colors">{player.username}</p>
                      <p className={`text-xs flex items-center gap-1 ${level.color}`}>
                        {level.emoji} {level.label}
                        {(player.wins != null) && <span className="text-slate-500 ml-1">· {player.wins}V / {player.losses || 0}D</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-purple-400 font-bold">{player.points} pts</p>
                      {(player.wins != null) && <p className="text-xs text-slate-500">{(player.wins || 0) + (player.losses || 0)} matchs</p>}
                    </div>
                    <span className="text-slate-600 group-hover:text-slate-400">›</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}