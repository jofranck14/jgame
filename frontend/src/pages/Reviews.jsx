import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import Card   from "../components/ui/Card";
import Button from "../components/ui/Button";
import Modal  from "../components/ui/Modal";
import { useAuthStore } from "../features/auth/authStore";
import { getReviewsApi, createReviewApi } from "../features/tournaments/tournamentApi";
import api from "../services/api";
import { formatDate } from "../utils/formatDate";

export default function Reviews() {
  const { organizerId } = useParams();
  const navigate        = useNavigate();
  const { user }        = useAuthStore();

  const [reviews,    setReviews]    = useState([]);
  const [organizer,  setOrganizer]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [form,       setForm]       = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [rRes, uRes] = await Promise.all([
          getReviewsApi(organizerId),
          api.get(`/users/${organizerId}`),
        ]);
        setReviews(rRes.data?.reviews || rRes.data || []);
        setOrganizer(uRes.data?.user || uRes.data);
      } catch {
        toast.error("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [organizerId]);

  const handleSubmit = async () => {
    if (!form.comment.trim()) { toast.error("Écris un commentaire"); return; }
    setSubmitting(true);
    try {
      await createReviewApi({ organizer_id: organizerId, rating: form.rating, comment: form.comment });
      toast.success("Avis envoyé ⭐");
      setModal(false);
      setForm({ rating: 5, comment: "" });
      const res = await getReviewsApi(organizerId);
      setReviews(res.data?.reviews || res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const avg = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden p-8"
          style={{ background: "linear-gradient(135deg,#1e1040 0%,#0F172A 60%,#0c1a2e 100%)" }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 50%,#F59E0B 0%,transparent 60%)" }} />
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "Poppins,sans-serif" }}>
              ⭐ Avis sur {organizer?.username || "l'organisateur"}
            </h1>
            {avg && (
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-bold text-2xl">{avg}</span>
                <span className="text-yellow-400">{"★".repeat(Math.round(avg))}{"☆".repeat(5 - Math.round(avg))}</span>
                <span className="text-slate-400 text-sm">({reviews.length} avis)</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Bouton laisser un avis */}
        {String(user?.id) !== String(organizerId) && (
          <Button className="w-full" onClick={() => setModal(true)}>⭐ Laisser un avis</Button>
        )}

        {/* Liste */}
        <div className="space-y-4">
          {loading ? (
            [1,2,3].map((i) => <div key={i} className="h-28 bg-slate-800/50 rounded-2xl animate-pulse" />)
          ) : reviews.length === 0 ? (
            <Card className="text-center py-10">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-white font-semibold mb-1">Aucun avis pour l'instant</p>
              <p className="text-slate-400 text-sm">Sois le premier à noter cet organisateur</p>
            </Card>
          ) : reviews.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
                      {r.reviewer_username?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{r.reviewer_username || `Joueur #${r.user_id}`}</p>
                      <p className="text-slate-500 text-xs">{formatDate(r.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-yellow-400 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                </div>
                <p className="text-slate-300 text-sm">{r.comment}</p>
              </Card>
            </motion.div>
          ))}
        </div>

      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="⭐ Laisser un avis">
        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs block mb-2">Note</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map((n) => (
                <button key={n} onClick={() => setForm((p) => ({ ...p, rating: n }))}
                  className={`text-2xl transition-transform hover:scale-110 ${form.rating >= n ? "text-yellow-400" : "text-slate-600"}`}>
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">Commentaire</label>
            <textarea value={form.comment} onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
              placeholder="Partage ton expérience avec cet organisateur..."
              rows={4}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors text-sm resize-none" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setModal(false)}>Annuler</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>{submitting ? "Envoi..." : "Publier"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}