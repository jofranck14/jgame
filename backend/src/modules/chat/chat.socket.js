const jwt         = require("jsonwebtoken");
const { env }     = require("../../config/env");
const chatService = require("./chat.service");

// userId → Set<socketId> (multi-appareils)
const onlineUsers = new Map();

function addOnline(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}
function removeOnline(userId, socketId) {
  const s = onlineUsers.get(userId);
  if (!s) return;
  s.delete(socketId);
  if (s.size === 0) onlineUsers.delete(userId);
}
function isOnline(userId) {
  const s = onlineUsers.get(userId);
  return !!(s && s.size > 0);
}

function initChat(io) {
  // ── Auth middleware ──────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");
    if (!token) return next(new Error("Missing token"));
    try {
      socket.user = jwt.verify(token, env.JWT_SECRET);
      return next();
    } catch {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user?.id;
    if (!userId) return;

    addOnline(userId, socket.id);

    // Room personnelle pour recevoir même sans joinConversation
    socket.join(`user_${userId}`);

    // Informer les autres de la connexion
    socket.broadcast.emit("userOnline", { userId });

    // Envoyer la liste des connectés au nouveau
    socket.emit("onlineList", { users: Array.from(onlineUsers.keys()) });

    // ── S'enregistrer (compatibilité expo-router)
    socket.on("register", ({ userId: uid }) => {
      // Déjà dans user_${userId}, rien à faire
    });

    // ── Rejoindre la room de conversation ──────────────
    socket.on("joinConversation", ({ other_user_id, otherUserId }) => {
      const otherId = other_user_id || otherUserId;
      if (!otherId) return;
      const room = [userId, Number(otherId)].sort((a, b) => a - b).join("_");
      socket.join(room);
      // Envoyer le statut de l'autre user
      socket.emit("userStatus", {
        userId: Number(otherId),
        online: isOnline(Number(otherId)),
      });
    });

    // Alias ancien
    socket.on("joinRoom", ({ room_id }) => {
      if (room_id) socket.join(String(room_id));
    });

    // ── Envoyer un message ─────────────────────────────
    socket.on("sendMessage", async ({ receiver_id, receiverId, message, senderId }) => {
      const toId  = receiver_id || receiverId;
      const msgTxt = message;
      if (!toId || !msgTxt) return;
      try {
        const saved = await chatService.saveMessage({
          sender_id:   userId,
          receiver_id: Number(toId),
          message:     String(msgTxt).trim(),
        });
        const room = [userId, Number(toId)].sort((a, b) => a - b).join("_");
        // Émettre dans la room partagée
        io.to(room).emit("receiveMessage", saved);
        // Fallback room personnelle (si l'autre n'a pas rejoint la room)
        io.to(`user_${toId}`).emit("receiveMessage", saved);
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // ── Statut d'un user ───────────────────────────────
    socket.on("checkStatus", ({ userId: targetId }) => {
      socket.emit("userStatus", {
        userId: Number(targetId),
        online: isOnline(Number(targetId)),
      });
    });

    // ── Déconnexion ────────────────────────────────────
    socket.on("disconnect", () => {
      removeOnline(userId, socket.id);
      if (!isOnline(userId)) {
        socket.broadcast.emit("userOffline", { userId });
      }
    });
  });
}

module.exports = { initChat, isOnline };