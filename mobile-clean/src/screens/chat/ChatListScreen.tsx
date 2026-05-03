import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../../store/authStore";
import { ProfileStackParamList } from "../../navigation/types";
import api, { BASE_URL } from "../../api/api";
import { fromNow } from "../../utils/formatDate";
import { C } from "../../theme/colors";

type Nav = NativeStackNavigationProp<ProfileStackParamList>;
const SERVER = BASE_URL.replace("/api/v1", "");

interface UserItem {
  id: number;
  username: string;
  lastMessage?: string;
  lastAt?: string;
}

// Socket partagé au niveau module
let _socket: Socket | null = null;
function getSocket(token: string): Socket {
  if (!_socket || !_socket.connected) {
    _socket = io(SERVER, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
  }
  return _socket;
}

export default function ChatListScreen() {
  const navigation = useNavigation<Nav>();
  const { user, token } = useAuthStore();
  const [users, setUsers]           = useState<UserItem[]>([]);
  const [onlineIds, setOnlineIds]   = useState<Set<number>>(new Set());
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Socket : présence
  useEffect(() => {
    if (!token) return;
    const sock = getSocket(token);

    sock.on("onlineList", ({ users: ids }: { users: number[] }) => {
      setOnlineIds(new Set(ids.map(Number)));
    });
    sock.on("userOnline",  ({ userId }: { userId: number }) =>
      setOnlineIds((p) => new Set([...p, Number(userId)])));
    sock.on("userOffline", ({ userId }: { userId: number }) =>
      setOnlineIds((p) => { const s = new Set(p); s.delete(Number(userId)); return s; }));

    return () => {
      sock.off("onlineList");
      sock.off("userOnline");
      sock.off("userOffline");
    };
  }, [token]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/users");
      const all: UserItem[] = (res.data?.users || []).filter(
        (u: UserItem) => u.id !== user?.id
      );
      setUsers(all);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: UserItem }) => {
    const online = onlineIds.has(item.id);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate("Chat", { userId: item.id, username: item.username })}
        activeOpacity={0.75}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.username[0]?.toUpperCase()}</Text>
          </View>
          <View style={[styles.dot, { backgroundColor: online ? C.green : C.grayDark }]} />
        </View>
        <View style={styles.info}>
          <View style={styles.infoTop}>
            <Text style={styles.username}>{item.username}</Text>
            {item.lastAt && <Text style={styles.time}>{fromNow(item.lastAt)}</Text>}
          </View>
          <Text style={styles.sub} numberOfLines={1}>
            {online ? "En ligne" : item.lastMessage ?? "Démarrer une conversation"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.onlineCount}>{onlineIds.size} en ligne</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Rechercher un joueur..."
          placeholderTextColor={C.grayDark}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.purple} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={C.purple}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>Aucun joueur trouvé</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  center:      { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  header:      { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 52,
                 borderBottomWidth: 1, borderColor: C.border },
  back:        { marginRight: 10, padding: 4 },
  backText:    { color: C.purple, fontSize: 22, fontWeight: "700" },
  headerTitle: { flex: 1, color: C.white, fontSize: 18, fontWeight: "700" },
  onlineCount: { color: C.green, fontSize: 12 },
  searchWrap:  { padding: 12 },
  search:      { backgroundColor: C.bgCard, borderRadius: 12, padding: 12, color: C.white,
                 fontSize: 14, borderWidth: 1, borderColor: C.border },
  row:         { flexDirection: "row", alignItems: "center", padding: 14,
                 borderBottomWidth: 1, borderColor: C.border },
  avatarWrap:  { position: "relative", marginRight: 12 },
  avatar:      { width: 46, height: 46, borderRadius: 23, backgroundColor: C.purple,
                 justifyContent: "center", alignItems: "center" },
  avatarText:  { color: "#fff", fontSize: 18, fontWeight: "700" },
  dot:         { position: "absolute", bottom: 1, right: 1, width: 12, height: 12,
                 borderRadius: 6, borderWidth: 2, borderColor: C.bg },
  info:        { flex: 1 },
  infoTop:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  username:    { color: C.white, fontWeight: "600", fontSize: 15 },
  time:        { color: C.grayDark, fontSize: 11 },
  sub:         { color: C.gray, fontSize: 12 },
  empty:       { color: C.gray, fontSize: 14 },
});