import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { C } from "../../src/theme/colors";
import Card from "../../src/components/ui/Card";
import StatusBadge from "../../src/components/ui/StatusBadge";
import { useAuthStore } from "../../src/store/authStore";
import { listTournamentsApi, listGamesApi, getLeaderboardApi } from "../../src/api/tournamentApi";
import { formatDateTime } from "../../src/utils/formatDate";

const MAX_T = 4;
const MAX_G = 6;
const MAX_L = 5;

function getLevelKey(pts: number) {
  if (pts >= 200) return { icon: "👑", label: "GOAT",       color: C.purple };
  if (pts >= 100) return { icon: "⭐", label: "Légendaire", color: C.yellow };
  return                  { icon: "🌱", label: "Débutant",  color: C.gray   };
}

export default function HomeScreen() {
  const { user }                      = useAuthStore();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [games, setGames]             = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const load = async () => {
    try {
      const [tRes, gRes, lRes] = await Promise.all([
        listTournamentsApi(),
        listGamesApi(),
        getLeaderboardApi().catch(() => ({ data: { leaderboard: [] } })),
      ]);
      setTournaments(tRes.data?.tournaments || tRes.data?.data || []);
      setGames(gRes.data?.games || gRes.data || []);
     const lb = lRes.data?.leaderboard || lRes.data || [];
    setLeaderboard(Array.isArray(lb) ? lb : []);
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
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
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
        <View style={[s.section, { marginBottom: 32 }]}>
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
  root:         { flex: 1, backgroundColor: C.bg },
  content:      { padding: 16 },
  hero:         { backgroundColor: C.bgCard, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 0.5, borderColor: C.border },
  heroBadge:    { backgroundColor: C.purpleFade, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 12 },
  heroBadgeText:{ color: C.purple, fontSize: 11, fontWeight: "600" },
  heroTitle:    { fontSize: 26, fontWeight: "800", color: C.white, lineHeight: 34, marginBottom: 8 },
  heroSub:      { color: C.gray, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  heroBtn:      { backgroundColor: C.purple, borderRadius: 12, padding: 14, alignItems: "center" },
  heroBtnText:  { color: "#fff", fontWeight: "700", fontSize: 14 },
  statsRow:     { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard:     { flex: 1, alignItems: "center", paddingVertical: 14 },
  statIcon:     { fontSize: 22, marginBottom: 4 },
  statValue:    { fontSize: 20, fontWeight: "700", color: C.white },
  statLabel:    { fontSize: 11, color: C.gray, marginTop: 2 },
  section:      { marginBottom: 20 },
  sectionHead:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: C.white },
  seeAll:       { fontSize: 13, color: C.purple },
  tournCard:    { marginBottom: 10 },
  tournTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tournPrice:   { color: C.cyan, fontWeight: "700", fontSize: 14 },
  tournTitle:   { fontSize: 15, fontWeight: "600", color: C.white, marginBottom: 4 },
  tournSub:     { fontSize: 12, color: C.gray, marginBottom: 10 },
  barRow:       { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel:     { fontSize: 11, color: C.gray, width: 70 },
  barBg:        { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 99, overflow: "hidden" },
  barFill:      { height: 4, borderRadius: 99 },
  gameChip:     { width: 90, height: 100, backgroundColor: C.bgCard, borderRadius: 14, marginRight: 10, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: C.border, padding: 8 },
  gameChipLabel:{ fontSize: 11, color: C.white, textAlign: "center", marginTop: 6, lineHeight: 14 },
  playerRow:    { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderColor: C.border },
  medal:        { fontSize: 20, width: 28 },
  avatar:       { width: 36, height: 36, borderRadius: 18, backgroundColor: C.purple, justifyContent: "center", alignItems: "center" },
  avatarText:   { color: "#fff", fontWeight: "700", fontSize: 14 },
  playerName:   { color: C.white, fontWeight: "600", fontSize: 13 },
  playerLevel:  { fontSize: 11, marginTop: 1 },
  playerPts:    { color: C.purple, fontWeight: "700", fontSize: 13 },
  viewMoreBtn:  { paddingTop: 12, alignItems: "center" },
  viewMoreText: { color: C.purple, fontSize: 13, fontWeight: "600" },
  empty:        { color: C.gray, textAlign: "center", paddingVertical: 16 },
});