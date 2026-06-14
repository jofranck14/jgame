import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { C } from "../../src/theme/colors";
import { useAuthStore } from "../../src/store/authStore";
import api, { BASE_URL } from "../../src/api/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const otherId                 = Number(userId);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText]         = useState("");
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [otherUser, setOther]   = useState<any>(null);
  const [online, setOnline]     = useState(false);

  const socketRef    = useRef<Socket | null>(null);
  const listRef      = useRef<FlatList>(null);
  const seenIds      = useRef<Set<number>>(new Set());

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  // Ajoute un message sans doublon
  const addMessage = useCallback((msg: Msg) => {
    if (seenIds.current.has(msg.id)) return;
    seenIds.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
    scrollToBottom();
  }, [scrollToBottom]);

  // ── Charger historique + infos user ──────────────────
 useFocusEffect(
  useCallback(() => {
    let mounted = true;
    seenIds.current.clear(); // ← Vide les IDs vus pour éviter les doublons

    const load = async () => {
      setLoading(true);
      try {
        const [histRes, userRes] = await Promise.all([
          api.get(`/chat/${otherId}`),
          api.get(`/users/${otherId}`),
        ]);
        if (!mounted) return;
        const msgs: Msg[] = histRes.data?.messages || histRes.data || [];
        msgs.forEach((m) => seenIds.current.add(m.id));
        setMessages(msgs);
        setOther(userRes.data?.user || userRes.data);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 200);
      } catch (e) {
        console.error("Chat load error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [otherId])
);

  // ── Socket.io ─────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const socketUrl = BASE_URL.replace("/api/v1", "");

    const connect = async () => {
      // Récupérer le token depuis AsyncStorage
      const token = await AsyncStorage.getItem("jgame_token");

      const socket = io(socketUrl, {
        // ← Token passé dans auth (lu par le middleware backend)
        auth:        { token: token ?? "" },
        transports:  ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay:    1000,
        timeout:     15000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        if (!mounted) return;
        // Rejoindre la room de conversation
        socket.emit("joinConversation", { other_user_id: otherId });
        // Demander le statut de l'autre user
        socket.emit("checkStatus", { userId: otherId });
      });

      socket.on("userStatus", ({ userId: uid, online: on }: any) => {
        if (Number(uid) === otherId && mounted) setOnline(on);
      });
      socket.on("userOnline", ({ userId: uid }: any) => {
        if (Number(uid) === otherId && mounted) setOnline(true);
      });
      socket.on("userOffline", ({ userId: uid }: any) => {
        if (Number(uid) === otherId && mounted) setOnline(false);
      });

      socket.on("receiveMessage", (msg: Msg) => {
        if (!mounted) return;
        const isRelevant =
          (msg.sender_id === me?.id   && msg.receiver_id === otherId) ||
          (msg.sender_id === otherId  && msg.receiver_id === me?.id);
        if (isRelevant) addMessage(msg);
      });

      socket.on("connect_error", (err) => {
        console.warn("Socket error:", err.message);
      });
    };

    connect();

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [otherId, me?.id, addMessage]);

  // ── Envoyer un message ────────────────────────────────
  const sendMsg = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");

    try {
      if (socketRef.current?.connected) {
        // ← Champs corrects attendus par le backend
        socketRef.current.emit("sendMessage", {
          receiver_id: otherId,
          message:     trimmed,
        });
      } else {
        // Fallback HTTP — POST /chat/send n'existe pas,
        // on passe par un message optimiste et on relance le socket
        Alert.alert(
          "Connexion perdue",
          "Le socket est déconnecté. Vérifie ta connexion et réessaie.",
        );
        setText(trimmed);
      }
    } catch (err: any) {
      console.error("Send error:", err);
      setText(trimmed);
      Alert.alert("Erreur", "Impossible d'envoyer le message.");
    } finally {
      setSending(false);
    }
  };

  // ── Rendu d'un message ────────────────────────────────
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
          <Text style={[s.bubbleTxt, isMe && { color: "#fff" }]}>
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>

        <View style={s.headerAvatar}>
          <Text style={s.headerAvatarTxt}>
            {otherUser?.username?.[0]?.toUpperCase() || "?"}
          </Text>
          <View style={[s.onlineDot, { backgroundColor: online ? C.green : C.grayDark }]} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>{otherUser?.username || `Joueur #${userId}`}</Text>
          <Text style={[s.headerSub, { color: online ? C.green : C.gray }]}>
            {online ? "🟢 En ligne" : "⚪ Hors ligne"}
          </Text>
        </View>

        <TouchableOpacity onPress={() => router.push(`/profile/${userId}`)}>
          <Text style={s.profileLink}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* ── Corps ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={C.purple} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            // ← Clé unique = id → jamais de doublon key="11"
            keyExtractor={(m) => String(m.id)}
            renderItem={renderMsg}
            contentContainerStyle={[
              s.msgList,
              messages.length === 0 && { flex: 1 },
            ]}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{ fontSize: 44, marginBottom: 12 }}>💬</Text>
                <Text style={s.emptyTxt}>Aucun message pour l'instant</Text>
                <Text style={{ color: C.grayDark, fontSize: 12, marginTop: 4 }}>
                  Commence la conversation !
                </Text>
              </View>
            }
          />
        )}

        {/* ── Saisie ── */}
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
            blurOnSubmit={false}
            onSubmitEditing={sendMsg}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnOff]}
            onPress={sendMsg}
            disabled={!text.trim() || sending}
            activeOpacity={0.75}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.sendIcon}>➤</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: C.bg },
  header:          { flexDirection: "row", alignItems: "center", gap: 10,
                     paddingHorizontal: 16, paddingVertical: 12,
                     borderBottomWidth: 0.5, borderColor: C.border },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bgCard,
                     justifyContent: "center", alignItems: "center" },
  backTxt:         { color: C.purple, fontSize: 18, fontWeight: "700" },
  headerAvatar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: C.purple,
                     justifyContent: "center", alignItems: "center", position: "relative" },
  headerAvatarTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
  onlineDot:       { position: "absolute", bottom: 0, right: 0, width: 11, height: 11,
                     borderRadius: 6, borderWidth: 2, borderColor: C.bg },
  headerName:      { color: C.white, fontWeight: "700", fontSize: 15 },
  headerSub:       { fontSize: 11, marginTop: 1 },
  profileLink:     { color: C.purple, fontSize: 13, fontWeight: "600" },
  center:          { flex: 1, justifyContent: "center", alignItems: "center" },
  msgList:         { padding: 16, paddingBottom: 8 },
  msgRow:          { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 10 },
  msgRowMe:        { flexDirection: "row-reverse" },
  msgAvatar:       { width: 30, height: 30, borderRadius: 15, backgroundColor: C.purple,
                     justifyContent: "center", alignItems: "center" },
  msgAvatarTxt:    { color: "#fff", fontWeight: "700", fontSize: 11 },
  bubble:          { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOther:     { backgroundColor: C.bgCard, borderBottomLeftRadius: 4 },
  bubbleMe:        { backgroundColor: C.purple, borderBottomRightRadius: 4 },
  bubbleTxt:       { color: C.white, fontSize: 14, lineHeight: 20 },
  inputRow:        { flexDirection: "row", alignItems: "flex-end", gap: 10,
                     paddingHorizontal: 12, paddingVertical: 10,
                     borderTopWidth: 0.5, borderColor: C.border, backgroundColor: C.bgCard },
  input:           { flex: 1, backgroundColor: C.bg, borderRadius: 22,
                     paddingHorizontal: 16, paddingVertical: 10, color: C.white,
                     fontSize: 14, maxHeight: 100, borderWidth: 0.5, borderColor: C.border },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: C.purple,
                     justifyContent: "center", alignItems: "center" },
  sendBtnOff:      { opacity: 0.35 },
  sendIcon:        { color: "#fff", fontSize: 16 },
  empty:           { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 60 },
  emptyTxt:        { color: C.gray, fontSize: 16, fontWeight: "600" },
});