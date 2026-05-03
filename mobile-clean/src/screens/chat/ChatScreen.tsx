// import React, { useCallback, useEffect, useRef, useState } from "react";
// import {
//   View, Text, FlatList, TextInput, TouchableOpacity,
//   StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
// } from "react-native";
// import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
// import { io, Socket } from "socket.io-client";
// import { useAuthStore } from "../../store/authStore";
// import { ProfileStackParamList } from "../../navigation/types";
// import api, { BASE_URL } from "../../api/api";
// import { fromNow } from "../../utils/formatDate";
// import { C } from "../../theme/colors";

// type RouteP = RouteProp<ProfileStackParamList, "Chat">;
// const SERVER = BASE_URL.replace("/api/v1", "");

// interface Message {
//   id: number;
//   sender_id: number;
//   receiver_id: number;
//   message: string;
//   created_at: string;
// }

// let _socket: Socket | null = null;
// function getSocket(token: string): Socket {
//   if (!_socket || !_socket.connected) {
//     _socket = io(SERVER, {
//       auth: { token },
//       transports: ["websocket"],
//       reconnectionAttempts: 5,
//     });
//   }
//   return _socket;
// }

// // Fusionne deux listes sans doublons (clé = id)
// function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
//   const map = new Map<number, Message>();
//   for (const m of existing) map.set(m.id, m);
//   for (const m of incoming)  map.set(m.id, m);
//   return Array.from(map.values()).sort(
//     (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
//   );
// }

// export default function ChatScreen() {
//   const route      = useRoute<RouteP>();
//   const navigation = useNavigation();
//   const { user, token } = useAuthStore();
//   const { userId: otherId, username: otherName } = route.params;

//   const [messages, setMessages] = useState<Message[]>([]);
//   const [text, setText]         = useState("");
//   const [loading, setLoading]   = useState(true);
//   const [online, setOnline]     = useState(false);
//   const flatRef = useRef<FlatList>(null);
//   const myId    = user?.id ?? 0;

//   // ── Socket ──────────────────────────────────────────────
//   useEffect(() => {
//     if (!token) return;
//     const sock = getSocket(token);

//     sock.emit("joinConversation", { other_user_id: otherId });
//     sock.emit("checkStatus", { userId: otherId });

//     const onStatus = ({ userId, online: on }: { userId: number; online: boolean }) => {
//       if (Number(userId) === Number(otherId)) setOnline(on);
//     };
//     const onOnline  = ({ userId }: { userId: number }) => {
//       if (Number(userId) === Number(otherId)) setOnline(true);
//     };
//     const onOffline = ({ userId }: { userId: number }) => {
//       if (Number(userId) === Number(otherId)) setOnline(false);
//     };
//     const onMessage = (msg: Message) => {
//       const relevant =
//         (Number(msg.sender_id) === Number(otherId) && Number(msg.receiver_id) === myId) ||
//         (Number(msg.sender_id) === myId && Number(msg.receiver_id) === Number(otherId));
//       if (!relevant) return;
//       // mergeMessages évite les doublons (clé = id)
//       setMessages((prev) => mergeMessages(prev, [msg]));
//       setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
//     };

//     sock.on("userStatus",    onStatus);
//     sock.on("userOnline",    onOnline);
//     sock.on("userOffline",   onOffline);
//     sock.on("receiveMessage", onMessage);

//     return () => {
//       sock.off("userStatus",    onStatus);
//       sock.off("userOnline",    onOnline);
//       sock.off("userOffline",   onOffline);
//       sock.off("receiveMessage", onMessage);
//     };
//   }, [token, otherId, myId]);

//   // ── Historique ──────────────────────────────────────────
//   const loadHistory = useCallback(async () => {
//     try {
//       const res = await api.get(`/chat/${otherId}`);
//       const hist: Message[] = res.data?.messages || [];
//       setMessages(hist);
//       setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
//     } catch {}
//     finally { setLoading(false); }
//   }, [otherId]);

//   useEffect(() => { loadHistory(); }, [loadHistory]);

//   // ── Envoi ────────────────────────────────────────────────
//   const send = () => {
//     const trimmed = text.trim();
//     if (!trimmed) return;
//     const sock = _socket;
//     if (!sock) return;
//     setText("");
//     sock.emit("sendMessage", { receiver_id: otherId, message: trimmed });
//   };

//   // ── Rendu message ─────────────────────────────────────────
//   const renderItem = ({ item }: { item: Message }) => {
//     const isMe = Number(item.sender_id) === myId;
//     return (
//       <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
//         {!isMe && (
//           <View style={styles.smallAvatar}>
//             <Text style={styles.smallAvatarText}>{otherName[0]?.toUpperCase()}</Text>
//           </View>
//         )}
//         <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
//           <Text style={[styles.msgText, isMe && { color: "#fff" }]}>{item.message}</Text>
//           <Text style={styles.msgTime}>{fromNow(item.created_at)}</Text>
//         </View>
//       </View>
//     );
//   };

//   return (
//     <KeyboardAvoidingView
//       style={styles.root}
//       behavior={Platform.OS === "ios" ? "padding" : "height"}
//       keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
//     >
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
//           <Text style={styles.backText}>←</Text>
//         </TouchableOpacity>
//         <View style={styles.headerAvatar}>
//           <Text style={styles.headerAvatarText}>{otherName[0]?.toUpperCase()}</Text>
//         </View>
//         <View>
//           <Text style={styles.headerName}>{otherName}</Text>
//           <View style={styles.statusRow}>
//             <View style={[styles.statusDot, { backgroundColor: online ? C.green : C.grayDark }]} />
//             <Text style={[styles.statusLabel, { color: online ? C.green : C.grayDark }]}>
//               {online ? "En ligne" : "Hors ligne"}
//             </Text>
//           </View>
//         </View>
//       </View>

//       {/* Messages */}
//       {loading ? (
//         <View style={styles.center}><ActivityIndicator color={C.purple} /></View>
//       ) : (
//         <FlatList
//           ref={flatRef}
//           data={messages}
//           // ← Clé unique : id (jamais de doublon possible)
//           keyExtractor={(item) => String(item.id)}
//           renderItem={renderItem}
//           contentContainerStyle={styles.msgList}
//           onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
//           ListEmptyComponent={
//             <View style={styles.center}>
//               <Text style={styles.emptyText}>Commencez la conversation 👋</Text>
//             </View>
//           }
//         />
//       )}

//       {/* Saisie */}
//       <View style={styles.inputRow}>
//         <TextInput
//           style={styles.input}
//           placeholder="Message..."
//           placeholderTextColor={C.grayDark}
//           value={text}
//           onChangeText={setText}
//           multiline
//           maxLength={500}
//           returnKeyType="send"
//           onSubmitEditing={send}
//           blurOnSubmit={false}
//         />
//         <TouchableOpacity
//           style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]}
//           onPress={send}
//           disabled={!text.trim()}
//         >
//           <Text style={styles.sendIcon}>➤</Text>
//         </TouchableOpacity>
//       </View>
//     </KeyboardAvoidingView>
//   );
// }

// const styles = StyleSheet.create({
//   root:             { flex: 1, backgroundColor: C.bg },
//   center:           { flex: 1, justifyContent: "center", alignItems: "center" },
//   header:           { flexDirection: "row", alignItems: "center", padding: 14, paddingTop: 52,
//                       backgroundColor: C.bgCard, borderBottomWidth: 1, borderColor: C.border, gap: 10 },
//   back:             { padding: 4 },
//   backText:         { color: C.purple, fontSize: 22, fontWeight: "700" },
//   headerAvatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: C.purple,
//                       justifyContent: "center", alignItems: "center" },
//   headerAvatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
//   headerName:       { color: C.white, fontWeight: "700", fontSize: 15 },
//   statusRow:        { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
//   statusDot:        { width: 8, height: 8, borderRadius: 4 },
//   statusLabel:      { fontSize: 11 },
//   msgList:          { padding: 14, paddingBottom: 4 },
//   msgRow:           { flexDirection: "row", marginBottom: 10, alignItems: "flex-end" },
//   msgRowMe:         { flexDirection: "row-reverse" },
//   smallAvatar:      { width: 28, height: 28, borderRadius: 14, backgroundColor: C.grayDark,
//                       justifyContent: "center", alignItems: "center", marginRight: 6 },
//   smallAvatarText:  { color: "#fff", fontSize: 12, fontWeight: "700" },
//   bubble:           { maxWidth: "75%", borderRadius: 16, padding: 10, paddingHorizontal: 14 },
//   bubbleMe:         { backgroundColor: C.purple, borderBottomRightRadius: 4 },
//   bubbleOther:      { backgroundColor: C.bgCard, borderBottomLeftRadius: 4,
//                       borderWidth: 1, borderColor: C.border },
//   msgText:          { color: C.white, fontSize: 14, lineHeight: 20 },
//   msgTime:          { color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 4, textAlign: "right" },
//   inputRow:         { flexDirection: "row", alignItems: "flex-end", padding: 10,
//                       borderTopWidth: 1, borderColor: C.border, backgroundColor: C.bgCard },
//   input:            { flex: 1, backgroundColor: C.bg, borderRadius: 20, padding: 12,
//                       paddingHorizontal: 16, color: C.white, fontSize: 14, maxHeight: 100,
//                       borderWidth: 1, borderColor: C.border },
//   sendBtn:          { width: 42, height: 42, borderRadius: 21, backgroundColor: C.purple,
//                       justifyContent: "center", alignItems: "center", marginLeft: 8 },
//   sendIcon:         { color: "#fff", fontSize: 16 },
//   emptyText:        { color: C.gray, fontSize: 13 },
// });