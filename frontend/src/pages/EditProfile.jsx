import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { getMeApi } from "../features/auth/authApi";
import { updateMeApi } from "../features/tournaments/tournamentApi";
import { useAuthStore } from "../features/auth/authStore";

export default function EditProfile() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({
    username: "", city: "", bio: "", email: "",
  });

  useEffect(() => {
    getMeApi()
      .then((res) => {
        const u = res.data?.user || res.data;
        setForm({
          username: u.username || "",
          city:     u.city     || "",
          bio:      u.bio      || "",
          email:    u.email    || "",
        });
      })
      .catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.username.trim()) { toast.error("Le pseudo est obligatoire"); return; }
    setSaving(true);
    try {
      const res = await updateMeApi(form);
      const updated = res.data?.user || res.data;
      if (updated) setUser(updated);
      toast.success("Profil mis à jour ✅");
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors text-sm";

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "#0F172A" }}>
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-8">
          <div className="h-64 bg-slate-800/50 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0F172A" }}>
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Poppins, sans-serif" }}>
            ✏️ Modifier mon profil
          </h1>
          <p className="text-slate-400 text-sm mt-1">Ces infos sont visibles sur ton profil public</p>
        </div>

        {/* Avatar placeholder */}
        <Card className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {form.username?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-white font-medium text-sm">Photo de profil</p>
            <p className="text-slate-500 text-xs mt-0.5">Upload avatar — bientôt disponible</p>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Pseudo *</label>
            <input name="username" value={form.username} onChange={handleChange} placeholder="Ton pseudo" className={inputClass} />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="ton@email.com" className={inputClass} />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Ville</label>
            <input name="city" value={form.city} onChange={handleChange} placeholder="Ex: Yaoundé, Douala, Bafoussam..." className={inputClass} />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Bio (optionnel)</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Présente-toi en quelques mots..."
              rows={3}
              className={inputClass + " resize-none"}
            />
          </div>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
            {saving ? "Sauvegarde..." : "Enregistrer ✅"}
          </Button>
        </div>
      </div>
    </div>
  );
}