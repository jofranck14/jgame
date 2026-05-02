import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import Card from "../components/ui/Card";
import { useAuthStore } from "../features/auth/authStore";
import { listGamesApi, getUserGamesApi, addUserGameApi, removeUserGameApi } from "../features/tournaments/tournamentApi";

export default function GamesPage() {
  const navigate       = useNavigate();
  const { user: me }   = useAuthStore();

  const [games, setGames]       = useState([]);
  const [myGames, setMyGames]   = useState([]); // game_id sélectionnés
  const [loading, setLoading]   = useState(true);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [gRes, ugRes] = await Promise.all([
          listGamesApi(),
          getUserGamesApi(me.id).catch(() => ({ data: { games: [] } })),
        ]);
        setGames(gRes.data?.games || gRes.data || []);
        const userGames = ugRes.data?.games || ugRes.data || [];
        setMyGames(userGames.map((g) => g.game_id || g.id));
      } catch {
        toast.error("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [me.id]);

  const toggleGame = async (gameId) => {
    if (toggling) return;
    setToggling(gameId);
    const selected = myGames.includes(gameId);
    try {
      if (selected) {
        await removeUserGameApi(me.id, gameId);   // ← me.id, gameId
        setMyGames((prev) => prev.filter((id) => id !== gameId));
        toast.success("Jeu retiré de ta liste");
      } else {
        await addUserGameApi(me.id, gameId);       // ← me.id, gameId
        setMyGames((prev) => [...prev, gameId]);
        toast.success("Jeu ajouté !");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden p-8"
          style={{ background: "linear-gradient(135deg,#1e1040 0%,#0F172A 60%,#0c1a2e 100%)" }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 60% 50%,#06B6D4 0%,transparent 50%)" }} />
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1" style={{ fontFamily: "Poppins,sans-serif" }}>
              🎮 Jeux
            </h1>
            <p className="text-slate-400 text-sm">
              Choisis tes jeux pour apparaître dans le matchmaking
            </p>
          </div>
        </motion.div>

        {/* Mes jeux sélectionnés */}
        {myGames.length > 0 && (
          <div>
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              ✅ Mes jeux
              <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
                {myGames.length}
              </span>
            </h2>
            <div className="flex gap-2 flex-wrap">
              {games.filter((g) => myGames.includes(g.id)).map((g) => (
                <div key={g.id}
                  className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-3 py-1.5">
                  <span className="text-base">🎮</span>
                  <span className="text-purple-300 text-sm font-medium">{g.name}</span>
                  <button onClick={() => toggleGame(g.id)}
                    className="text-purple-400 hover:text-red-400 transition-colors text-xs ml-1">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grille de tous les jeux */}
        <div>
          <h2 className="text-white font-semibold mb-3">Tous les jeux disponibles</h2>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : games.length === 0 ? (
            <Card className="text-center py-12">
              <div className="text-4xl mb-3">🎮</div>
              <p className="text-slate-400">Aucun jeu disponible</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {games.map((game) => {
                const selected   = myGames.includes(game.id);
                const isToggling = toggling === game.id;
                return (
                  <motion.div key={game.id} whileHover={{ scale: 1.03 }} className="relative">
                    <div
                      onClick={() => navigate(`/games/${game.id}`)}
                      className="rounded-2xl p-4 cursor-pointer border transition-all"
                      style={{
                        background: selected
                          ? "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(6,182,212,0.1))"
                          : "linear-gradient(135deg,#1e1040,#0c1a2e)",
                        borderColor: selected ? "rgba(124,58,237,0.5)" : "rgba(51,65,85,0.5)",
                      }}>
                      {/* Icône manette uniforme */}
                      <div className="flex justify-center mb-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                          style={{
                            background: selected
                              ? "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(6,182,212,0.2))"
                              : "rgba(30,16,64,0.8)",
                            border: selected ? "1.5px solid rgba(124,58,237,0.5)" : "1px solid rgba(51,65,85,0.6)",
                          }}>
                          🎮
                        </div>
                      </div>
                      <p className="text-white text-sm font-semibold text-center line-clamp-2 leading-tight mb-2">
                        {game.name}
                      </p>
                      {selected && (
                        <div className="text-center text-xs text-purple-400 font-medium">✅ Sélectionné</div>
                      )}
                    </div>

                    {/* Bouton toggle flottant */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleGame(game.id); }}
                      disabled={isToggling}
                      className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                        selected
                          ? "bg-purple-600 border-purple-500 text-white hover:bg-red-500 hover:border-red-400"
                          : "bg-slate-800 border-slate-600 text-slate-400 hover:bg-purple-600 hover:border-purple-500 hover:text-white"
                      }`}>
                      {isToggling ? "…" : selected ? "✓" : "+"}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA matchmaking */}
        {myGames.length > 0 && (
          <Card className="text-center py-6">
            <div className="text-3xl mb-2">📍</div>
            <p className="text-white font-semibold mb-1">Prêt à trouver des adversaires ?</p>
            <p className="text-slate-400 text-sm mb-4">
              {myGames.length} jeu{myGames.length > 1 ? "x" : ""} sélectionné{myGames.length > 1 ? "s" : ""}
            </p>
            <button onClick={() => navigate("/matchmaking")}
              className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
              🔍 Trouver des joueurs
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}