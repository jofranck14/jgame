import axios from "axios";
import { useAuthStore } from "../features/auth/authStore";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 35000,
});

// Un seul toast global, pas un par requête
let wakeToastId = null;
let activeRequests = 0;
let wakeTimer = null;

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  activeRequests++;

  // Lancer le timer seulement si c'est la première requête
  if (activeRequests === 1 && !wakeToastId) {
    wakeTimer = setTimeout(() => {
      wakeToastId = toast.loading("⏳ Démarrage du serveur, patiente 20-30s...", {
        duration: 35000,
      });
    }, 4000);
  }

  return config;
});

function onRequestDone() {
  activeRequests = Math.max(0, activeRequests - 1);
  // Fermer le toast seulement quand toutes les requêtes sont terminées
  if (activeRequests === 0) {
    clearTimeout(wakeTimer);
    wakeTimer = null;
    if (wakeToastId) {
      toast.dismiss(wakeToastId);
      wakeToastId = null;
    }
  }
}

api.interceptors.response.use(
  (res) => {
    onRequestDone();
    return res;
  },
  (err) => {
    onRequestDone();

    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      toast.error("⚠️ Le serveur met du temps à répondre. Réessaie dans 30s.");
    } else if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }

    return Promise.reject(err);
  }
);

export default api;