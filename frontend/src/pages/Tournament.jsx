import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { getTournamentApi, joinTournamentApi } from "../features/tournaments/tournamentApi";
import { useAuthStore } from "../features/auth/authStore";
import { formatDateTime } from "../utils/formatDate";
import api from "../services/api";

function StatusBadge({ status }) {
  const map = {
    pending:   { label: "À venir",  cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    ongoing:   { label: "En cours", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
    completed: { label: "Terminé",  cls: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
    cancelled: { label: "Annulé",   cls: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const s = map[status] || map.pending;
  return <span className={`text-xs font-medium px-2 py-1 rounded-full border ${s.cls}`}>{s.label}</span>;
}

function PlacesBar({ current, max }) {
  const progress  = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const isFull    = current >= max;
  const isWarning = progress >= 75 && !isFull;
  const barColor  = isFull
    ? "linear-gradient(90deg,#EF4444,#DC2626)"
    : isWarning ? "linear-gradient(90deg,#F59E0B,#EF4444)"
    : "linear-gradient(90deg,#7C3AED,#06B6D4)";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-slate-400 text-sm font-medium">👥 Places</span>
        <span className={`text-sm font-bold ${isFull ? "text-red-400" : isWarning ? "text-yellow-400" : "text-white"}`}>
          {current} / {max}
        </span>
      </div>
      <div className="w-full h-2.5 rounded-full" style={{ background: "#1E293B" }}>
        <div className="h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${progress}%`, background: barColor }} />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500">{Math.round(progress)}% rempli</span>
        {isFull
          ? <span className="text-xs text-red-400 font-semibold">🔴 Complet — inscriptions fermées</span>
          : <span className={`text-xs font-medium ${isWarning ? "text-yellow-400" : "text-green-400"}`}>
              {max - current} place{max - current > 1 ? "s" : ""} restante{max - current > 1 ? "s" : ""}
            </span>
        }
      </div>
    </div>
  );
}

export default function Tournament() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [tournament, setTournament]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [joining, setJoining]         = useState(false);
  const [payModal, setPayModal]       = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [proofFile, setProofFile]     = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [msgModal, setMsgModal]       = useState(false);
  const [msgText, setMsgText]         = useState("");
  const [sending, setSending]         = useState(false);

  const loadTournament = async () => {
    try {
      const res = await getTournamentApi(id);
      setTournament(res.data?.tournament || res.data);
    } catch {
      toast.error("Tournoi introuvable");
      navigate("/tournaments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTournament(); }, [id]);

  const handleJoin = async () => {
    if (!tournament) return;
    const current = tournament.current_players || 0;
    const max     = tournament.max_players || 0;
    if (current >= max) {
      toast.error("🔴 Ce tournoi est complet, il n'y a plus de places disponibles !");
      return;
    }
    setJoining(true);
    try {
      const res  = await joinTournamentApi(id);
      const data = res.data;
      if (data?.paymentRequired) {
        setPaymentInfo(data.payment);
        setPayModal(true);
        toast.success("Paiement requis — suis les instructions ci-dessous");
      } else {
        toast.success("🎉 Tu as rejoint le tournoi !");
        await loadTournament();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur";
      if (msg.toLowerCase().includes("full") || msg.toLowerCase().includes("complet")) {
        toast.error("🔴 Ce tournoi est complet !");
      } else if (msg.toLowerCase().includes("already")) {
        toast.error("Tu es déjà inscrit à ce tournoi !");
      } else {
        toast.error(msg);
      }
      await loadTournament();
    } finally {
      setJoining(false);
    }
  };

  const sendMessageToAll = async () => {
    if (!msgText.trim()) { toast.error("Écris un message"); return; }
    setSending(true);
    try {
      const res = await api.post(`/tournaments/${id}/message`, { message: msgText });
      toast.success(`✅ Message envoyé à ${res.data.sent} participant(s) !`);
      setMsgModal(false);
      setMsgText("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setSending(false);
    }
  };

  const submitPayment = async () => {
    if (!proofFile) { toast.error("Ajoute la capture d'écran de ton paiement"); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("payment_id",  String(paymentInfo.id));
      formData.append("method",      "mtn");
      formData.append("proof_image", proofFile);
      await api.patch("/payments/proof", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Capture envoyée ! En attente de validation admin ✅");
      setPayModal(false);
      setProofFile(null);
      await loadTournament();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-56 rounded-3xl bg-slate-800/50 animate-pulse" />
        <div className="h-32 rounded-2xl bg-slate-800/50 animate-pulse" />
        <div className="h-48 rounded-2xl bg-slate-800/50 animate-pulse" />
      </div>
    </div>
  );
  if (!tournament) return null;

  const current     = tournament.current_players || 0;
  const max         = tournament.max_players     || 0;
  const isFull      = current >= max;
  const isCompleted = tournament.status === "completed";
  const isCancelled = tournament.status === "cancelled";
  const isOngoing   = tournament.status === "ongoing";
  const canJoin     = !isFull && !isCompleted && !isCancelled && !isOngoing;
  const isOrganizerOrAdmin = user?.id === tournament.organizer_id || user?.role === "admin";

  const prizePool = tournament.price > 0
    ? `${Math.round(Number(tournament.price) * max * 0.7).toLocaleString()} FCFA`
    : "Trophée JGAME 🏆";

  const remaining = max - current;
  const pct       = max > 0 ? (current / max) * 100 : 0;

  return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden p-8"
          style={{ background: "linear-gradient(135deg,#1e1040 0%,#0F172A 60%,#0c1a2e 100%)" }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 80% 50%,#7C3AED 0%,transparent 60%)" }} />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <StatusBadge status={tournament.status} />
                <h1 className="text-2xl md:text-3xl font-bold text-white mt-3 mb-2"
                  style={{ fontFamily: "Poppins,sans-serif" }}>
                  {tournament.title}
                </h1>
                <p className="text-slate-400 text-sm">
                  🎮 {tournament.game_name || "—"}
                  {tournament.city ? ` · 📍 ${tournament.city}` : ""}
                  {" · "}{tournament.type === "physical" ? "Présentiel" : "🌐 En ligne"}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-3xl font-bold text-cyan-400">
                  {tournament.price > 0
                    ? `${Number(tournament.price).toLocaleString()} FCFA`
                    : "Gratuit"}
                </p>
                <p className="text-slate-400 text-sm">Prix d'entrée</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Corps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Colonne principale */}
          <div className="md:col-span-2 space-y-4">
            <Card>
              <h2 className="text-white font-semibold mb-4">Informations</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Date de début", value: formatDateTime(tournament.date) },
                  { label: "Type",          value: tournament.type === "physical" ? "📍 Présentiel" : "🌐 En ligne" },
                  { label: "1er place",     value: "+20 pts 🥇" },
                  { label: "2e place",      value: "+10 pts 🥈" },
                ].map((info) => (
                  <div key={info.label} className="rounded-xl p-3"
                    style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.5)" }}>
                    <p className="text-slate-400 text-xs mb-1">{info.label}</p>
                    <p className="text-white font-medium text-sm">{info.value}</p>
                  </div>
                ))}
              </div>
            </Card>

            {(tournament.location_details || tournament.city) && (
              <Card>
                <h2 className="text-white font-semibold mb-3">
                  {tournament.type === "physical" ? "📍 Lieu du tournoi" : "ℹ️ Détails"}
                </h2>
                {tournament.city && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-purple-400 text-sm">🏙️</span>
                    <span className="text-white font-medium text-sm">{tournament.city}</span>
                  </div>
                )}
                {tournament.location_details && (
                  <div className="rounded-xl p-3"
                    style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
                    <p className="text-slate-300 text-sm leading-relaxed">{tournament.location_details}</p>
                  </div>
                )}
                {tournament.type === "physical" && (
                  <p className="text-slate-500 text-xs mt-2">
                    📌 Présente-toi à l'adresse indiquée à l'heure du tournoi.
                  </p>
                )}
              </Card>
            )}

            <Card><PlacesBar current={current} max={max} /></Card>

            {tournament.participants && tournament.participants.length > 0 && (
              <Card>
                <h2 className="text-white font-semibold mb-3">
                  👥 Participants ({tournament.participants.length})
                </h2>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {tournament.participants.map((p) => (
                    <div key={p.user_id}
                      className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/profile/${p.user_id}`)}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
                        {p.username?.[0]?.toUpperCase()}
                      </div>
                      <p className="text-white text-sm flex-1">{p.username}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        p.payment_status === "paid"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }`}>
                        {p.payment_status === "paid" ? "✅ Confirmé" : "⏳ En attente"}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Colonne action */}
          <div className="space-y-4">
            <Card className="text-center">
              <div className="text-5xl mb-3">🏆</div>
              <p className="text-slate-400 text-xs mb-1">Prize pool estimé</p>
              <p className="text-white font-bold text-lg mb-1">{prizePool}</p>
              <p className="text-slate-500 text-xs mb-5">70% du pool · 10% JGAME</p>

              {isFull ? (
                <div className="w-full py-3 px-4 rounded-xl text-center text-sm font-semibold"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171" }}>
                  🔴 Tournoi complet
                </div>
              ) : isCompleted ? (
                <div className="w-full py-3 px-4 rounded-xl text-center text-sm font-medium text-slate-400"
                  style={{ background: "rgba(51,65,85,0.5)", border: "1px solid rgba(51,65,85,0.8)" }}>
                  Tournoi terminé
                </div>
              ) : isCancelled ? (
                <div className="w-full py-3 px-4 rounded-xl text-center text-sm font-medium text-red-400"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  Tournoi annulé
                </div>
              ) : isOngoing ? (
                <div className="w-full py-3 px-4 rounded-xl text-center text-sm font-medium text-yellow-400"
                  style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                  🟡 En cours — inscriptions fermées
                </div>
              ) : (
                <Button onClick={handleJoin} disabled={joining} className="w-full" size="lg">
                  {joining ? "Inscription..." : tournament.price > 0 ? "💳 Rejoindre & Payer" : "🎮 Rejoindre gratuitement"}
                </Button>
              )}

              {canJoin && pct >= 90 && (
                <p className="text-red-400 text-xs mt-2 font-medium">
                  🔥 Dépêche-toi ! Plus que {remaining} place{remaining > 1 ? "s" : ""} !
                </p>
              )}
              {canJoin && pct >= 75 && pct < 90 && (
                <p className="text-yellow-400 text-xs mt-2">
                  ⚡ {remaining} place{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}
                </p>
              )}
            </Card>

            {/* Bouton message participants — organisateur/admin uniquement */}
            {isOrganizerOrAdmin && (
              <Card>
                <p className="text-white font-semibold text-sm mb-2">📢 Contacter les participants</p>
                <p className="text-slate-400 text-xs mb-3">
                  Envoie un message à tous les joueurs inscrits.
                </p>
                <Button className="w-full" onClick={() => setMsgModal(true)}>
                  ✉️ Envoyer un message
                </Button>
              </Card>
            )}

            <Card>
              <p className="text-slate-400 text-xs text-center">
                📅 Créé le {formatDateTime(tournament.created_at)}
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* MODAL Paiement */}
      <Modal isOpen={payModal} onClose={() => { setPayModal(false); setProofFile(null); }} title="💳 Paiement requis">
        <div className="space-y-4">
          <div className="rounded-xl p-4 text-center"
            style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.5)" }}>
            <p className="text-slate-400 text-sm mb-1">Montant à payer</p>
            <p className="text-3xl font-bold text-cyan-400">
              {paymentInfo ? Number(paymentInfo.amount).toLocaleString() : 0} FCFA
            </p>
          </div>

          <div className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.5)" }}>
            <p className="text-white font-semibold text-sm mb-1">📋 Instructions de paiement</p>
            <div className="flex items-start gap-2">
              <span className="text-purple-400 font-bold text-xs flex-shrink-0 mt-0.5">1.</span>
              <p className="text-slate-400 text-sm">Envoie le montant via <span className="text-white font-medium">MTN MoMo</span> ou <span className="text-white font-medium">Orange Money</span></p>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(124,58,237,0.3)" }}>
              <div className="px-3 py-2" style={{ background: "rgba(124,58,237,0.1)" }}>
                <p className="text-purple-300 text-xs font-semibold">📱 Numéros de paiement</p>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(51,65,85,0.5)" }}>
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs">MTN MoMo</p>
                    <p className="text-white font-bold text-base tracking-wide">681 640 130</p>
                  </div>
                  <span className="text-yellow-400 text-lg">📲</span>
                </div>
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs">Orange Money</p>
                    <p className="text-white font-bold text-base tracking-wide">692 099 194</p>
                  </div>
                  <span className="text-orange-400 text-lg">📲</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-400 font-bold text-xs flex-shrink-0 mt-0.5">2.</span>
              <p className="text-slate-400 text-sm">Nom du bénéficiaire : <span className="text-white font-bold">BOPDA FEUKOUO JOFRANCK</span></p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-400 font-bold text-xs flex-shrink-0 mt-0.5">3.</span>
              <p className="text-slate-400 text-sm">Fais une capture d'écran de la confirmation de paiement</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-400 font-bold text-xs flex-shrink-0 mt-0.5">4.</span>
              <p className="text-slate-400 text-sm">Uploade la capture ci-dessous</p>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">
              📸 Capture d'écran <span className="text-red-400">*</span>
            </label>
            <label className={`block w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              proofFile ? "border-green-500/50 bg-green-500/10" : "border-slate-600 hover:border-purple-500/50 hover:bg-purple-500/5"
            }`}>
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
              {proofFile ? (
                <>
                  <div className="text-3xl mb-1">✅</div>
                  <p className="text-green-400 text-sm font-medium">{proofFile.name}</p>
                  <p className="text-slate-500 text-xs mt-1">Clique pour changer</p>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-1">📸</div>
                  <p className="text-slate-400 text-sm">Clique pour ajouter la capture</p>
                  <p className="text-slate-500 text-xs mt-1">JPG, PNG, WEBP · Max 5MB</p>
                </>
              )}
            </label>
          </div>

          <div className="rounded-xl p-3"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <p className="text-yellow-400 text-xs">
              ⚠️ Ta participation sera confirmée après vérification par l'admin sous 24h.
              Tu recevras une notification de confirmation.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1"
              onClick={() => { setPayModal(false); setProofFile(null); }}>
              Annuler
            </Button>
            <Button className="flex-1" disabled={!proofFile || submitting} onClick={submitPayment}>
              {submitting ? "Envoi..." : "Envoyer ✅"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL Message participants */}
      <Modal isOpen={msgModal} onClose={() => { setMsgModal(false); setMsgText(""); }} title="📢 Message aux participants">
        <div className="space-y-4">
          <div className="rounded-xl p-3"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)" }}>
            <p className="text-purple-300 text-xs">
              Ce message sera envoyé en notification et en message privé à tous les participants confirmés du tournoi.
            </p>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">
              Ton message <span className="text-red-400">*</span>
            </label>
            <textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="Ex: Le tournoi commence dans 30 minutes, connectez-vous !"
              rows={4}
              maxLength={500}
              className="w-full rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-purple-500"
              style={{ background: "#0F172A", border: "1px solid #334155" }}
            />
            <p className="text-slate-500 text-xs mt-1 text-right">{msgText.length}/500</p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1"
              onClick={() => { setMsgModal(false); setMsgText(""); }}>
              Annuler
            </Button>
            <Button className="flex-1" disabled={!msgText.trim() || sending} onClick={sendMessageToAll}>
              {sending ? "Envoi..." : "Envoyer ✅"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}