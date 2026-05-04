import { io } from "socket.io-client";
import { useAuthStore } from "../auth/authStore";

let socket = null;

export function getSocket() {
  const token = useAuthStore.getState().token;
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

  // Recrée le socket si inexistant OU si le token a changé
  if (!socket || socket.auth?.token !== token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 15000,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
  socket = null;
}