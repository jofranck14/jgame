import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import Card   from "../components/ui/Card";
import Button from "../components/ui/Button";
import { createReportApi } from "../features/tournaments/tournamentApi";

export default function ReportPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const params    = new URLSearchParams(location.search);

  const [form, setForm] = useState({
    reported_user_id: params.get("user_id") || "",
    tournament_id:    params.get("tournament_id") || "",
    reason:           "",
  });
  const [submitting, setSubmitting] = useState(false);

  const REASONS = [
    "Triche pendant un tournoi",
    "Faux résultats soumis",
    "Comportement abusif / insultes",
    "Non-paiement après tournoi",
    "Faux organisateur / arnaque",
    "Autre",
  ];

  const [selected, setSelected] = useState("");

  const handleSubmit = async () => {
    const reason = selected === "Autre" ? form.reason : selected;
    if (!reason.trim()) { toast.error("Choisis ou écris une raison"); return; }
    if (!form.reported_user_id) { toast.error("Indique l'ID du joueur à signaler"); return; }
    setSubmitting(true);
    try {
      await createReportApi({
        reported_user_id: form.reported_user_id,
        tournament_id:    form.tournament_id || null,
        reason,
      });
      toast.success("Signalement envoyé à l'admin 🚨");
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = "w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors text-sm";

  return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden p-8"
          style={{ background: "linear-gradient(135deg,#2d0a0a 0%,#0F172A 60%,#0c1a2e 100%)" }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%,#EF4444 0%,transparent 60%)" }} />
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "Poppins,sans-serif" }}>🚨 Signalement</h1>
            <p className="text-slate-400 text-sm">Aide-nous à maintenir une communauté fair-play</p>
          </div>
        </motion.div>

        <Card>
          <div className="space-y-4">
            <div>
              <label className="text-slate-400 text-xs block mb-1">ID du joueur signalé *</label>
              <input value={form.reported_user_id} onChange={(e) => setForm((p) => ({ ...p, reported_user_id: e.target.value }))}
                placeholder="Ex: 12" className={inputStyle} />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">ID du tournoi concerné (optionnel)</label>
              <input value={form.tournament_id} onChange={(e) => setForm((p) => ({ ...p, tournament_id: e.target.value }))}
                placeholder="Ex: 5" className={inputStyle} />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-3">Raison du signalement *</label>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <button key={r} onClick={() => setSelected(r)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                      selected === r ? "border-red-500/50 bg-red-500/10 text-red-300" : "border-slate-700/50 text-slate-300 hover:border-slate-600"
                    }`}>
                    {selected === r ? "● " : "○ "}{r}
                  </button>
                ))}
              </div>
            </div>
            {selected === "Autre" && (
              <div>
                <label className="text-slate-400 text-xs block mb-1">Précise la raison</label>
                <textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Décris le problème en détail..."
                  rows={3}
                  className={`${inputStyle} resize-none`} />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>Annuler</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={submitting || !selected}>
                {submitting ? "Envoi..." : "🚨 Envoyer le signalement"}
              </Button>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}