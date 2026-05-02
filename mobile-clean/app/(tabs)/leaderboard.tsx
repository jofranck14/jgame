import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { C } from "../../src/theme/colors";
import Card from "../../src/components/ui/Card";
import { getLeaderboardApi, getGameLeaderboard, listGamesApi } from "../../src/api/tournamentApi";

function getLvl(pts: number) {
  if (pts >= 200) return { icon: "👑", label: "GOAT",       color: C.purple };
  if (pts >= 100) return { icon: "⭐", label: "Légendaire", color: C.yellow };
  return                  { icon: "🌱", label: "Débutant",  color: C.gray   };
}

const MEDALS = ["🥇", "🥈", "🥉"];
const POD_COLORS = ["#94A3B8", "#F59E0B", "#CD7F32"]; // 2e, 1er, 3e

export default function LeaderboardScreen() {
  const [players, setPlayers]       = useState<any[]>([]);
  const [games, setGames]           = useState<any[]>([]);
  const [selectedGame, setSelected] = useState<string>("");
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    listGamesApi()
      .then((r) => setGames(r.data?.games || r.data || []))
      .catch(() => {});
  }, []);

  const load = async () => {
    try {
      const req = selectedGame ? getGameLeaderboard(selectedGame) : getLeaderboardApi();
      const res = await req;
      const data = res.data?.leaderboard || res.data || [];
      // Dédupliquer par user_id pour éviter les clés dupliquées
      const seen = new Set<number>();
      const deduped = (Array.isArray(data) ? data : [])
        .filter((p: any) => (p.points || 0) > 0)
        .filter((p: any) => {
          if (seen.has(p.user_id)) return false;
          seen.add(p.user_id);
          return true;
        });
      setPlayers(deduped);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { setLoading(true); load(); }, [selectedGame]);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>🏆 Classement</Text>
        <Text style={s.sub}>
          {selectedGame
            ? `Jeu : ${games.find((g) => String(g.id) === selectedGame)?.name || ""}`
            : "Tous jeux confondus"
          }
        </Text>
      </View>

      {/* Filtre jeu — scroll horizontal */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterContent}
      >
        <TouchableOpacity
          style={[s.chip, !selectedGame && s.chipActive]}
          onPress={() => setSelected("")}
        >
          <Text style={[s.chipTxt, !selectedGame && s.chipTxtActive]}>🌍 Global</Text>
        </TouchableOpacity>
        {games.map((g) => (
          <TouchableOpacity
            key={String(g.id)}
            style={[s.chip, selectedGame === String(g.id) && s.chipActive]}
            onPress={() => setSelected(String(g.id))}
          >
            <Text style={[s.chipTxt, selectedGame === String(g.id) && s.chipTxtActive]}>
              🎮 {g.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}>
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
          {players.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>🌱</Text>
              <Text style={s.emptyTitle}>Aucun joueur classé</Text>
              <Text style={s.emptySub}>Participe à un tournoi pour apparaître ici !</Text>
            </View>
          ) : (
            <>
              {/* Podium top 3 */}
              {players.length >= 3 && (
                <View style={s.podium}>
                  {/* Ordre d'affichage : 2e | 1er | 3e */}
                  {([1, 0, 2] as const).map((realIdx, displayIdx) => {
                    const p = players[realIdx];
                    if (!p) return null;
                    const heights   = [80, 104, 68];
                    const podColor  = POD_COLORS[displayIdx];
                    return (
                      <TouchableOpacity
                        key={`pod-${p.user_id}`}
                        style={s.podItem}
                        onPress={() => router.push(`/profile/${p.user_id}`)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.podMedal}>{MEDALS[realIdx]}</Text>
                        <View style={[s.podAvatar, { backgroundColor: podColor }]}>
                          <Text style={s.podAvatarTxt}>
                            {p.username?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                        <View style={[s.podBase, { height: heights[displayIdx], borderColor: podColor }]}>
                          <Text style={s.podName} numberOfLines={1}>{p.username}</Text>
                          <Text style={[s.podPts, { color: podColor }]}>{p.points} pts</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Liste complète */}
              <Card>
                {players.map((p, i) => {
                  const lvl = getLvl(p.points || 0);
                  return (
                    <TouchableOpacity
                      key={`player-${p.user_id}-${i}`}
                      onPress={() => router.push(`/profile/${p.user_id}`)}
                      style={[s.row, i > 0 && s.rowBorder]}
                      activeOpacity={0.8}
                    >
                      {/* Rang */}
                      <View style={[
                        s.rankBadge,
                        i === 0 && { backgroundColor: C.yellow },
                        i === 1 && { backgroundColor: C.gray },
                        i === 2 && { backgroundColor: "#CD7F32" },
                        i > 2  && { backgroundColor: C.bgCard },
                      ]}>
                        <Text style={[s.rankTxt, i < 3 && { color: "#0F172A" }]}>
                          {i < 3 ? MEDALS[i] : i + 1}
                        </Text>
                      </View>

                      {/* Avatar */}
                      <View style={s.avatar}>
                        <Text style={s.avatarTxt}>
                          {p.username?.[0]?.toUpperCase()}
                        </Text>
                      </View>

                      {/* Infos */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.name} numberOfLines={1}>{p.username}</Text>
                        <View style={s.levelRow}>
                          <Text style={[s.levelTxt, { color: lvl.color }]}>
                            {lvl.icon} {lvl.label}
                          </Text>
                          {p.city ? (
                            <Text style={s.cityTxt}>  📍 {p.city}</Text>
                          ) : null}
                        </View>
                      </View>

                      {/* Points */}
                      <View style={s.ptsBox}>
                        <Text style={s.pts}>{p.points}</Text>
                        <Text style={s.ptsSub}>pts</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </Card>

              <Text style={s.total}>{players.length} joueur{players.length > 1 ? "s" : ""} classé{players.length > 1 ? "s" : ""}</Text>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  header:       { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title:        { fontSize: 22, fontWeight: "800", color: C.white },
  sub:          { fontSize: 12, color: C.gray, marginTop: 2 },
  center:       { flex: 1, justifyContent: "center", alignItems: "center" },
  filterScroll: { flexGrow: 0, marginBottom: 8 },
  filterContent:{ paddingHorizontal: 16, gap: 8, flexDirection: "row" },
  chip:         { borderWidth: 1, borderColor: C.border, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive:   { backgroundColor: C.purpleFade, borderColor: C.purple },
  chipTxt:      { color: C.gray, fontSize: 12, fontWeight: "500" },
  chipTxtActive:{ color: C.purple, fontWeight: "700" },
  content:      { padding: 16, paddingTop: 4, paddingBottom: 24 },
  // Podium
  podium:       { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 6, marginBottom: 20, paddingHorizontal: 8 },
  podItem:      { alignItems: "center", flex: 1 },
  podMedal:     { fontSize: 22, marginBottom: 4 },
  podAvatar:    { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  podAvatarTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  podBase:      { width: "100%", borderRadius: 10, alignItems: "center", justifyContent: "flex-end", padding: 8, borderWidth: 1 },
  podName:      { color: C.white, fontSize: 10, fontWeight: "700", textAlign: "center", marginBottom: 2 },
  podPts:       { fontSize: 12, fontWeight: "800" },
  // Liste
  row:          { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  rowBorder:    { borderTopWidth: 0.5, borderTopColor: C.border },
  rankBadge:    { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  rankTxt:      { color: C.white, fontWeight: "700", fontSize: 12 },
  avatar:       { width: 38, height: 38, borderRadius: 19, backgroundColor: C.purple, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  avatarTxt:    { color: "#fff", fontWeight: "700", fontSize: 14 },
  name:         { color: C.white, fontWeight: "600", fontSize: 14 },
  levelRow:     { flexDirection: "row", alignItems: "center", marginTop: 2, flexWrap: "wrap" },
  levelTxt:     { fontSize: 11 },
  cityTxt:      { fontSize: 11, color: C.grayDark },
  ptsBox:       { alignItems: "flex-end", flexShrink: 0 },
  pts:          { color: C.purple, fontWeight: "800", fontSize: 16 },
  ptsSub:       { color: C.grayDark, fontSize: 10 },
  // Vide
  emptyBox:     { alignItems: "center", paddingVertical: 60 },
  emptyIcon:    { fontSize: 52, marginBottom: 12 },
  emptyTitle:   { color: C.white, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySub:     { color: C.gray, fontSize: 13, textAlign: "center" },
  total:        { color: C.grayDark, fontSize: 12, textAlign: "center", marginTop: 12 },
});