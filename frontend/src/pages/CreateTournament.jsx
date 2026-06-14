import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuthStore } from "../features/auth/authStore";
import { createTournamentApi, listGamesApi } from "../features/tournaments/tournamentApi";

const CAMEROON_CITIES = [
  "Douala","Yaoundé","Bafoussam","Bamenda","Garoua",
  "Maroua","Ngaoundéré","Bertoua","Ebolowa","Kribi",
  "Limbe","Buea","Kumba","Foumban","Dschang",
  "Édéa","Nkongsamba","Loum","Mbalmayo","Sangmélima",
];

const schema = z.object({
  title:       z.string().min(3, "Minimum 3 caractères"),
  game_id:     z.string().min(1, "Choisis un jeu"),
  price:       z.string().min(1, "Prix requis"),
  max_players: z.string().min(1, "Nombre de joueurs requis"),
  date:        z.string().min(1, "Date requise"),
  type:        z.enum(["online", "physical"]),
  city:        z.string().optional(),
  location_details: z.string().optional(),
});

const sStyle = "w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors text-sm";

export default function CreateTournament() {
  const navigate      = useNavigate();
  const { user }      = useAuthStore();
  const [games, setGames] = useState([]);

  useEffect(() => {
    if (user && !["organizer", "admin"].includes(user.role)) {
      toast.error("Accès réservé aux organisateurs");
      navigate("/");
    }
  }, [user]);

  useEffect(() => {
    listGamesApi()
      .then((res) => setGames(res.data?.games || res.data || []))
      .catch(() => toast.error("Impossible de charger les jeux"));
  }, []);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { type: "physical", price: "0" },
  });

  const type = watch("type");

  const onSubmit = async (data) => {
    try {
      // Construire la description du lieu
      let locationDesc = null;
      if (data.type === "physical") {
        const parts = [];
        if (data.city)             parts.push(data.city);
        if (data.location_details) parts.push(data.location_details);
        locationDesc = parts.join(" — ") || null;
      }

      const payload = {
        title:            data.title,
        game_id:          Number(data.game_id),
        price:            Number(data.price),
        max_players:      Number(data.max_players),
        date:             data.date,
        type:             data.type,
        city:             data.type === "physical" ? (data.city || null) : null,
        location_details: locationDesc,
      };
      const res        = await createTournamentApi(payload);
      const tournament = res.data?.tournament;
      toast.success("Tournoi créé avec succès 🏆");
      navigate(`/tournaments/${tournament.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la création");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden p-8"
          style={{ background: "linear-gradient(135deg,#1e1040 0%,#0F172A 60%,#0c1a2e 100%)" }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 80% 50%,#7C3AED 0%,transparent 60%)" }} />
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: "Poppins,sans-serif" }}>
              🏆 Créer un tournoi
            </h1>
            <p className="text-slate-400">Configure ton tournoi et attire les meilleurs joueurs</p>
          </div>
        </motion.div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Titre */}
            <Input {...register("title")} label="Nom du tournoi"
              placeholder="Ex: Tournoi Free Fire Yaoundé #1" error={errors.title?.message} />

            {/* Jeu */}
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Jeu</label>
              <select {...register("game_id")} className={sStyle}>
                <option value="">-- Choisir un jeu --</option>
                {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              {errors.game_id && <p className="text-red-400 text-xs mt-1">{errors.game_id.message}</p>}
            </div>

            {/* Type */}
                       
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Type de tournoi</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "online",   label: "🌐 En ligne",   desc: "Joueurs partout au Cameroun" },
                  { value: "physical", label: "📍 Présentiel", desc: "Lieu physique défini" },
                ]
                  .filter((opt) => user?.role === "admin" || opt.value === "physical")
                  .map((opt) => (
                    <label key={opt.value}
                      className={`cursor-pointer rounded-xl p-4 border transition-all ${
                        type === opt.value
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
                      }`}>
                      <input {...register("type")} type="radio" value={opt.value} className="sr-only" />
                      <p className="text-white font-medium text-sm">{opt.label}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{opt.desc}</p>
                    </label>
                  ))
                }
              </div>
            </div>

            {/* Ville + Lieu (si physique) */}
            {type === "physical" && (
              <div className="space-y-3 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                <p className="text-purple-300 text-xs font-medium">📍 Informations du lieu physique</p>

                {/* Select ville */}
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Ville</label>
                  <select {...register("city")} className={sStyle}>
                    <option value="">-- Sélectionne une ville --</option>
                    {CAMEROON_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.city && <p className="text-red-400 text-xs mt-1">{errors.city.message}</p>}
                </div>

                {/* Champ lieu exact */}
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">
                    Adresse / Lieu exact <span className="text-slate-600">(optionnel)</span>
                  </label>
                  <input
                    {...register("location_details")}
                    placeholder="Ex: Cyber Game Center, Rue de la Joie, Akwa · Douala"
                    className={sStyle}
                  />
                  <p className="text-slate-600 text-xs mt-1">
                    Précise l'adresse, le quartier ou le nom du lieu pour que les joueurs puissent te trouver facilement.
                  </p>
                  {errors.location_details && <p className="text-red-400 text-xs mt-1">{errors.location_details.message}</p>}
                </div>
              </div>
            )}

            {/* Prix et joueurs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Prix d'entrée (FCFA)</label>
                <input {...register("price")} type="number" min="0" placeholder="0 = Gratuit"
                  className={sStyle} />
                {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price.message}</p>}
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Joueurs max</label>
                <input {...register("max_players")} type="number" min="2" placeholder="Ex: 50"
                  className={sStyle} />
                {errors.max_players && <p className="text-red-400 text-xs mt-1">{errors.max_players.message}</p>}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Date et heure</label>
              <input {...register("date")} type="datetime-local"
                className={sStyle} style={{ colorScheme: "dark" }} />
              {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date.message}</p>}
            </div>

            {/* Aperçu récompenses */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.5)" }}>
              <p className="text-white font-medium text-sm">📊 Répartition des récompenses</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { rank: "🥇 1er",  pts: "+20 pts", pct: "40% du pool" },
                  { rank: "🥈 2ème", pts: "+10 pts", pct: "20% du pool" },
                  { rank: "🥉 3ème", pts: "+5 pts",  pct: "10% du pool" },
                ].map((r) => (
                  <div key={r.rank} className="bg-slate-800/50 rounded-lg p-2">
                    <p className="text-white text-xs font-medium">{r.rank}</p>
                    <p className="text-purple-400 text-xs">{r.pts}</p>
                    <p className="text-slate-500 text-xs">{r.pct}</p>
                  </div>
                ))}
              </div>
              <p className="text-slate-600 text-xs text-center pt-1">
                20% organisateur · 10% JGAME
              </p>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Création..." : "🏆 Créer le tournoi"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}