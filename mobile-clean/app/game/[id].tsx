import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { C } from "../../src/theme/colors";
import Card from "../../src/components/ui/Card";
import StatusBadge from "../../src/components/ui/StatusBadge";
import { getGameApi, listTournamentsApi, getGameLeaderboard } from "../../src/api/tournamentApi";
import { formatDateTime } from "../../src/utils/formatDate";

const PER_PAGE = 5;

function getLvl(pts: number) {
  if (pts >= 200) return { icon: "👑", color: C.purple };
  if (pts >= 100) return { icon: "⭐", color: C.yellow };
  return                  { icon: "🌱", color: C.gray   };
}

export default function GameScreen() {
  const { id }                        = useLocalSearchParams<{ id: string }>();
  const [game, setGame]               = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [statusFilter, setStatus]     = useState("");
  const [pageT, setPageT]             = useState(1);
  const [pageL, setPageL]             = useState(1);
  const [tabView, setTabView]         = useState<"tournaments"|"leaderboard">("tournaments");

  const PER_L = 10;

  const load = async () => {
    try {
      const [gRes, tRes, lRes] = await Promise.all([
        getGameApi(id),
        listTournamentsApi(),
        getGameLeaderboard(id).catch(() => ({ data: { leaderboard: [] } })),
      ]);
      setGame(gRes.data?.game || gRes.data);
      const all = tRes.data?.tournaments || tRes.data?.data || [];
      setTournaments(all.filter((t: any) => String(t.game_id) === String(id)));
      const lb = lRes.data?.leaderboard || lRes.data || [];
      setLeaderboard(Array.isArray(lb) ? lb.filter((p: any) => (p.points || 0) > 0) : []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [id]);

  const STATUSES = ["", "pending", "ongoing", "completed", "cancelled"];
  const LABELS   = { "": "Tous", pending: "À venir", ongoing: "En cours", completed: "Terminé", cancelled: "Annulé" };

  const filteredT  = statusFilter ? tournaments.filter((t) => t.status === statusFilter) : tournaments;
  const paginatedT = filteredT.slice((pageT - 1) * PER_PAGE, pageT * PER_PAGE);
  const totalPT    = Math.max(1, Math.ceil(filteredT.length / PER_PAGE));

  const paginatedL = leaderboard.slice((pageL - 1) * PER_L, pageL * PER_L);
  const totalPL    = Math.max(1, Math.ceil(leaderboard.length / PER_L));

  if (loading) return (
    <SafeAreaView style={[s.root, { justifyContent: "center", alignItems: "center" }]}>
      <ActivityIndicator size="large" color={C.purple} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={s.heroIcon}>
          <Text style={{ fontSize: 32 }}>🎮</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.gameName}>{game?.name}</Text>
          <Text style={s.gameSub}>
            {tournaments.length} tournoi{tournaments.length !== 1 ? "s" : ""}
            {"  ·  "}
            {leaderboard.length} joueur{leaderboard.length !== 1 ? "s" : ""} classés
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tabView === "tournaments" && s.tabActive]} onPress={() => setTabView("tournaments")}>
          <Text style={[s.tabText, tabView === "tournaments" && s.tabTextActive]}>🏆 Tournois ({tournaments.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tabView === "leaderboard" && s.tabActive]} onPress={() => setTabView("leaderboard")}>
          <Text style={[s.tabText, tabView === "leaderboard" && s.tabTextActive]}>🏅 Classement ({leaderboard.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.purple} />}
      >
        {/* ── TOURNOIS ── */}
        {tabView === "tournaments" && (
          <>
            {/* Filtre statut */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {STATUSES.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[s.chip, statusFilter === st && s.chipActive]}
                  onPress={() => { setStatus(st); setPageT(1); }}
                >
                  <Text style={[s.chipText, statusFilter === st && s.chipTextActive]}>
                    {(LABELS as any)[st]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {paginatedT.length === 0 ? (
              <Card><Text style={s.empty}>Aucun tournoi pour ce filtre</Text></Card>
            ) : paginatedT.map((t) => {
              const isFull   = t.current_players >= t.max_players;
              const progress = t.max_players > 0 ? Math.min((t.current_players / t.max_players) * 100, 100) : 0;
              const barColor = isFull ? C.red : progress >= 75 ? C.yellow : C.purple;
              return (
                <TouchableOpacity key={t.id} onPress={() => router.push(`/tournament/${t.id}`)} activeOpacity={0.85}>
                  <Card style={s.tCard}>
                    <View style={s.tTop}>
                      <StatusBadge status={t.status} />
                      <Text style={s.tPrice}>{t.price > 0 ? `${Number(t.price).toLocaleString()} F` : "Gratuit"}</Text>
                    </View>
                    <Text style={s.tTitle} numberOfLines={1}>{t.title}</Text>
                    {t.date && <Text style={s.tDate}>📅 {formatDateTime(t.date)}</Text>}
                    <View style={s.barRow}>
                      <Text style={[s.barLabel, isFull && { color: C.red }]}>
                        {isFull ? "🔴 Complet" : `👥 ${t.current_players}/${t.max_players}`}
                      </Text>
                      <View style={s.barBg}>
                        <View style={[s.barFill, { width: `${progress}%` as any, backgroundColor: barColor }]} />
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}

            {/* Pagination tournois */}
            {totalPT > 1 && (
              <View style={s.pgRow}>
                <TouchableOpacity style={[s.pgBtn, pageT === 1 && s.pgOff]} disabled={pageT === 1} onPress={() => setPageT(pageT - 1)}>
                  <Text style={s.pgTxt}>←</Text>
                </TouchableOpacity>
                <Text style={s.pgInfo}>{pageT} / {totalPT}</Text>
                <TouchableOpacity style={[s.pgBtn, pageT === totalPT && s.pgOff]} disabled={pageT === totalPT} onPress={() => setPageT(pageT + 1)}>
                  <Text style={s.pgTxt}>→</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ── CLASSEMENT ── */}
        {tabView === "leaderboard" && (
          <>
            <Card>
              {leaderboard.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>🌱</Text>
                  <Text style={s.emptyText}>Aucun joueur classé sur ce jeu</Text>
                </View>
              ) : paginatedL.map((p, i) => {
                const globalIdx = (pageL - 1) * PER_L + i;
                const lvl       = getLvl(p.points || 0);
                const medals    = ["🥇","🥈","🥉"];
                return (
                  <TouchableOpacity key={p.user_id}
                    onPress={() => router.push(`/profile/${p.user_id}`)}
                    style={[s.lRow, i > 0 && { borderTopWidth: 0.5, borderColor: C.border }]}
                    activeOpacity={0.8}
                  >
                    <Text style={s.medal}>{globalIdx < 3 ? medals[globalIdx] : String(globalIdx + 1)}</Text>
                    <View style={s.lAvatar}>
                      <Text style={s.lAvatarText}>{p.username?.[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.lName}>{p.username}</Text>
                      <Text style={[s.lLevel, { color: lvl.color }]}>{lvl.icon} {p.wins != null ? `${p.wins}V ${p.losses || 0}D` : ""}</Text>
                    </View>
                    <Text style={s.lPts}>{p.points} <Text style={{ color: C.grayDark, fontSize: 11 }}>pts</Text></Text>
                  </TouchableOpacity>
                );
              })}
            </Card>

            {/* Pagination classement */}
            {totalPL > 1 && (
              <View style={s.pgRow}>
                <TouchableOpacity style={[s.pgBtn, pageL === 1 && s.pgOff]} disabled={pageL === 1} onPress={() => setPageL(pageL - 1)}>
                  <Text style={s.pgTxt}>←</Text>
                </TouchableOpacity>
                <Text style={s.pgInfo}>{pageL} / {totalPL}</Text>
                <TouchableOpacity style={[s.pgBtn, pageL === totalPL && s.pgOff]} disabled={pageL === totalPL} onPress={() => setPageL(pageL + 1)}>
                  <Text style={s.pgTxt}>→</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  header:  { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bgCard, justifyContent: "center", alignItems: "center", borderWidth: 0.5, borderColor: C.border },
  backText:{ color: C.purple, fontSize: 18, fontWeight: "700" },
  heroIcon:{ width: 52, height: 52, borderRadius: 14, backgroundColor: C.purpleFade, justifyContent: "center", alignItems: "center", borderWidth: 0.5, borderColor: C.purple },
  gameName:{ fontSize: 18, fontWeight: "800", color: C.white },
  gameSub: { fontSize: 12, color: C.gray, marginTop: 2 },
  tabs:    { flexDirection: "row", backgroundColor: C.bgCard, marginHorizontal: 16, borderRadius: 12, padding: 4, marginBottom: 8, borderWidth: 0.5, borderColor: C.border },
  tab:     { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 9 },
  tabActive:{ backgroundColor: C.purpleFade },
  tabText: { color: C.gray, fontSize: 12, fontWeight: "600" },
  tabTextActive:{ color: C.purple },
  content: { padding: 16, paddingTop: 4 },
  chip:    { borderWidth: 1, borderColor: C.border, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  chipActive:{ backgroundColor: C.purpleFade, borderColor: C.purple },
  chipText:{ color: C.gray, fontSize: 12 },
  chipTextActive:{ color: C.purple, fontWeight: "700" },
  tCard:   { marginBottom: 10 },
  tTop:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tPrice:  { color: C.cyan, fontWeight: "700", fontSize: 13 },
  tTitle:  { fontSize: 14, fontWeight: "700", color: C.white, marginBottom: 4 },
  tDate:   { fontSize: 11, color: C.grayDark, marginBottom: 8 },
  barRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel:{ fontSize: 11, color: C.gray, width: 80 },
  barBg:   { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 99, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 99 },
  empty:   { color: C.gray, textAlign: "center", paddingVertical: 20 },
  emptyBox:{ alignItems: "center", paddingVertical: 30 },
  emptyText:{ color: C.gray, fontSize: 14, fontWeight: "600" },
  lRow:    { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  medal:   { fontSize: 20, width: 28, textAlign: "center" },
  lAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.purple, justifyContent: "center", alignItems: "center" },
  lAvatarText:{ color: "#fff", fontWeight: "700", fontSize: 13 },
  lName:   { color: C.white, fontWeight: "600", fontSize: 13 },
  lLevel:  { fontSize: 11, marginTop: 1 },
  lPts:    { color: C.purple, fontWeight: "800", fontSize: 14 },
  pgRow:   { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 16, paddingVertical: 16 },
  pgBtn:   { backgroundColor: C.bgCard, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 0.5, borderColor: C.border },
  pgOff:   { opacity: 0.35 },
  pgTxt:   { color: C.white, fontSize: 16 },
  pgInfo:  { color: C.gray, fontSize: 14 },
});