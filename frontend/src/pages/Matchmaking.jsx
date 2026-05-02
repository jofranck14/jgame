import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import Card from "../components/ui/Card";
import { useAuthStore } from "../features/auth/authStore";
import { listGamesApi, findPlayersApi } from "../features/tournaments/tournamentApi";

const LEVEL_META = {
  beginner:  { label: "Débutant",   icon: "🌱", color: "text-slate-400",  badge: "bg-slate-500/20 border-slate-500/30" },
  legendary: { label: "Légendaire", icon: "⭐", color: "text-yellow-400", badge: "bg-yellow-500/20 border-yellow-500/30" },
  goat:      { label: "GOAT",       icon: "👑", color: "text-purple-400", badge: "bg-purple-500/20 border-purple-500/30" },
};
const getLevelKey = (pts) => pts >= 200 ? "goat" : pts >= 100 ? "legendary" : "beginner";

const CITIES = ["Douala","Yaoundé","Bafoussam","Bamenda","Garoua","Maroua","Ngaoundéré","Bertoua","Ebolowa","Kribi"];

const iStyle = "w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors text-sm";

export default function Matchmaking() {
  const navigate       = useNavigate();
  const { user: me }   = useAuthStore();

  const [games, setGames]       = useState([]);
  const [players, setPlayers]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);

  const [filterGame,  setFilterGame]  = useState("");
  const [filterCity,  setFilterCity]  = useState(me?.city || "");
  const [filterLevel, setFilterLevel] = useState("");

  useEffect(() => {
    listGamesApi()
      .then((r) => setGames(r.data?.games || r.data || []))
      .catch(() => {});
  }, []);

  const search = async () => {
    setLoading(true);
    setSearched(true);
    try {
      // Construire les params — GET /api/v1/users?game_id=&city=&level=
      const params = {};
      if (filterGame)  params.game_id = filterGame;
      if (filterCity)  params.city    = filterCity;
      if (filterLevel) params.level   = filterLevel;

      const res = await findPlayersApi(params);
      // La route retourne { users: [...] }
      const data = res.data?.users || res.data?.players || res.data || [];
      setPlayers(Array.isArray(data) ? data.filter((p) => String(p.id) !== String(me?.id)) : []);
    } catch (err) {
      console.error("Matchmaking error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Erreur de recherche");
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden p-8"
          style={{ background: "linear-gradient(135deg,#0c1a2e 0%,#0F172A 60%,#1e1040 100%)" }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 70% 50%,#06B6D4 0%,transparent 50%)" }} />
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1" style={{ fontFamily: "Poppins,sans-serif" }}>
              📍 Matchmaking
            </h1>
            <p className="text-slate-400 text-sm">Trouve des adversaires près de toi</p>
          </div>
        </motion.div>

        {/* Filtres */}
        <Card>
          <h2 className="text-white font-semibold mb-4">🔍 Critères de recherche</h2>
          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Jeu</label>
              <select value={filterGame} onChange={(e) => setFilterGame(e.target.value)} className={iStyle}>
                <option value="">Tous les jeux</option>
                {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Ville / Zone</label>
              <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className={iStyle}>
                <option value="">Toutes les villes</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Niveau</label>
              <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className={iStyle}>
                <option value="">Tous les niveaux</option>
                <option value="beginner">🌱 Débutant (0–99 pts)</option>
                <option value="legendary">⭐ Légendaire (100–199 pts)</option>
                <option value="goat">👑 GOAT (200+ pts)</option>
              </select>
            </div>
            <button onClick={search} disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
              {loading ? "Recherche en cours..." : "🔍 Rechercher des joueurs"}
            </button>
          </div>
        </Card>

        {/* Résultats */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="h-20 rounded-2xl bg-slate-800/50 animate-pulse" />)}
          </div>
        ) : searched && players.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-white font-semibold mb-1">Aucun joueur trouvé</p>
            <p className="text-slate-500 text-sm">Essaie d'autres critères</p>
          </Card>
        ) : players.length > 0 ? (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">
              {players.length} joueur{players.length > 1 ? "s" : ""} trouvé{players.length > 1 ? "s" : ""}
            </p>
            {players.map((p, i) => {
              const levelKey = getLevelKey(p.points || 0);
              const meta     = LEVEL_META[levelKey];
              return (
                <motion.div key={p.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
                      {p.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-white font-semibold">{p.username}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.badge} ${meta.color}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs">
                        {p.city ? `📍 ${p.city}` : ""}
                        {p.points ? ` · ${p.points} pts` : ""}
                        {p.games?.length ? ` · 🎮 ${p.games.join(", ")}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => navigate(`/profile/${p.id}`)}
                        className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:border-purple-500 hover:text-purple-300 transition-all text-xs font-medium">
                        Profil
                      </button>
                      <button onClick={() => navigate(`/chat/${p.id}`)}
                        className="px-3 py-1.5 rounded-xl text-white text-xs font-medium"
                        style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
                        💬 Défier
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}