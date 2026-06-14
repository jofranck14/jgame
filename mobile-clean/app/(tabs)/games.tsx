import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { C } from "../../src/theme/colors";
import Card from "../../src/components/ui/Card";
import { listGamesApi, getUserGamesApi, addUserGameApi, removeUserGameApi } from "../../src/api/tournamentApi";
import { useAuthStore } from "../../src/store/authStore";

export default function GamesScreen() {
  const { user }                      = useAuthStore();
  const [games, setGames]             = useState<any[]>([]);
  const [myGameIds, setMyGameIds]     = useState<number[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [toggling, setToggling]       = useState<number | null>(null);

  const load = async () => {
    try {
      const [gRes, ugRes] = await Promise.all([
        listGamesApi(),
        user ? getUserGamesApi(user.id).catch(() => ({ data: { games: [] } })) : Promise.resolve({ data: { games: [] } }),
      ]);
      setGames(gRes.data?.games || gRes.data || []);
      const ug = ugRes.data?.games || ugRes.data || [];
      setMyGameIds(ug.map((g: any) => g.game_id || g.id));
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (gameId: number) => {
    if (toggling || !user) return;
    setToggling(gameId);
    const selected = myGameIds.includes(gameId);
    try {
      if (selected) {
        await removeUserGameApi(user.id, gameId);
        setMyGameIds((prev) => prev.filter((id) => id !== gameId));
      } else {
        await addUserGameApi(user.id, gameId);
        setMyGameIds((prev) => [...prev, gameId]);
      }
    } catch {}
    finally { setToggling(null); }
  };

  if (loading) return (
    <View style={[s.root, { justifyContent: "center", alignItems: "center" }]}>
      <ActivityIndicator size="large" color={C.purple} />
    </View>
  );

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>🎮 Jeux</Text>
        <Text style={s.sub}>{myGameIds.length} jeu{myGameIds.length !== 1 ? "x" : ""} sélectionné{myGameIds.length !== 1 ? "s" : ""}</Text>
      </View>

      <FlatList
        data={games}
        keyExtractor={(g) => String(g.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={s.grid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.purple} />}
        renderItem={({ item: g }) => {
          const selected   = myGameIds.includes(g.id);
          const isToggling = toggling === g.id;
          return (
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={() => router.push(`/game/${g.id}`)} activeOpacity={0.85}>
                <Card style={[s.gameCard, selected && s.gameCardActive]}>
                  <Text style={s.gameIcon}>🎮</Text>
                  <Text style={s.gameName} numberOfLines={2}>{g.name}</Text>
                  {selected && <Text style={s.selectedTag}>✅ Sélectionné</Text>}
                </Card>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleBtn, selected && s.toggleBtnActive]}
                onPress={() => toggle(g.id)}
                disabled={isToggling}
                activeOpacity={0.8}
              >
                <Text style={[s.toggleBtnText, selected && s.toggleBtnTextActive]}>
                  {isToggling ? "..." : selected ? "✕ Retirer" : "+ Ajouter"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🎮</Text>
            <Text style={s.emptyText}>Aucun jeu disponible</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: C.bg },
  header:         { padding: 16, paddingBottom: 8 },
  title:          { fontSize: 22, fontWeight: "800", color: C.white },
  sub:            { fontSize: 12, color: C.gray, marginTop: 2 },
  grid:           { padding: 16, paddingTop: 8 },
  gameCard:       { alignItems: "center", paddingVertical: 20, marginBottom: 8 },
  gameCardActive: { borderColor: C.purple, backgroundColor: C.purpleFade },
  gameIcon:       { fontSize: 36, marginBottom: 8 },
  gameName:       { color: C.white, fontWeight: "600", fontSize: 13, textAlign: "center" },
  selectedTag:    { color: C.purple, fontSize: 11, marginTop: 6, fontWeight: "600" },
  toggleBtn:      { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 7, alignItems: "center", marginTop: 4 },
  toggleBtnActive:{ borderColor: C.red, backgroundColor: C.redFade },
  toggleBtnText:  { color: C.gray, fontSize: 12, fontWeight: "600" },
  toggleBtnTextActive:{ color: C.red },
  empty:          { alignItems: "center", paddingVertical: 60 },
  emptyText:      { color: C.gray, fontSize: 16 },
});