import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import { useAuthStore } from "../features/auth/authStore";
import { getMeApi } from "../features/auth/authApi";
import {
  getReviewsApi, createReviewApi, createReportApi,
  getUserGamesApi, addUserGameApi, removeUserGameApi, listGamesApi,
} from "../features/tournaments/tournamentApi";
import api from "../services/api";
import { formatDate } from "../utils/formatDate";

const LEVEL_META = {
  beginner:  { label: "Débutant",   icon: "🌱", color: "text-slate-400",  badge: "bg-slate-500/20 border-slate-500/30"  },
  legendary: { label: "Légendaire", icon: "⭐", color: "text-yellow-400", badge: "bg-yellow-500/20 border-yellow-500/30" },
  goat:      { label: "GOAT",       icon: "👑", color: "text-purple-400", badge: "bg-purple-500/20 border-purple-500/30" },
};
const getLevelKey = (pts) => pts >= 200 ? "goat" : pts >= 100 ? "legendary" : "beginner";
const CITIES = ["Douala","Yaoundé","Bafoussam","Bamenda","Garoua","Maroua","Ngaoundéré","Bertoua","Ebolowa","Kribi"];
const iStyle = "w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors text-sm";

export default function Profile() {
  const { id }                     = useParams();
  const navigate                   = useNavigate();
  const { user: me, updateUser }   = useAuthStore();
  const fileRef                    = useRef();

  const [profile, setProfile]      = useState(null);
  const [userGames, setUserGames]  = useState([]);
  const [allGames, setAllGames]    = useState([]);
  const [reviews, setReviews]      = useState([]);
  const [loading, setLoading]      = useState(true);
  const [tab, setTab]              = useState("stats");

  const [editModal, setEditModal]      = useState(false);
  const [reviewModal, setReviewModal]  = useState(false);
  const [reportModal, setReportModal]  = useState(false);
  const [gamesModal, setGamesModal]    = useState(false);

  const [editForm, setEditForm]    = useState({ username: "", city: "", bio: "" });
  const [saving, setSaving]        = useState(false);
  const [avatarFile, setAvatarFile]   = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [rating, setRating]        = useState(5);
  const [comment, setComment]      = useState("");
  const [reportReason, setReportReason] = useState("");
  const [toggling, setToggling]    = useState(null);

  const isMe = String(me?.id) === String(id);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let profileData;
        if (isMe) {
          const r = await getMeApi();
          profileData = r.data?.user || r.data;
        } else {
          const r = await api.get(`/users/${id}`);
          profileData = r.data?.user || r.data;
        }
        setProfile(profileData);
        setEditForm({
          username: profileData.username || "",
          city:     profileData.city     || "",
          bio:      profileData.bio      || "",
        });

        const [ugRes, revRes, gRes] = await Promise.all([
          getUserGamesApi(id).catch(() => ({ data: { games: [] } })),
          getReviewsApi(id).catch(() => ({ data: { reviews: [] } })),
          listGamesApi().catch(() => ({ data: { games: [] } })),
        ]);
        setUserGames(ugRes.data?.games  || ugRes.data  || []);
        setReviews(revRes.data?.reviews || revRes.data || []);
        setAllGames(gRes.data?.games    || gRes.data   || []);
      } catch {
        toast.error("Profil introuvable");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("username", editForm.username);
      formData.append("city",     editForm.city);
      formData.append("bio",      editForm.bio);
      if (avatarFile) formData.append("avatar", avatarFile);

      const res = await api.patch("/users/me", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updated = res.data?.user || res.data;
      // Merge immédiat pour que bio/city/avatar s'affichent sans rechargement
      setProfile((p) => ({ ...p, ...editForm, ...(updated || {}) }));
      updateUser({ ...editForm, ...(updated || {}) });
      toast.success("Profil mis à jour ✅");
      setEditModal(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const toggleGame = async (gameId) => {
    if (toggling) return;
    setToggling(gameId);
    const myIds    = userGames.map((g) => g.game_id || g.id);
    const selected = myIds.includes(gameId);
    try {
      if (selected) {
        await removeUserGameApi(me.id, gameId);   // ← me.id
        setUserGames((prev) => prev.filter((g) => (g.game_id || g.id) !== gameId));
        toast.success("Jeu retiré");
      } else {
        await addUserGameApi(me.id, gameId);       // ← me.id
        const found = allGames.find((g) => g.id === gameId);
        setUserGames((prev) => [...prev, { game_id: gameId, id: gameId, name: found?.name }]);
        toast.success("Jeu ajouté !");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setToggling(null);
    }
  };

  const submitReview = async () => {
    if (!comment.trim()) return toast.error("Ajoute un commentaire");
    try {
      await createReviewApi({ organizer_id: Number(id), rating, comment });
      toast.success("Avis envoyé ⭐");
      const r = await getReviewsApi(id);
      setReviews(r.data?.reviews || r.data || []);
      setReviewModal(false); setComment(""); setRating(5);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur");
    }
  };

  const submitReport = async () => {
    if (!reportReason.trim()) return toast.error("Sélectionne une raison");
    try {
      await createReportApi({ reported_user_id: Number(id), reason: reportReason });
      toast.success("Signalement envoyé 🚨");
      setReportModal(false); setReportReason("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur");
    }
  };

  if (loading) return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-56 rounded-3xl bg-slate-800/50 animate-pulse" />
        <div className="h-28 rounded-2xl bg-slate-800/50 animate-pulse" />
        <div className="h-40 rounded-2xl bg-slate-800/50 animate-pulse" />
      </div>
    </div>
  );
  if (!profile) return null;

  const points   = profile.points || 0;
  const levelKey = getLevelKey(points);
  const level    = LEVEL_META[levelKey];
  const nextPts  = points < 100 ? 100 : points < 200 ? 200 : null;
  const progress = nextPts ? Math.min((points / nextPts) * 100, 100) : 100;
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;
  const myGameIds = userGames.map((g) => g.game_id || g.id);

  return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── Hero ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden p-6 md:p-8"
          style={{ background: "linear-gradient(135deg,#1e1040 0%,#0F172A 60%,#0c1a2e 100%)" }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%,#7C3AED 0%,transparent 50%)" }} />

          <div className="relative z-10 flex items-start gap-5 flex-wrap">
            {/* Avatar */}
            <div className="relative flex-shrink-0"
              style={{ cursor: isMe ? "pointer" : "default" }}
              onClick={isMe ? () => setEditModal(true) : undefined}>
              {profile.avatar
                ? <img src={profile.avatar} alt="avatar"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500/40" />
                : <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
                    {profile.username?.[0]?.toUpperCase()}
                  </div>
              }
              {isMe && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs border-2 border-slate-900">
                  ✏️
                </div>
              )}
            </div>

            {/* Infos */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Poppins,sans-serif" }}>
                  {profile.username}
                </h1>
                <span className={`text-xs px-2 py-1 rounded-full border ${level.badge} ${level.color}`}>
                  {level.icon} {level.label}
                </span>
                {profile.role === "organizer" && (
                  <span className="text-xs px-2 py-1 rounded-full border bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    🎖️ Organisateur
                  </span>
                )}
                {profile.role === "admin" && (
                  <span className="text-xs px-2 py-1 rounded-full border bg-red-500/20 text-red-400 border-red-500/30">
                    ⚙️ Admin
                  </span>
                )}
              </div>

              <p className="text-slate-400 text-sm mb-1">
                {profile.city ? `📍 ${profile.city}` : "📍 Localisation non précisée"}
                {" · "}Membre depuis {formatDate(profile.created_at)}
              </p>

              {profile.bio && (
                <p className="text-slate-300 text-sm italic mb-2">"{profile.bio}"</p>
              )}
              {avgRating && (
                <p className="text-yellow-400 text-sm mb-2">⭐ {avgRating}/5 · {reviews.length} avis</p>
              )}

              {/* Barre XP */}
              <div className="mt-3 max-w-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-400">{points} pts</span>
                  <span className="text-xs text-slate-500">
                    {nextPts ? `→ ${nextPts} pts (${nextPts === 100 ? "Légendaire ⭐" : "GOAT 👑"})` : "👑 MAX"}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: "#1E293B" }}>
                  <div className="h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${progress}%`, background: "linear-gradient(90deg,#7C3AED,#06B6D4)" }} />
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-3xl font-bold text-purple-400">{points}</p>
              <p className="text-slate-400 text-xs">points</p>
            </div>
          </div>

          {/* Actions */}
          <div className="relative z-10 flex gap-2 mt-5 flex-wrap">
            {isMe ? (
              <>
                <button onClick={() => setEditModal(true)}
                  className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300 hover:border-purple-500 hover:text-purple-300 transition-all text-sm font-medium">
                  ✏️ Modifier profil
                </button>
                <button onClick={() => setGamesModal(true)}
                  className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300 hover:border-cyan-500 hover:text-cyan-300 transition-all text-sm font-medium">
                  🎮 Gérer mes jeux
                </button>
                <button onClick={() => navigate("/matchmaking")}
                  className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                  style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
                  📍 Matchmaking
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate(`/chat/${profile.id}`)}
                  className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                  style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
                  💬 Défier
                </button>
                {profile.role === "organizer" && (
                  <button onClick={() => setReviewModal(true)}
                    className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300 hover:border-yellow-500 hover:text-yellow-300 transition-all text-sm font-medium">
                    ⭐ Laisser un avis
                  </button>
                )}
                <button onClick={() => setReportModal(true)}
                  className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium">
                  🚨 Signaler
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { emoji: "⭐", label: "Points",  value: points },
            { emoji: "🎮", label: "Jeux",    value: userGames.length },
            { emoji: "📝", label: "Avis",    value: reviews.length },
            { emoji: "🏅", label: "Rôle",    value: profile.role || "player" },
          ].map((s) => (
            <Card key={s.label} className="text-center py-4">
              <div className="text-2xl mb-1">{s.emoji}</div>
              <p className="text-white font-bold capitalize">{s.value}</p>
              <p className="text-slate-400 text-xs">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2 border-b border-slate-700/50">
          {[
            { key: "stats",   label: "📊 Infos" },
            { key: "games",   label: `🎮 Jeux (${userGames.length})` },
            { key: "reviews", label: `⭐ Avis (${reviews.length})` },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all ${
                tab === t.key
                  ? "bg-slate-800 text-white border border-slate-700 border-b-slate-800 -mb-px"
                  : "text-slate-400 hover:text-white"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Infos ── */}
        {tab === "stats" && (
          <Card>
            <h2 className="text-white font-semibold mb-4">Informations</h2>
            <div className="space-y-0">
              {[
                { label: "Pseudo",       value: profile.username,                        emoji: "🎮" },
                { label: "Ville",        value: profile.city  || "Non précisé",           emoji: "📍" },
                { label: "Bio",          value: profile.bio   || "Aucune bio renseignée", emoji: "💬" },
                { label: "Téléphone",    value: isMe ? (profile.phone || "—") : "Masqué", emoji: "📞" },
                { label: "Email",        value: isMe ? (profile.email || "—") : "Masqué", emoji: "📧" },
                { label: "Niveau",       value: `${level.icon} ${level.label}`,            emoji: "🏅" },
                { label: "Membre depuis",value: formatDate(profile.created_at),            emoji: "📅" },
              ].map((info) => (
                <div key={info.label}
                  className="flex items-start gap-3 py-3 border-b border-slate-700/40 last:border-0">
                  <span className="text-xl mt-0.5 flex-shrink-0">{info.emoji}</span>
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">{info.label}</p>
                    <p className="text-white text-sm">{info.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Tab: Jeux ── */}
        {tab === "games" && (
          <Card>
            {userGames.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-5xl mb-3">🎮</div>
                <p className="text-slate-400 mb-4">
                  {isMe ? "Tu n'as pas encore choisi de jeux" : "Ce joueur n'a pas encore de jeux"}
                </p>
                {isMe && (
                  <button onClick={() => setGamesModal(true)}
                    className="px-5 py-2 rounded-xl text-white text-sm font-medium"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
                    + Ajouter des jeux
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {userGames.map((g) => (
                  <div key={g.id || g.game_id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/games/${g.game_id || g.id}`)}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border border-slate-700 flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(6,182,212,0.1))" }}>
                      🎮
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{g.name}</p>
                      <p className="text-slate-400 text-xs capitalize">{g.level || "beginner"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-purple-400 font-bold text-sm">{g.points || 0} pts</p>
                      <p className="text-slate-500 text-xs">{g.wins || 0}V {g.losses || 0}D</p>
                    </div>
                  </div>
                ))}
                {isMe && (
                  <button onClick={() => setGamesModal(true)}
                    className="w-full mt-1 py-2 rounded-xl border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-purple-500 transition-all text-sm">
                    + Gérer mes jeux
                  </button>
                )}
              </div>
            )}
          </Card>
        )}

        {/* ── Tab: Avis ── */}
        {tab === "reviews" && (
          <Card>
            {reviews.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">⭐</div>
                <p className="text-slate-400">Aucun avis pour l'instant</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="pb-4 border-b border-slate-700/40 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {r.username?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{r.username || "Joueur"}</p>
                        <p className="text-yellow-400 text-xs">{"⭐".repeat(Math.min(r.rating || 0, 5))}</p>
                      </div>
                    </div>
                    {r.comment && <p className="text-slate-400 text-sm ml-10">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ══════ MODAL: Modifier profil ══════ */}
      <Modal isOpen={editModal} onClose={() => { setEditModal(false); setAvatarPreview(null); setAvatarFile(null); }} title="✏️ Modifier mon profil">
        <div className="space-y-4">
          {/* Avatar picker */}
          <div onClick={() => fileRef.current?.click()}
            className="flex items-center gap-4 p-3 rounded-xl border border-slate-700 cursor-pointer hover:border-purple-500 transition-all">
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-xl font-bold"
              style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                : profile.avatar
                  ? <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                  : profile.username?.[0]?.toUpperCase()
              }
            </div>
            <div>
              <p className="text-white text-sm font-medium">Changer l'avatar</p>
              <p className="text-slate-500 text-xs">JPG, PNG · max 5MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }
              }} />
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Pseudo</label>
            <input value={editForm.username}
              onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
              className={iStyle} placeholder="Ton pseudo" />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Ville</label>
            <select value={editForm.city}
              onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
              className={iStyle}>
              <option value="">Sélectionne ta ville</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Bio (optionnel)</label>
            <textarea value={editForm.bio}
              onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Quelques mots sur toi..." rows={3}
              className={iStyle + " resize-none"} />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => { setEditModal(false); setAvatarPreview(null); setAvatarFile(null); }}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition-colors text-sm">
              Annuler
            </button>
            <button onClick={saveProfile} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ══════ MODAL: Gérer mes jeux ══════ */}
      <Modal isOpen={gamesModal} onClose={() => setGamesModal(false)} title="🎮 Gérer mes jeux">
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {allGames.length === 0 ? (
            <p className="text-slate-400 text-center py-6">Aucun jeu disponible</p>
          ) : allGames.map((game) => {
            const selected   = myGameIds.includes(game.id);
            const isToggling = toggling === game.id;
            return (
              <div key={game.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  selected ? "border-purple-500/40 bg-purple-500/10" : "border-slate-700/50 hover:border-slate-600"
                }`}>
                <span className="text-2xl flex-shrink-0">🎮</span>
                <p className="text-white text-sm font-medium flex-1">{game.name}</p>
                <button
                  onClick={() => toggleGame(game.id)}
                  disabled={isToggling}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50 ${
                    selected
                      ? "border-red-500/50 text-red-400 hover:bg-red-500/10"
                      : "border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                  }`}>
                  {isToggling ? "..." : selected ? "✕ Retirer" : "+ Ajouter"}
                </button>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* ══════ MODAL: Avis ══════ */}
      <Modal isOpen={reviewModal} onClose={() => setReviewModal(false)} title="⭐ Laisser un avis">
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">
            Noter <span className="text-white font-medium">{profile.username}</span>
          </p>
          <div>
            <label className="text-slate-400 text-xs mb-2 block">Note</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map((star) => (
                <button key={star} onClick={() => setRating(star)}
                  className={`text-2xl transition-transform hover:scale-110 ${star <= rating ? "opacity-100" : "opacity-30"}`}>
                  ⭐
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Commentaire</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Ton retour d'expérience..." rows={3} className={iStyle + " resize-none"} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setReviewModal(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm">Annuler</button>
            <button onClick={submitReview}
              className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>Envoyer</button>
          </div>
        </div>
      </Modal>

      {/* ══════ MODAL: Signalement ══════ */}
      <Modal isOpen={reportModal} onClose={() => setReportModal(false)} title="🚨 Signaler ce joueur">
        <div className="space-y-3">
          <p className="text-slate-400 text-sm">
            Signaler <span className="text-white font-medium">{profile.username}</span>
          </p>
          {["Triche / comportement frauduleux","Résultats falsifiés","Comportement abusif","Arnaque / paiement frauduleux","Autre"].map((r) => (
            <button key={r} onClick={() => setReportReason(r)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                reportReason === r
                  ? "border-red-500/50 bg-red-500/10 text-red-300"
                  : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
              }`}>
              {r}
            </button>
          ))}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setReportModal(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm">Annuler</button>
            <button onClick={submitReport}
              className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm bg-red-600 hover:bg-red-700 transition-colors">
              Signaler
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}