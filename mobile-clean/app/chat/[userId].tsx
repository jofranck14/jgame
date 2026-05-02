import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { C } from "../../src/theme/colors";
import { useAuthStore } from "../../src/store/authStore";
import api, { BASE_URL } from "../../src/api/api";
import { io, Socket } from "socket.io-client";

interface Msg {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  created_at: string;
}

export default function ChatScreen() {
  const { userId }              = useLocalSearchParams<{ userId: string }>();
  const { user: me }            = useAuthStore();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText]         = useState("");
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [otherUser, setOther]   = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const socketRef               = useRef<Socket | null>(null);
  const listRef                 = useRef<FlatList>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [histRes, userRes] = await Promise.all([
          api.get(`/chat/${userId}`),
          api.get(`/users/${userId}`),
        ]);
        setMessages(histRes.data?.messages || histRes.data || []);
        setOther(userRes.data?.user || userRes.data);
      } catch (e) {
        console.error("Chat load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Connexion Socket.io
    const socketUrl = BASE_URL.replace("/api/v1", "");
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("joinConversation", {
        userId:      me?.id,
        otherUserId: Number(userId),
      });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("receiveMessage", (msg: Msg) => {
      setMessages((prev) => {
        // Éviter les doublons
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
    });

    socket.on("connect_error", (err) => {
      console.log("Socket error:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, me?.id]);

// Dans sendMsg, remplace le fallback HTTP par un envoi optimiste
const sendMsg = async () => {
  const trimmed = text.trim();
  if (!trimmed || sending) return;
  setSending(true);
  setText("");

  // Message optimiste côté client
  const tempMsg: Msg = {
    id: Date.now(), // ID temporaire
    sender_id: me?.id || 0,
    receiver_id: Number(userId),
    message: trimmed,
    created_at: new Date().toISOString(),
  };

  setMessages((prev) => [...prev, tempMsg]);
  scrollToBottom();

  try {
    if (socketRef.current?.connected) {
      socketRef.current.emit("sendMessage", {
        senderId:   me?.id,
        receiverId: Number(userId),
        message:    trimmed,
      });
    } else {
      // Socket déconnecté — réessayer la connexion
      Alert.alert(
        "Connexion perdue",
        "Le chat n'est pas connecté. Vérifie que le backend tourne sur 192.168.43.66:5000",
        [{ text: "OK" }]
      );
      // Retirer le message optimiste
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setText(trimmed);
    }
  } catch {
    setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
    setText(trimmed);
  } finally {
    setSending(false);
  }
};

  const renderMsg = ({ item }: { item: Msg }) => {
    const isMe = item.sender_id === me?.id;
    return (
      <View style={[s.msgRow, isMe && s.msgRowMe]}>
        {!isMe && (
          <View style={s.msgAvatar}>
            <Text style={s.msgAvatarTxt}>
              {otherUser?.username?.[0]?.toUpperCase() || "?"}
            </Text>
          </View>
        )}
        <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
          <Text style={[s.bubbleTxt, isMe && { color: "#fff" }]}>{item.message}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>
        <View style={s.headerAvatar}>
          <Text style={s.headerAvatarTxt}>
            {otherUser?.username?.[0]?.toUpperCase() || "?"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>{otherUser?.username || `Joueur #${userId}`}</Text>
          <Text style={s.headerSub}>
            {connected ? "🟢 Connecté" : "⚪ Hors ligne"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push(`/profile/${userId}`)}>
          <Text style={s.profileLink}>Profil</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={C.purple} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m, i) => `msg-${m.id}-${i}`}
            renderItem={renderMsg}
            contentContainerStyle={s.msgList}
            onContentSizeChange={scrollToBottom}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>💬</Text>
                <Text style={s.emptyTxt}>Commence la conversation !</Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Écris un message..."
            placeholderTextColor={C.grayDark}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMsg}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
            onPress={sendMsg}
            disabled={!text.trim() || sending}
            activeOpacity={0.7}
          >
            <Text style={s.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: C.bg },
  header:          { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderColor: C.border },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bgCard, justifyContent: "center", alignItems: "center" },
  backTxt:         { color: C.purple, fontSize: 18, fontWeight: "700" },
  headerAvatar:    { width: 38, height: 38, borderRadius: 19, backgroundColor: C.purple, justifyContent: "center", alignItems: "center" },
  headerAvatarTxt: { color: "#fff", fontWeight: "800", fontSize: 14 },
  headerName:      { color: C.white, fontWeight: "700", fontSize: 15 },
  headerSub:       { color: C.gray, fontSize: 11, marginTop: 1 },
  profileLink:     { color: C.purple, fontSize: 13, fontWeight: "600" },
  center:          { flex: 1, justifyContent: "center", alignItems: "center" },
  msgList:         { padding: 16, flexGrow: 1 },
  msgRow:          { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 10 },
  msgRowMe:        { flexDirection: "row-reverse" },
  msgAvatar:       { width: 28, height: 28, borderRadius: 14, backgroundColor: C.purple, justifyContent: "center", alignItems: "center" },
  msgAvatarTxt:    { color: "#fff", fontWeight: "700", fontSize: 11 },
  bubble:          { maxWidth: "75%", borderRadius: 16, padding: 10, paddingHorizontal: 14 },
  bubbleOther:     { backgroundColor: C.bgCard, borderBottomLeftRadius: 4 },
  bubbleMe:        { backgroundColor: C.purple, borderBottomRightRadius: 4 },
  bubbleTxt:       { color: C.white, fontSize: 14, lineHeight: 20 },
  inputRow:        { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, paddingTop: 8, borderTopWidth: 0.5, borderColor: C.border, backgroundColor: C.bgCard },
  input:           { flex: 1, backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: C.white, fontSize: 14, maxHeight: 100, borderWidth: 0.5, borderColor: C.border },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: C.purple, justifyContent: "center", alignItems: "center" },
  sendIcon:        { color: "#fff", fontSize: 16 },
  empty:           { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyTxt:        { color: C.gray, fontSize: 15 },
});