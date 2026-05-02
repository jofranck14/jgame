import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { C } from "../src/theme/colors";
import Card from "../src/components/ui/Card";
import { getNotificationsApi, markNotifReadApi, markAllReadApi } from "../src/api/tournamentApi";
import { fromNow } from "../src/utils/formatDate";

const ICONS: Record<string, string> = {
  tournament: "🏆",
  payment:    "💳",
  result:     "🎯",
  report:     "🚨",
  system:     "📢",
};

export default function NotificationsScreen() {
  const [notifs, setNotifs]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await getNotificationsApi();
      setNotifs(res.data?.notifications || res.data || []);
    } catch { setNotifs([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    try {
      await markNotifReadApi(id);
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const markAll = async () => {
    try {
      await markAllReadApi();
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const unread = notifs.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>
            🔔 Notifications{unread > 0 ? ` (${unread})` : ""}
          </Text>
          <Text style={s.sub}>
            {unread > 0 ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est à jour ✓"}
          </Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={markAll}>
            <Text style={s.markAll}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={C.purple} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.purple} />}
        >
          {notifs.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>🔔</Text>
              <Text style={s.emptyTitle}>Aucune notification</Text>
              <Text style={s.emptySub}>Tu seras notifié des tournois, paiements et résultats ici</Text>
            </View>
          ) : notifs.map((n) => (
            <TouchableOpacity
              key={n.id}
              onPress={() => { markRead(n.id); if (n.link) router.push(n.link); }}
              activeOpacity={0.8}
            >
              <View style={[s.notifRow, n.is_read && s.notifRead]}>
                <View style={s.notifIcon}>
                  <Text style={{ fontSize: 22 }}>{ICONS[n.type] || "📢"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.notifTitle, n.is_read && { color: C.gray }]}>
                    {n.title || n.message}
                  </Text>
                  {n.title && n.message && (
                    <Text style={s.notifMsg} numberOfLines={2}>{n.message}</Text>
                  )}
                  <Text style={s.notifTime}>{fromNow(n.created_at)}</Text>
                </View>
                {!n.is_read && <View style={s.unreadDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },
  header:     { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingBottom: 12 },
  backBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bgCard, justifyContent: "center", alignItems: "center", borderWidth: 0.5, borderColor: C.border },
  backText:   { color: C.purple, fontSize: 18, fontWeight: "700" },
  title:      { fontSize: 18, fontWeight: "800", color: C.white },
  sub:        { fontSize: 12, color: C.gray, marginTop: 1 },
  markAll:    { color: C.purple, fontSize: 13, fontWeight: "600" },
  content:    { padding: 16 },
  notifRow:   { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, backgroundColor: C.bgCard, borderRadius: 14, marginBottom: 8, borderWidth: 0.5, borderColor: C.border },
  notifRead:  { opacity: 0.55 },
  notifIcon:  { width: 44, height: 44, borderRadius: 22, backgroundColor: C.purpleFade, justifyContent: "center", alignItems: "center" },
  notifTitle: { color: C.white, fontWeight: "600", fontSize: 14, marginBottom: 3 },
  notifMsg:   { color: C.gray, fontSize: 12, lineHeight: 17, marginBottom: 4 },
  notifTime:  { color: C.grayDark, fontSize: 11 },
  unreadDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: C.purple, marginTop: 4 },
  empty:      { alignItems: "center", paddingVertical: 80 },
  emptyTitle: { color: C.white, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptySub:   { color: C.gray, fontSize: 13, textAlign: "center", lineHeight: 20 },
});