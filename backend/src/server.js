const http = require("http");
const { Server } = require("socket.io");
const { app } = require("./app");
const { env } = require("./config/env");
const { initChat } = require("./modules/chat/chat.socket");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

initChat(io);

server.listen(env.PORT, () => {
  console.log(`[JGAME] API listening on port ${env.PORT}`);
});