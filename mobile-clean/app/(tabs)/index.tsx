import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  Animated, PanResponder, Modal, FlatList, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { C } from "../../src/theme/colors";
import Card from "../../src/components/ui/Card";
import StatusBadge from "../../src/components/ui/StatusBadge";
import { useAuthStore } from "../../src/store/authStore";
import {
  listTournamentsApi, listGamesApi, getLeaderboardApi,
  getNotificationsApi,
} from "../../src/api/tournamentApi";
import { formatDateTime } from "../../src/utils/formatDate";
import api from "../../src/api/api";

const { width: SW, height: SH } = Dimensions.get("window");
const MAX_T = 4;
const MAX_G = 6;
const MAX_L = 5;

function getLevelKey(pts: number) {
  if (pts >= 200) return { icon: "👑", label: "GOAT",       color: C.purple };
  if (pts >= 100) return { icon: "⭐", label: "Légendaire", color: C.yellow };
  return                  { icon: "🌱", label: "Débutant",  color: C.gray   };
}

/* ── Bouton flottant draggable ── */
function FloatingChatButton({ onPress }: { onPress: () => void }) {
  const pan = useRef(new Animated.ValueXY({ x: SW - 76, y: SH * 0.55 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { moveX: pan.x, moveY: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, g) => {
        // Clamp aux bords de l'écran
        const nx = Math.max(10, Math.min(SW - 66, g.moveX));
        const ny = Math.max(60, Math.min(SH - 120, g.moveY));
        pan.setValue({ x: nx, y: ny });
      },
    })
  ).current;

  return (
    <Animated.View
      style={[fb.btn, { left: pan.x, top: pan.y }]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={fb.inner}>
        <Text style={{ fontSize: 22 }}>💬</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const fb = StyleSheet.create({
  btn:   { position: "absolute", width: 56, height: 56, zIndex: 999 },
  inner: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.purple, justifyContent: "center", alignItems: "center", shadowColor: C.purple, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
});

/* ── Modal liste de conversations ── */
function ConversationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [convs, setConvs]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    api.get("/chat/conversations")
      .then((r) => setConvs(r.data?.conversations || r.data || []))
      .catch(() => setConvs([]))
      .finally(() => setLoading(false));
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={cm.root}>
        <View style={cm.header}>
          <Text style={cm.title}>💬 Mes discussions</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={cm.close}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={cm.center}>
            <ActivityIndicator size="large" color={C.purple} />
          </View>
        ) : convs.length === 0 ? (
          <View style={cm.center}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>💬</Text>
            <Text style={cm.emptyTitle}>Aucune discussion</Text>
            <Text style={cm.emptySub}>Défie un joueur pour commencer à discuter</Text>
          </View>
        ) : (
          <FlatList
            data={convs}
            keyExtractor={(item, i) => `conv-${item.user_id ?? item.id ?? i}`}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={cm.convRow}
                onPress={() => { onClose(); router.push(`/chat/${item.user_id}`); }}
                activeOpacity={0.8}
              >
                <View style={cm.convAvatar}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                    {item.username?.[0]?.toUpperCase() || "?"}
                  </Text>
                  {item.online && <View style={cm.onlineDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={cm.convName}>{item.username}</Text>
                  {item.last_message && (
                    <Text style={cm.convLast} numberOfLines={1}>{item.last_message}</Text>
                  )}
                </View>
                {item.unread > 0 && (
                  <View style={cm.unreadBadge}>
                    <Text style={cm.unreadTxt}>{item.unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const cm = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 0.5, borderColor: C.border },
  title:       { color: C.white, fontSize: 18, fontWeight: "800" },
  close:       { color: C.gray, fontSize: 20, padding: 4 },
  center:      { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyTitle:  { color: C.white, fontSize: 16, fontWeight: "700", marginBottom: 6 },
  emptySub:    { color: C.gray, fontSize: 13, textAlign: "center" },
  convRow:     { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: C.bgCard, borderRadius: 14, marginBottom: 8, borderWidth: 0.5, borderColor: C.border },
  convAvatar:  { width: 46, height: 46, borderRadius: 23, backgroundColor: C.purple, justifyContent: "center", alignItems: "center", position: "relative" },
  onlineDot:   { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: "#22c55e", borderWidth: 2, borderColor: C.bg },
  convName:    { color: C.white, fontWeight: "600", fontSize: 14 },
  convLast:    { color: C.gray, fontSize: 12, marginTop: 2 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.purple, justifyContent: "center", alignItems: "center", paddingHorizontal: 5 },
  unreadTxt:   { color: "#fff", fontSize: 11, fontWeight: "700" },
});

/* ══════════════════════════════════════════════════════ */
export default function HomeScreen() {
  const { user }                      = useAuthStore();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [games, setGames]             = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [chatModal, setChatModal]     = useState(false);

  const load = async () => {
    try {
      const [tRes, gRes, lRes, nRes] = await Promise.all([
        listTournamentsApi(),
        listGamesApi(),
        getLeaderboardApi().catch(() => ({ data: { leaderboard: [] } })),
        getNotificationsApi().catch(() => ({ data: { notifications: [] } })),
      ]);
      setTournaments(tRes.data?.tournaments || tRes.data?.data || []);
      setGames(gRes.data?.games || gRes.data || []);
      const lb = lRes.data?.leaderboard || lRes.data || [];
      setLeaderboard(Array.isArray(lb) ? lb : []);
      const notifs = nRes.data?.notifications || nRes.data || [];
      setUnreadNotifs(notifs.filter((n: any) => !n.is_read).length);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return (
    <SafeAreaView style={[s.root, { justifyContent: "center", alignItems: "center" }]}>
      <ActivityIndicator size="large" color={C.purple} />
    </SafeAreaView>
  );

  const visibleT = tournaments.slice(0, MAX_T);
  const visibleG = games.slice(0, MAX_G);
  const visibleL = leaderboard.slice(0, MAX_L);

  return (
    <SafeAreaView style={s.root}>
      {/* ── Modal discussions ── */}
      <ConversationsModal visible={chatModal} onClose={() => setChatModal(false)} />

      {/* ── Bouton flottant chat ── */}
      <FloatingChatButton onPress={() => setChatModal(true)} />

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        {/* ── TopBar avec cloche notif ── */}
        <View style={s.topBar}>
          <View>
            <Text style={s.greeting}>Bonjour {user?.username} 👋</Text>
            <Text style={s.greetingSub}>Prêt à dominer ?</Text>
          </View>
          <TouchableOpacity
            style={s.notifBtn}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 22 }}>🔔</Text>
            {unreadNotifs > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeTxt}>
                  {unreadNotifs > 99 ? "99+" : unreadNotifs}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroBadge}>
            <Text style={s.heroBadgeText}>⚡ Plateforme Gaming #1 au Cameroun</Text>
          </View>
          <Text style={s.heroTitle}>
            Joue. Compétis.{"\n"}
            <Text style={{ color: C.purple }}>Domine.</Text>
          </Text>
          <Text style={s.heroSub}>
            Rejoins des tournois, affronte des joueurs locaux et grimpe dans le classement.
          </Text>
          <TouchableOpacity style={s.heroBtn} onPress={() => router.push("/(tabs)/tournaments")} activeOpacity={0.8}>
            <Text style={s.heroBtnText}>Voir tous les tournois →</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { icon: "🏆", label: "Tournois", value: tournaments.length },
            { icon: "🎮", label: "Jeux",     value: games.length },
            { icon: "👥", label: "Joueurs",  value: leaderboard.length },
          ].map((st) => (
            <Card key={st.label} style={s.statCard}>
              <Text style={s.statIcon}>{st.icon}</Text>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </Card>
          ))}
        </View>

        {/* Tournois récents */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>🏆 Tournois récents</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/tournaments")}>
              <Text style={s.seeAll}>Voir tous ({tournaments.length})</Text>
            </TouchableOpacity>
          </View>

          {visibleT.length === 0 ? (
            <Card><Text style={s.empty}>Aucun tournoi disponible</Text></Card>
          ) : visibleT.map((t) => (
            <TouchableOpacity key={t.id} onPress={() => router.push(`/tournament/${t.id}`)} activeOpacity={0.85}>
              <Card style={s.tournCard}>
                <View style={s.tournTop}>
                  <StatusBadge status={t.status} />
                  <Text style={s.tournPrice}>
                    {t.price > 0 ? `${Number(t.price).toLocaleString()} F` : "Gratuit"}
                  </Text>
                </View>
                <Text style={s.tournTitle} numberOfLines={1}>{t.title}</Text>
                <Text style={s.tournSub}>
                  🎮 {t.game_name || "—"}{"  "}
                  {t.type === "physical" ? `📍 ${t.city || ""}` : "🌐 En ligne"}
                </Text>
                <View style={s.barRow}>
                  <Text style={s.barLabel}>👥 {t.current_players}/{t.max_players}</Text>
                  <View style={s.barBg}>
                    <View style={[
                      s.barFill,
                      {
                        width: `${Math.min((t.current_players / t.max_players) * 100, 100)}%` as any,
                        backgroundColor: t.current_players >= t.max_players ? C.red : C.purple,
                      },
                    ]} />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Jeux */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🎮 Jeux populaires</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {visibleG.map((g) => (
              <TouchableOpacity key={g.id} onPress={() => router.push(`/game/${g.id}`)} activeOpacity={0.85}>
                <View style={s.gameChip}>
                  <Text style={{ fontSize: 28 }}>🎮</Text>
                  <Text style={s.gameChipLabel} numberOfLines={2}>{g.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {games.length > MAX_G && (
              <TouchableOpacity onPress={() => router.push("/(tabs)/games")} activeOpacity={0.85}>
                <View style={[s.gameChip, { borderColor: C.purple, backgroundColor: C.purpleFade }]}>
                  <Text style={{ fontSize: 22, color: C.purple }}>+{games.length - MAX_G}</Text>
                  <Text style={[s.gameChipLabel, { color: C.purple }]}>Voir tous</Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Top joueurs */}
        <View style={[s.section, { marginBottom: 100 }]}>
          <Text style={s.sectionTitle}>🏅 Top Joueurs</Text>
          <Card style={{ marginTop: 12 }}>
            {visibleL.length === 0 ? (
              <Text style={s.empty}>🌱 Aucun joueur classé pour l'instant</Text>
            ) : visibleL.map((p, i) => {
              const lvl    = getLevelKey(p.points || 0);
              const medals = ["🥇","🥈","🥉"];
              return (
                <TouchableOpacity key={p.user_id} onPress={() => router.push(`/profile/${p.user_id}`)}
                  style={s.playerRow} activeOpacity={0.8}>
                  <Text style={s.medal}>{medals[i] || String(i + 1)}</Text>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{p.username?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.playerName}>{p.username}</Text>
                    <Text style={[s.playerLevel, { color: lvl.color }]}>{lvl.icon} {lvl.label}</Text>
                  </View>
                  <Text style={s.playerPts}>{p.points} pts</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={() => router.push("/(tabs)/leaderboard")} style={s.viewMoreBtn}>
              <Text style={s.viewMoreText}>Voir le classement complet →</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  content:       { padding: 16 },
  topBar:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  greeting:      { color: C.white, fontWeight: "800", fontSize: 17 },
  greetingSub:   { color: C.gray, fontSize: 12, marginTop: 2 },
  notifBtn:      { width: 46, height: 46, borderRadius: 23, backgroundColor: C.bgCard, justifyContent: "center", alignItems: "center", borderWidth: 0.5, borderColor: C.border, position: "relative" },
  notifBadge:    { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#ef4444", justifyContent: "center", alignItems: "center", paddingHorizontal: 4, borderWidth: 1.5, borderColor: C.bg },
  notifBadgeTxt: { color: "#fff", fontSize: 10, fontWeight: "800" },
  hero:          { backgroundColor: C.bgCard, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 0.5, borderColor: C.border },
  heroBadge:     { backgroundColor: C.purpleFade, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 12 },
  heroBadgeText: { color: C.purple, fontSize: 11, fontWeight: "600" },
  heroTitle:     { fontSize: 26, fontWeight: "800", color: C.white, lineHeight: 34, marginBottom: 8 },
  heroSub:       { color: C.gray, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  heroBtn:       { backgroundColor: C.purple, borderRadius: 12, padding: 14, alignItems: "center" },
  heroBtnText:   { color: "#fff", fontWeight: "700", fontSize: 14 },
  statsRow:      { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard:      { flex: 1, alignItems: "center", paddingVertical: 14 },
  statIcon:      { fontSize: 22, marginBottom: 4 },
  statValue:     { fontSize: 20, fontWeight: "700", color: C.white },
  statLabel:     { fontSize: 11, color: C.gray, marginTop: 2 },
  section:       { marginBottom: 20 },
  sectionHead:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle:  { fontSize: 17, fontWeight: "700", color: C.white },
  seeAll:        { fontSize: 13, color: C.purple },
  tournCard:     { marginBottom: 10 },
  tournTop:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tournPrice:    { color: C.cyan, fontWeight: "700", fontSize: 14 },
  tournTitle:    { fontSize: 15, fontWeight: "600", color: C.white, marginBottom: 4 },
  tournSub:      { fontSize: 12, color: C.gray, marginBottom: 10 },
  barRow:        { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel:      { fontSize: 11, color: C.gray, width: 70 },
  barBg:         { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 99, overflow: "hidden" },
  barFill:       { height: 4, borderRadius: 99 },
  gameChip:      { width: 90, height: 100, backgroundColor: C.bgCard, borderRadius: 14, marginRight: 10, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: C.border, padding: 8 },
  gameChipLabel: { fontSize: 11, color: C.white, textAlign: "center", marginTop: 6, lineHeight: 14 },
  playerRow:     { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderColor: C.border },
  medal:         { fontSize: 20, width: 28 },
  avatar:        { width: 36, height: 36, borderRadius: 18, backgroundColor: C.purple, justifyContent: "center", alignItems: "center" },
  avatarText:    { color: "#fff", fontWeight: "700", fontSize: 14 },
  playerName:    { color: C.white, fontWeight: "600", fontSize: 13 },
  playerLevel:   { fontSize: 11, marginTop: 1 },
  playerPts:     { color: C.purple, fontWeight: "700", fontSize: 13 },
  viewMoreBtn:   { paddingTop: 12, alignItems: "center" },
  viewMoreText:  { color: C.purple, fontSize: 13, fontWeight: "600" },
  empty:         { color: C.gray, textAlign: "center", paddingVertical: 16 },
});