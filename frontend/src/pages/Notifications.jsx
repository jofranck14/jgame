import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/layout/Navbar";
import Card   from "../components/ui/Card";
import { formatDateTime } from "../utils/formatDate";
import api from "../services/api";

const TYPE_CONFIG = {
  tournament_new:       { icon: "🏆", color: "text-purple-400", label: "Nouveau tournoi" },
  payment_validated:    { icon: "✅", color: "text-green-400",  label: "Paiement validé" },
  result_published:     { icon: "📊", color: "text-cyan-400",   label: "Résultats publiés" },
  report_resolved:      { icon: "🚨", color: "text-red-400",    label: "Signalement traité" },
  default:              { icon: "🔔", color: "text-slate-400",  label: "Notification" },
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get("/notifications")
      .then((r) => setNotifs(r.data?.notifications || r.data || []))
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const unread = notifs.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden p-8"
          style={{ background: "linear-gradient(135deg,#1e1040 0%,#0F172A 60%,#0c1a2e 100%)" }}>
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "Poppins,sans-serif" }}>🔔 Notifications</h1>
              <p className="text-slate-400 text-sm">{unread > 0 ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est à jour ✓"}</p>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-purple-400 hover:text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-full transition-colors">
                Tout marquer comme lu
              </button>
            )}
          </div>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map((i) => <div key={i} className="h-16 bg-slate-800/50 rounded-2xl animate-pulse" />)}
          </div>
        ) : notifs.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-5xl mb-3">🔔</div>
            <p className="text-white font-semibold mb-1">Aucune notification</p>
            <p className="text-slate-400 text-sm">Tu es à jour ! Les nouveaux événements apparaîtront ici.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifs.map((n, i) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.default;
              return (
                <motion.div key={n.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                    n.is_read ? "border-slate-700/30 bg-slate-800/20" : "border-purple-500/20 bg-purple-500/5"
                  } hover:border-slate-600`}
                  onClick={() => {
                    if (n.link) navigate(n.link);
                    api.patch(`/notifications/${n.id}/read`).catch(() => {});
                    setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
                  }}>
                  <div className={`text-2xl flex-shrink-0 mt-0.5 ${cfg.color}`}>{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</p>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />}
                    </div>
                    <p className="text-white text-sm">{n.message}</p>
                    <p className="text-slate-500 text-xs mt-1">{formatDateTime(n.created_at)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}