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

/**
 * Normalise les liens produits par le backend vers les routes Expo Router.
 *
 * Backend génère :  "/tournaments/5"  "/games/3"  "/admin"  null
 * Expo Router :     "/tournament/5"   "/game/3"   null      → pas de nav
 */
function resolveLink(link: string | null | undefined): string | null {
  if (!link) return null;

  // /tournaments/:id  → /tournament/:id
  const tMatch = link.match(/^\/tournaments\/(\d+)/);
  if (tMatch) return `/tournament/${tMatch[1]}`;

  // /games/:id  → /game/:id
  const gMatch = link.match(/^\/games\/(\d+)/);
  if (gMatch) return `/game/${gMatch[1]}`;

  // /profile/:id
  const pMatch = link.match(/^\/profile\/(\d+)/);
  if (pMatch) return `/profile/${pMatch[1]}`;

  // /chat/:id
  const cMatch = link.match(/^\/chat\/(\d+)/);
  if (cMatch) return `/chat/${cMatch[1]}`;

  // /admin  → on n'a pas cette page côté mobile, on ignore
  if (link.startsWith("/admin")) return null;

  // Si c'est déjà un path Expo valide connu, on le passe tel quel
  const knownPrefixes = ["/tournament/", "/game/", "/profile/", "/chat/", "/notifications"];
  if (knownPrefixes.some((p) => link.startsWith(p))) return link;

  return null;
}

export default function NotificationsScreen() {
  const [notifs, setNotifs]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await getNotificationsApi();
      setNotifs(res.data?.notifications || res.data || []);
    } catch { setNotifs([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const handlePress = async (n: any) => {
    // 1. Marquer comme lu
    try { await markNotifReadApi(n.id); } catch {}
    setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));

    // 2. Naviguer si un lien valide existe
    const dest = resolveLink(n.link);
    if (dest) {
      router.push(dest as any);
    }
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={C.purple}
            />
          }
        >
          {notifs.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>🔔</Text>
              <Text style={s.emptyTitle}>Aucune notification</Text>
              <Text style={s.emptySub}>
                Tu seras notifié des tournois, paiements et résultats ici
              </Text>
            </View>
          ) : notifs.map((n) => {
            const dest = resolveLink(n.link);
            const isClickable = !!dest;
            return (
              <TouchableOpacity
                key={n.id}
                onPress={() => handlePress(n)}
                activeOpacity={isClickable ? 0.8 : 0.95}
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
                    <View style={s.notifFooter}>
                      <Text style={s.notifTime}>{fromNow(n.created_at)}</Text>
                      {isClickable && !n.is_read && (
                        <Text style={s.tapHint}>Appuie pour voir →</Text>
                      )}
                    </View>
                  </View>
                  {!n.is_read && <View style={s.unreadDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
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
  notifFooter:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  notifTime:  { color: C.grayDark, fontSize: 11 },
  tapHint:    { color: C.purple, fontSize: 10, fontWeight: "600" },
  unreadDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: C.purple, marginTop: 4 },
  empty:      { alignItems: "center", paddingVertical: 80 },
  emptyTitle: { color: C.white, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptySub:   { color: C.gray, fontSize: 13, textAlign: "center", lineHeight: 20 },
});