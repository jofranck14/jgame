import axios from "axios";
import { useAuthStore } from "../features/auth/authStore";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 35000, // 35s pour laisser le temps à Render de se réveiller
});

let wakeToastId = null;
let wakeTimer = null;

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Si la requête prend plus de 4s, afficher le message de réveil
  wakeTimer = setTimeout(() => {
    wakeToastId = toast.loading("⏳ Démarrage du serveur, patiente 20-30s...", {
      duration: 35000,
    });
  }, 4000);

  return config;
});

api.interceptors.response.use(
  (res) => {
    // Requête réussie → annuler le timer et fermer le toast
    clearTimeout(wakeTimer);
    if (wakeToastId) {
      toast.dismiss(wakeToastId);
      wakeToastId = null;
    }
    return res;
  },
  (err) => {
    // Erreur → annuler le timer et fermer le toast
    clearTimeout(wakeTimer);
    if (wakeToastId) {
      toast.dismiss(wakeToastId);
      wakeToastId = null;
    }

    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      toast.error("⚠️ Le serveur met du temps à répondre. Réessaie dans 30s.");
    } else if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }

    return Promise.reject(err);
  }
);

export default api;