const jwt = require("jsonwebtoken");
const { env } = require("../../config/env");
const chatService = require("./chat.service");

function initChat(io) {
  // Middleware auth Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error("Missing token"));

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user?.id;

    // Rejoindre une room privée (conversation 1-1)
    socket.on("joinRoom", ({ room_id }) => {
      if (!room_id) return;
      socket.join(String(room_id));
    });

    // Envoyer un message privé
    socket.on("sendMessage", async ({ receiver_id, message }) => {
      if (!receiver_id || !message) return;

      try {
        const saved = await chatService.saveMessage({
          sender_id: userId,
          receiver_id,
          message: String(message).trim(),
        });

        // Room unique entre deux users (toujours même ordre)
        const room_id = [userId, receiver_id].sort((a, b) => a - b).join("_");

        io.to(room_id).emit("receiveMessage", saved);
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // Rejoindre la room de conversation avec un autre user
    socket.on("joinConversation", ({ other_user_id }) => {
      if (!other_user_id) return;
      const room_id = [userId, other_user_id].sort((a, b) => a - b).join("_");
      socket.join(room_id);
    });

    socket.on("disconnect", () => {});
  });
}

module.exports = { initChat };