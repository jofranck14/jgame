import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import Card from "../components/ui/Card";
import { useAuthStore } from "../features/auth/authStore";
import { connectSocket } from "../features/chat/socket";
import api from "../services/api";
import { formatDateTime } from "../utils/formatDate";

export default function Chat() {
  const { userId }       = useParams();
  const { user: me }     = useAuthStore();

  const [messages, setMessages]     = useState([]);
  const [otherUser, setOtherUser]   = useState(null);
  const [text, setText]             = useState("");
  const [loading, setLoading]       = useState(true);
  const bottomRef                   = useRef(null);
  const socketRef                   = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Charger infos de l'autre utilisateur
        const uRes = await api.get(`/users/${userId}`);
        setOtherUser(uRes.data?.user || uRes.data);

        // Charger historique
        const mRes = await api.get(`/chat/${userId}`);
        setMessages(mRes.data?.messages || []);
      } catch {
        toast.error("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    init();

    // Socket
    const socket = connectSocket();
    socketRef.current = socket;

    socket.emit("joinConversation", { other_user_id: Number(userId) });

    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, [userId]);

  // Scroll automatique vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed || !socketRef.current) return;

    socketRef.current.emit("sendMessage", {
      receiver_id: Number(userId),
      message: trimmed,
    });

    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="h-96 bg-slate-800/50 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-6 w-full flex-1 flex flex-col gap-4">

        {/* Header conversation */}
        <Card className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
            {otherUser?.username?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-white font-semibold">{otherUser?.username || "Utilisateur"}</p>
            <p className="text-slate-400 text-xs">💬 Conversation privée</p>
          </div>
        </Card>

        {/* Zone messages */}
        <Card className="flex-1 flex flex-col" style={{ minHeight: "400px" }}>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ maxHeight: "500px" }}>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full py-16">
                <div className="text-center">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="text-slate-400 text-sm">Aucun message pour l'instant</p>
                  <p className="text-slate-500 text-xs mt-1">Commence la conversation !</p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = String(msg.sender_id) === String(me?.id);
                return (
                  <motion.div
                    key={msg.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-xs md:max-w-md ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? "text-white rounded-br-sm"
                          : "bg-slate-700 text-slate-100 rounded-bl-sm"
                      }`}
                        style={isMe ? { background: "linear-gradient(135deg, #7C3AED, #06B6D4)" } : {}}
                      >
                        {msg.message}
                      </div>
                      <p className="text-slate-500 text-xs px-1">
                        {formatDateTime(msg.created_at)}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
        </Card>

        {/* Zone saisie */}
        <div className="flex gap-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écris un message..."
            className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim()}
            className="px-5 py-3 rounded-xl text-white font-semibold disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }}
          >
            ➤
          </button>
        </div>

      </div>
    </div>
  );
}