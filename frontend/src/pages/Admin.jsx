import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { useAuthStore } from "../features/auth/authStore";
import { getTournamentApi } from "../features/tournaments/tournamentApi";
import api from "../services/api";
import { formatDateTime } from "../utils/formatDate";

const iStyle = "w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors text-sm";

const STATUS_FR = {
  pending:   "En attente",
  ongoing:   "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

function StatusBadge({ status }) {
  const map = {
    pending:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
    ongoing:   "bg-green-500/20 text-green-400 border-green-500/30",
    completed: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${map[status] || map.pending}`}>
      {STATUS_FR[status] || status}
    </span>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = "Confirmer", danger = false }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition-colors text-sm">
            Annuler
          </button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm ${danger ? "bg-red-600 hover:bg-red-700" : ""}`}
            style={!danger ? { background: "linear-gradient(135deg,#7C3AED,#06B6D4)" } : {}}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [tab, setTab]         = useState("dashboard");
  const [loading, setLoading] = useState(true);

  const [payments, setPayments]       = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [reports, setReports]         = useState([]);
  const [users, setUsers]             = useState([]);
  const [games, setGames]             = useState([]);

  // Modals
  const [proofModal, setProofModal]       = useState(false);
  const [proofImage, setProofImage]       = useState(null);

  // Modal résultats — avec chargement des participants
  const [resultModal, setResultModal]     = useState(false);
  const [selectedT, setSelectedT]         = useState(null);
  const [participants, setParticipants]   = useState([]);
  const [loadingParts, setLoadingParts]   = useState(false);
  const [rankings, setRankings]           = useState([
    { user_id: "", rank: 1 },
    { user_id: "", rank: 2 },
    { user_id: "", rank: 3 },
  ]);

  const [userModal, setUserModal]         = useState(false);
  const [selectedUser, setSelectedUser]   = useState(null);

  const [gameModal, setGameModal]         = useState(false);
  const [gameForm, setGameForm]           = useState({ id: null, name: "" });

  const [announceModal, setAnnounceModal] = useState(false);
  const [announce, setAnnounce]           = useState({ title: "", message: "", target: "all" });
  const [announcing, setAnnouncing]       = useState(false);

  const [confirm, setConfirm]             = useState({ open: false, title: "", message: "", onConfirm: () => {}, danger: false });

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") { toast.error("Accès refusé"); navigate("/"); return; }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, tRes, rRes, uRes, gRes] = await Promise.all([
        api.get("/payments/admin").catch(() => ({ data: { payments: [] } })),
        api.get("/tournaments").catch(() => ({ data: { tournaments: [] } })),
        api.get("/reports").catch(() => ({ data: [] })),
        api.get("/users").catch(() => ({ data: { users: [] } })),
        api.get("/games").catch(() => ({ data: { games: [] } })),
      ]);
      setPayments(pRes.data?.payments || []);
      setTournaments(tRes.data?.tournaments || tRes.data?.data || []);
      const rawReports = rRes.data?.reports || rRes.data || [];
      setReports(Array.isArray(rawReports) ? rawReports : []);
      const rawUsers = uRes.data?.users || uRes.data?.data || uRes.data || [];
      setUsers(Array.isArray(rawUsers) ? rawUsers : []);
      setGames(gRes.data?.games || gRes.data || []);
    } catch { toast.error("Erreur de chargement"); }
    finally { setLoading(false); }
  };

  // ─── Paiements ───
const cancelPaymentVerification = async (id) => {
  try {
    await api.post(`/payments/${id}/cancel-verify`);
    toast.success("Validation annulée ↩️");
    fetchAll();
  } catch (e) {
    toast.error(e.response?.data?.message || "Erreur");
  }
};

const verifyPayment = async (id) => {
  try {
    await api.post(`/payments/${id}/verify`);
    toast.success("Paiement validé ✅");
    fetchAll();
  } catch (e) {
    toast.error(e.response?.data?.message || "Erreur");
  }
};

 const viewProof = (path) => {
  setProofImage(path);   // path EST déjà l'URL Cloudinary complète
  setProofModal(true);
};
  // ─── Résultats ───
  const openResultModal = async (t) => {
    setSelectedT(t);
    setRankings([{ user_id: "", rank: 1 }, { user_id: "", rank: 2 }, { user_id: "", rank: 3 }]);
    setParticipants([]);
    setResultModal(true);
    setLoadingParts(true);
    try {
      const res   = await getTournamentApi(t.id);
      const parts = res.data?.tournament?.participants || [];
      setParticipants(parts);
    } catch {
      toast.error("Impossible de charger les participants");
    } finally {
      setLoadingParts(false);
    }
  };

  const submitResults = async () => {
    const valid = rankings.filter((r) => r.user_id !== "");
    if (!valid.length) return toast.error("Sélectionne au moins 1 joueur");
    // Vérifier qu'il n'y a pas de doublons
    const ids = valid.map((r) => r.user_id);
    if (new Set(ids).size !== ids.length) {
      return toast.error("Un joueur ne peut pas être sélectionné deux fois !");
    }
    try {
      await api.post("/results", {
        tournament_id: selectedT.id,
        rankings: valid.map((r) => ({ user_id: Number(r.user_id), rank: r.rank })),
      });
      toast.success("Résultats enregistrés 🏆");
      setResultModal(false);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || "Erreur"); }
  };

  // ─── Tournois ───
  const forceTournamentStatus = async (id, status) => {
    try { await api.patch(`/tournaments/${id}`, { status }); toast.success(`Statut → ${STATUS_FR[status]}`); fetchAll(); }
    catch (e) { toast.error(e.response?.data?.message || "Erreur"); }
  };

  const confirmDeleteTournament = (t) => {
    setConfirm({
      open: true, danger: true,
      title: "Supprimer ce tournoi ?",
      message: `"${t.title}" et toutes ses données seront supprimés définitivement.`,
      onConfirm: async () => {
        try { await api.delete(`/tournaments/${t.id}`); toast.success("Tournoi supprimé"); fetchAll(); }
        catch (e) { toast.error(e.response?.data?.message || "Erreur"); }
      },
    });
  };

  // ─── Utilisateurs ───
  const openUserModal = (u) => { setSelectedUser(u); setUserModal(true); };

  const updateRole = async (role) => {
    try {
      await api.patch(`/users/${selectedUser.id}`, { role });
      toast.success(`Rôle → ${role}`);
      fetchAll(); setUserModal(false);
    } catch (e) { toast.error(e.response?.data?.message || "Erreur"); }
  };

  const toggleBan = () => {
    const isBanned = !!selectedUser?.is_banned;
    setConfirm({
      open: true, danger: !isBanned,
      title: isBanned ? "Débannir ?" : "Bannir cet utilisateur ?",
      message: `${selectedUser?.username} ${isBanned ? "pourra à nouveau se connecter." : "ne pourra plus se connecter."}`,
      onConfirm: async () => {
        try {
          await api.patch(`/users/${selectedUser.id}`, { is_banned: !isBanned });
          toast.success(isBanned ? "Débanni ✅" : "Banni 🚫");
          fetchAll(); setUserModal(false);
        } catch (e) { toast.error(e.response?.data?.message || "Erreur"); }
      },
    });
  };

  const confirmDeleteUser = () => {
    setConfirm({
      open: true, danger: true,
      title: "Supprimer définitivement ?",
      message: `Le compte de "${selectedUser?.username}" sera effacé. Irréversible.`,
      onConfirm: async () => {
        try { await api.delete(`/users/${selectedUser.id}`); toast.success("Supprimé"); fetchAll(); setUserModal(false); }
        catch (e) { toast.error(e.response?.data?.message || "Erreur"); }
      },
    });
  };

  // ─── Jeux ───
  const openGameModal = (game = null) => {
    setGameForm(game ? { id: game.id, name: game.name } : { id: null, name: "" });
    setGameModal(true);
  };

  const saveGame = async () => {
    if (!gameForm.name.trim()) return toast.error("Nom requis");
    try {
      if (gameForm.id) { await api.patch(`/games/${gameForm.id}`, { name: gameForm.name }); toast.success("Jeu modifié ✅"); }
      else             { await api.post("/games", { name: gameForm.name }); toast.success("Jeu ajouté 🎮"); }
      setGameModal(false); fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || "Erreur"); }
  };

  const confirmDeleteGame = (game) => {
    setConfirm({
      open: true, danger: true,
      title: `Supprimer "${game.name}" ?`,
      message: "Ce jeu et ses statistiques associées seront supprimés.",
      onConfirm: async () => {
        try { await api.delete(`/games/${game.id}`); toast.success("Jeu supprimé"); fetchAll(); }
        catch (e) { toast.error(e.response?.data?.message || "Erreur"); }
      },
    });
  };

  // ─── Annonces ───
  const sendAnnouncement = async () => {
    if (!announce.title.trim() || !announce.message.trim()) return toast.error("Titre et message requis");
    setAnnouncing(true);
    try {
      const res = await api.post("/notifications/announce", announce);
      toast.success(`📢 Annonce envoyée à ${res.data?.sent || "tous les"} utilisateurs !`);
      setAnnounce({ title: "", message: "", target: "all" });
    } catch (e) { toast.error(e.response?.data?.message || "Erreur"); }
    finally { setAnnouncing(false); }
  };

  // ─── Reports ───
  const resolveReport = async (id, status) => {
    try { await api.patch(`/reports/${id}`, { status }); toast.success(status === "resolved" ? "Résolu ✅" : "Rejeté"); fetchAll(); }
    catch { toast.error("Erreur"); }
  };

  // ─── Computed ───
  const pendingPayments = payments.filter((p) => !p.verified_by_admin && p.status !== "failed");
  const pendingReports  = reports.filter((r) => r.status === "pending");
  const totalRevenue    = payments.filter((p) => p.verified_by_admin).reduce((s, p) => s + Number(p.amount || 0), 0);

  const tabs = [
    { key: "dashboard",   label: "📊 Dashboard"    },
    { key: "payments",    label: "💳 Paiements",    badge: pendingPayments.length },
    { key: "tournaments", label: "🏆 Tournois"      },
    { key: "users",       label: "👥 Utilisateurs"  },
    { key: "games",       label: "🎮 Jeux"          },
    { key: "reports",     label: "🚨 Signalements",  badge: pendingReports.length },
    { key: "announce",    label: "📢 Annonces"      },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden p-8"
          style={{ background: "linear-gradient(135deg,#1e1040 0%,#0F172A 60%,#0c1a2e 100%)" }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 80% 50%,#7C3AED 0%,transparent 60%)" }} />
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1" style={{ fontFamily: "Poppins,sans-serif" }}>
              ⚙️ Panel Admin
            </h1>
            <p className="text-slate-400">Bienvenue {user?.username} — JGAME Control Center</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-700/50" style={{ scrollbarWidth: "none" }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all flex-shrink-0 ${
                tab === t.key ? "bg-slate-800 text-white border border-slate-700 border-b-slate-800 -mb-px" : "text-slate-400 hover:text-white"
              }`}>
              {t.label}
              {t.badge > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] inline-flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />)}</div>
        ) : (
                      <>
            {/* ══ DASHBOARD ══ */}
            {tab === "dashboard" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { emoji: "👥", label: "Utilisateurs",      value: users.length,                                                      color: "text-cyan-400"   },
                    { emoji: "🏆", label: "Tournois",          value: tournaments.length,                                                 color: "text-purple-400" },
                    { emoji: "⏳", label: "Paiements/attente", value: payments.filter((p) => p.proof_image && !p.verified_by_admin).length, color: "text-yellow-400" },
                    { emoji: "💰", label: "Revenus validés",   value: `${totalRevenue.toLocaleString()} F`,                              color: "text-green-400"  },
                  ].map((s) => (
                    <Card key={s.label} className="text-center">
                      <div className="text-3xl mb-2">{s.emoji}</div>
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-slate-400 text-xs mt-1">{s.label}</p>
                    </Card>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { emoji: "🚨", label: "Signalements/attente", value: pendingReports.length,                                    color: "text-red-400"   },
                    { emoji: "🎮", label: "Jeux disponibles",     value: games.length,                                             color: "text-cyan-400"  },
                    { emoji: "✅", label: "Paiements validés",    value: payments.filter((p) => p.verified_by_admin).length,       color: "text-green-400" },
                  ].map((s) => (
                    <Card key={s.label} className="text-center">
                      <div className="text-3xl mb-2">{s.emoji}</div>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-slate-400 text-xs mt-1">{s.label}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* ══ PAIEMENTS ══ */}
            {tab === "payments" && (
              <div className="space-y-3">
                {payments.filter((p) => p.proof_image).length === 0 ? (
                  <Card className="text-center py-10">
                    <div className="text-3xl mb-3">💳</div>
                    <p className="text-slate-400">Aucun paiement avec capture soumise</p>
                  </Card>
                ) : payments.filter((p) => p.proof_image).map((p) => (
                  <Card key={p.id} className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          p.verified_by_admin
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : p.status === "failed"
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        }`}>
                          {p.verified_by_admin ? "✅ Validé" : p.status === "failed" ? "❌ Échoué" : "⏳ En attente"}
                        </span>
                        <span className="text-slate-500 text-xs">#{p.id}</span>
                      </div>
                      <p className="text-white font-medium text-sm">
                        {p.username || `Joueur #${p.user_id}`} · Tournoi #{p.tournament_id}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {Number(p.amount).toLocaleString()} FCFA
                        {p.method ? ` · ${p.method}` : ""}
                        {p.transaction_ref && p.transaction_ref !== "0" ? ` · Réf: ${p.transaction_ref}` : ""}
                        {" · "}{formatDateTime(p.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {p.proof_image && (
                        <Button size="sm" variant="outline" onClick={() => viewProof(p.proof_image)}>
                          📸 Preuve
                        </Button>
                      )}
                      {!p.verified_by_admin && p.status !== "failed" && (
                        <Button size="sm" onClick={() => verifyPayment(p.id)}>
                          ✅ Valider
                        </Button>
                      )}
                      {p.verified_by_admin && (
                        <Button size="sm" variant="outline"
                          onClick={() => cancelPaymentVerification(p.id)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                          ↩️ Annuler
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* ══ TOURNOIS ══ */}
            {tab === "tournaments" && (
              <div className="space-y-3">
                {tournaments.length === 0 ? (
                  <Card className="text-center py-10"><div className="text-3xl mb-3">🏆</div><p className="text-slate-400">Aucun tournoi</p></Card>
                ) : tournaments.map((t) => (
                  <Card key={t.id} className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={t.status} />
                        <span className="text-slate-500 text-xs">#{t.id}</span>
                      </div>
                      <p className="text-white font-medium text-sm">{t.title}</p>
                      <p className="text-slate-400 text-xs">
                        🎮 {t.game_name || "—"} · 👥 {t.current_players || 0}/{t.max_players}
                        {" · "}{Number(t.price || 0).toLocaleString()} FCFA
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      {/* ── Forcer statut en français ── */}
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) { forceTournamentStatus(t.id, e.target.value); e.target.value = ""; }
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-purple-500">
                        <option value="">Forcer statut</option>
                        <option value="pending">⏳ En attente</option>
                        <option value="ongoing">▶️ En cours</option>
                        <option value="completed">✅ Terminé</option>
                        <option value="cancelled">❌ Annulé</option>
                      </select>
                      {t.status !== "completed" && t.status !== "cancelled" && (
                        <Button size="sm" onClick={() => openResultModal(t)}>🏆 Résultats</Button>
                      )}
                      <button onClick={() => confirmDeleteTournament(t)}
                        className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs transition-all">
                        🗑️
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* ══ UTILISATEURS ══ */}
            {tab === "users" && (
              <div className="space-y-3">
                {users.length === 0 ? (
                  <Card className="text-center py-10">
                    <div className="text-3xl mb-3">👥</div>
                    <p className="text-slate-400">Aucun utilisateur</p>
                    <p className="text-slate-500 text-xs mt-1">Vérifie que GET /api/v1/users est accessible en admin</p>
                  </Card>
                ) : users.map((u) => (
                  <Card key={u.id} className="flex items-center gap-4 flex-wrap">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
                      {u.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-white font-medium text-sm">{u.username}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          u.role === "admin"     ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : u.role === "organizer" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                          : "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}>
                          {u.role}
                        </span>
                        {(u.is_banned === 1 || u.is_banned === true) && (
                          <span className="text-xs px-2 py-0.5 rounded-full border bg-red-500/20 text-red-400 border-red-500/30">🚫 Banni</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs">
                        {u.email}{u.city ? ` · 📍 ${u.city}` : ""} · {u.points || 0} pts
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/profile/${u.id}`)}
                        className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs transition-all">
                        Profil
                      </button>
                      <button onClick={() => openUserModal(u)}
                        className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:border-purple-500 hover:text-purple-300 text-xs transition-all">
                        ⚙️ Gérer
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* ══ JEUX ══ */}
            {tab === "games" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button onClick={() => openGameModal()}
                    className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
                    ➕ Ajouter un jeu
                  </button>
                </div>
                {games.length === 0 ? (
                  <Card className="text-center py-10"><div className="text-3xl mb-3">🎮</div><p className="text-slate-400">Aucun jeu</p></Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {games.map((g) => (
                      <Card key={g.id} className="text-center py-5 relative group overflow-hidden">
                        <div className="text-4xl mb-2">🎮</div>
                        <p className="text-white text-sm font-semibold">{g.name}</p>
                        <p className="text-slate-500 text-xs mt-0.5">#{g.id}</p>
                        <div className="absolute inset-0 rounded-2xl bg-slate-900/95 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                          <button onClick={() => openGameModal(g)}
                            className="px-3 py-1.5 rounded-xl border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-xs font-medium">
                            ✏️ Modifier
                          </button>
                          <button onClick={() => confirmDeleteGame(g)}
                            className="px-3 py-1.5 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs font-medium">
                            🗑️
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ SIGNALEMENTS ══ */}
            {tab === "reports" && (
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <Card className="text-center py-10"><div className="text-3xl mb-3">🚨</div><p className="text-slate-400">Aucun signalement</p></Card>
                ) : reports.map((r) => (
                  <Card key={r.id} className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          r.status === "pending"  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          : r.status === "resolved" ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}>
                          {r.status === "pending" ? "⏳ En attente" : r.status === "resolved" ? "✅ Résolu" : "❌ Rejeté"}
                        </span>
                      </div>
                      <p className="text-white font-medium text-sm">
                        {r.reporter_username || `#${r.reporter_id}`} → {r.reported_username || `#${r.reported_user_id}`}
                      </p>
                      <p className="text-slate-400 text-xs">{r.reason}</p>
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => resolveReport(r.id, "resolved")}>✅ Résoudre</Button>
                        <Button size="sm" variant="outline" onClick={() => resolveReport(r.id, "rejected")}>❌ Rejeter</Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {/* ══ ANNONCES ══ */}
            {tab === "announce" && (
              <div className="max-w-2xl space-y-4">
                <Card>
                  <h2 className="text-white font-semibold mb-1">📢 Envoyer une annonce</h2>
                  <p className="text-slate-500 text-xs mb-5">L'annonce créera une notification pour les utilisateurs ciblés. Le badge 🔔 s'affichera sur leur cloche.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block">Destinataires</label>
                      <select value={announce.target} onChange={(e) => setAnnounce((a) => ({ ...a, target: e.target.value }))} className={iStyle}>
                        <option value="all">🌍 Tous les utilisateurs</option>
                        <option value="players">🎮 Joueurs uniquement</option>
                        <option value="organizers">🎖️ Organisateurs uniquement</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block">Titre</label>
                      <input value={announce.title} onChange={(e) => setAnnounce((a) => ({ ...a, title: e.target.value }))}
                        placeholder="Ex: Maintenance prévue ce soir" className={iStyle} />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block">Message</label>
                      <textarea value={announce.message} onChange={(e) => setAnnounce((a) => ({ ...a, message: e.target.value }))}
                        placeholder="Contenu de l'annonce..." rows={5} className={iStyle + " resize-none"} />
                    </div>
                    {(announce.title || announce.message) && (
                      <div className="p-4 rounded-xl border border-slate-600 bg-slate-900/50">
                        <p className="text-slate-500 text-xs mb-3">Aperçu :</p>
                        <div className="flex gap-3 items-start">
                          <span className="text-2xl">📢</span>
                          <div>
                            <p className="text-white text-sm font-medium">{announce.title || "—"}</p>
                            <p className="text-slate-400 text-xs mt-0.5">{announce.message || "—"}</p>
                          </div>
                          <div className="ml-auto w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1" />
                        </div>
                      </div>
                    )}
                    <button onClick={sendAnnouncement} disabled={announcing || !announce.title.trim() || !announce.message.trim()}
                      className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40 transition-all"
                      style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
                      {announcing ? "Envoi..." : "📢 Envoyer l'annonce"}
                    </button>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ MODAL Preuve ══ */}
      <Modal isOpen={proofModal} onClose={() => setProofModal(false)} title="📸 Preuve de paiement">
        <div className="space-y-4">
          {proofImage
            ? <img src={proofImage} alt="Preuve" className="w-full rounded-xl border border-slate-700 max-h-96 object-contain" />
            : <div className="text-center py-8 text-slate-400">Image introuvable</div>
          }
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setProofModal(false)}>Fermer</Button>
            {proofImage && (
              <a href={proofImage} target="_blank" rel="noreferrer"
                className="flex-1 py-2.5 px-4 rounded-xl text-center text-white text-sm font-semibold bg-purple-600 hover:bg-purple-700 transition-colors">
                🔍 Ouvrir
              </a>
            )}
          </div>
        </div>
      </Modal>

      {/* ══ MODAL Résultats ══ */}
      <Modal isOpen={resultModal} onClose={() => setResultModal(false)} title="🏆 Enregistrer les résultats">
        <div className="space-y-4">
          <p className="text-slate-400 text-sm font-medium">{selectedT?.title}</p>

          {loadingParts ? (
            <div className="space-y-2">
              {[1,2,3].map((i) => <div key={i} className="h-10 rounded-xl bg-slate-700/30 animate-pulse" />)}
            </div>
          ) : participants.length === 0 ? (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-yellow-400 text-xs">⚠️ Aucun participant trouvé pour ce tournoi. Assure-toi que des joueurs ont rejoint avant d'enregistrer les résultats.</p>
            </div>
          ) : (
            <>
              <p className="text-slate-500 text-xs">{participants.length} participant{participants.length > 1 ? "s" : ""} · Chaque joueur ne peut être sélectionné qu'une fois</p>
              {rankings.map((entry, i) => {
                // Options filtrées : exclure les user_id déjà choisis dans les autres rangs
                const usedIds = rankings.filter((_, idx) => idx !== i).map((r) => r.user_id).filter(Boolean);
                const available = participants.filter((p) => !usedIds.includes(String(p.user_id || p.id)));

                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      i === 0 ? "bg-yellow-500 text-black"
                      : i === 1 ? "bg-slate-400 text-black"
                      : "bg-amber-700 text-white"
                    }`}>
                      {["🥇","🥈","🥉"][i]}
                    </div>
                    <select
                      value={entry.user_id}
                      onChange={(e) => {
                        const updated = [...rankings];
                        updated[i] = { ...updated[i], user_id: e.target.value };
                        setRankings(updated);
                      }}
                      className={iStyle}>
                      <option value="">{i === 0 ? "Sélectionne le 1er (obligatoire)" : `Sélectionne le ${i+1}e (optionnel)`}</option>
                      {/* Afficher le participant actuellement sélectionné même s'il n'est plus dans "available" */}
                      {participants
                        .filter((p) => {
                          const pid = String(p.user_id || p.id);
                          return !usedIds.includes(pid) || pid === entry.user_id;
                        })
                        .map((p) => (
                          <option key={p.user_id || p.id} value={String(p.user_id || p.id)}>
                            {p.username}
                          </option>
                        ))
                      }
                    </select>
                    <span className="text-slate-400 text-xs flex-shrink-0 font-medium whitespace-nowrap">
                      +{[20,10,5][i]} pts
                    </span>
                  </div>
                );
              })}
            </>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setResultModal(false)}>Annuler</Button>
            <Button className="flex-1" onClick={submitResults} disabled={loadingParts || participants.length === 0}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL Gestion User ══ */}
      <Modal isOpen={userModal} onClose={() => setUserModal(false)} title={`⚙️ Gérer ${selectedUser?.username}`}>
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700">
            <p className="text-slate-400 text-xs mb-0.5">Compte</p>
            <p className="text-white font-semibold">{selectedUser?.username}</p>
            <p className="text-slate-400 text-xs">{selectedUser?.email}</p>
            <p className="text-slate-400 text-xs mt-1">Rôle : <span className="text-white capitalize">{selectedUser?.role}</span></p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-2">Changer le rôle</p>
            <div className="flex gap-2">
              {["player","organizer","admin"].map((r) => (
                <button key={r} onClick={() => updateRole(r)} disabled={selectedUser?.role === r}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all disabled:opacity-40 ${
                    selectedUser?.role === r ? "bg-purple-600/30 text-purple-300 border-purple-500/50 cursor-default"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:border-purple-500 hover:text-purple-300"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-700 pt-3 space-y-2">
            <button onClick={toggleBan}
              className={`w-full py-2.5 rounded-xl border text-sm font-medium transition-all ${
                (selectedUser?.is_banned === 1 || selectedUser?.is_banned === true)
                  ? "border-green-500/50 text-green-400 hover:bg-green-500/10"
                  : "border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"}`}>
              {(selectedUser?.is_banned === 1 || selectedUser?.is_banned === true) ? "🔓 Débannir" : "🚫 Bannir"} cet utilisateur
            </button>
            <button onClick={confirmDeleteUser}
              className="w-full py-2.5 rounded-xl bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/40 transition-all text-sm font-medium">
              🗑️ Supprimer définitivement
            </button>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setUserModal(false)}>Fermer</Button>
        </div>
      </Modal>

      {/* ══ MODAL Jeu ══ */}
      <Modal isOpen={gameModal} onClose={() => setGameModal(false)} title={gameForm.id ? "✏️ Modifier le jeu" : "➕ Ajouter un jeu"}>
        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Nom du jeu</label>
            <input value={gameForm.name} onChange={(e) => setGameForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Free Fire, COD Mobile..." className={iStyle}
              onKeyDown={(e) => e.key === "Enter" && saveGame()} />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setGameModal(false)}>Annuler</Button>
            <Button className="flex-1" onClick={saveGame}>{gameForm.id ? "Modifier" : "Ajouter"}</Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL Confirmation ══ */}
      <ConfirmModal
        isOpen={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        onConfirm={confirm.onConfirm}
        title={confirm.title}
        message={confirm.message}
        danger={confirm.danger}
      />
    </div>
  );
}