import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { C } from "../src/theme/colors";
import Card from "../src/components/ui/Card";
import Button from "../src/components/ui/Button";
import { listGamesApi, findPlayersApi } from "../src/api/tournamentApi";
import { useAuthStore } from "../src/store/authStore";

function getLvl(pts: number) {
  if (pts >= 200) return { icon: "👑", label: "GOAT",       color: C.purple };
  if (pts >= 100) return { icon: "⭐", label: "Légendaire", color: C.yellow };
  return                  { icon: "🌱", label: "Débutant",  color: C.gray   };
}

const CITIES = ["Douala","Yaoundé","Bafoussam","Bamenda","Garoua","Maroua","Ngaoundéré","Bertoua","Ebolowa","Kribi"];

export default function MatchmakingScreen() {
  const { user: me }                  = useAuthStore();
  const [games, setGames]             = useState<any[]>([]);
  const [players, setPlayers]         = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [searched, setSearched]       = useState(false);
  const [filterGame, setFilterGame]   = useState("");
  const [filterCity, setFilterCity]   = useState(me?.city || "");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterModal, setFilterModal] = useState(false);

  useEffect(() => {
    listGamesApi().then((r) => setGames(r.data?.games || r.data || [])).catch(() => {});
  }, []);

  const search = async () => {
    setLoading(true); setSearched(true);
    try {
      const params: any = {};
      if (filterGame)  params.game_id = filterGame;
      if (filterCity)  params.city    = filterCity;
      if (filterLevel) params.level   = filterLevel;
      const res  = await findPlayersApi(params);
      const data = res.data?.users || res.data?.players || res.data || [];
      setPlayers(Array.isArray(data) ? data.filter((p: any) => String(p.id) !== String(me?.id)) : []);
    } catch { setPlayers([]); }
    finally { setLoading(false); }
  };

  const hasFilters = filterGame || filterCity || filterLevel;

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.title}>📍 Matchmaking</Text>
          <Text style={s.sub}>Trouve des adversaires près de toi</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Filtres rapides */}
        <Card style={s.card}>
          <Text style={s.filterTitle}>Critères de recherche</Text>

          <Text style={s.filterLabel}>Jeu</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <TouchableOpacity style={[s.chip, !filterGame && s.chipActive]} onPress={() => setFilterGame("")}>
              <Text style={[s.chipText, !filterGame && s.chipTextActive]}>Tous</Text>
            </TouchableOpacity>
            {games.map((g) => (
              <TouchableOpacity key={g.id}
                style={[s.chip, String(filterGame) === String(g.id) && s.chipActive]}
                onPress={() => setFilterGame(String(g.id))}>
                <Text style={[s.chipText, String(filterGame) === String(g.id) && s.chipTextActive]}>🎮 {g.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.filterLabel}>Ville</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <TouchableOpacity style={[s.chip, !filterCity && s.chipActive]} onPress={() => setFilterCity("")}>
              <Text style={[s.chipText, !filterCity && s.chipTextActive]}>Toutes</Text>
            </TouchableOpacity>
            {CITIES.map((c) => (
              <TouchableOpacity key={c}
                style={[s.chip, filterCity === c && s.chipActive]}
                onPress={() => setFilterCity(c)}>
                <Text style={[s.chipText, filterCity === c && s.chipTextActive]}>📍 {c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.filterLabel}>Niveau</Text>
          <View style={s.chipRow}>
            {[
              { v: "",          l: "Tous" },
              { v: "beginner",  l: "🌱 Débutant" },
              { v: "legendary", l: "⭐ Légendaire" },
              { v: "goat",      l: "👑 GOAT" },
            ].map((opt) => (
              <TouchableOpacity key={opt.v}
                style={[s.chip, filterLevel === opt.v && s.chipActive]}
                onPress={() => setFilterLevel(opt.v)}>
                <Text style={[s.chipText, filterLevel === opt.v && s.chipTextActive]}>{opt.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            label={loading ? "Recherche en cours..." : "🔍 Rechercher des joueurs"}
            onPress={search}
            loading={loading}
            style={{ marginTop: 16 }}
          />
        </Card>

        {/* Résultats */}
        {loading ? (
          <ActivityIndicator size="large" color={C.purple} style={{ marginTop: 24 }} />
        ) : searched && players.length === 0 ? (
          <Card style={s.card}>
            <View style={s.empty}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>🔍</Text>
              <Text style={s.emptyTitle}>Aucun joueur trouvé</Text>
              <Text style={s.emptySub}>Essaie d'autres critères</Text>
            </View>
          </Card>
        ) : players.length > 0 ? (
          <>
            <Text style={s.resultCount}>
              {players.length} joueur{players.length > 1 ? "s" : ""} trouvé{players.length > 1 ? "s" : ""}
            </Text>
            {players.map((p) => {
              const lvl = getLvl(p.points || 0);
              return (
                <Card key={p.id} style={s.playerCard}>
                  <View style={s.playerRow}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{p.username?.[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.playerNameRow}>
                        <Text style={s.playerName}>{p.username}</Text>
                        <View style={[s.lvlBadge, { backgroundColor: lvl.color + "25" }]}>
                          <Text style={[s.lvlText, { color: lvl.color }]}>{lvl.icon} {lvl.label}</Text>
                        </View>
                      </View>
                      <Text style={s.playerInfo}>
                        {p.city ? `📍 ${p.city}` : ""}
                        {p.points ? `  ·  ${p.points} pts` : ""}
                        {p.games?.length ? `\n🎮 ${p.games.join(", ")}` : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={s.playerActions}>
                    <Button
                      label="Profil"
                      onPress={() => router.push(`/profile/${p.id}`)} 
                      variant="outline"
                      size="sm"
                      style={{ flex: 1 }}
                    />
                    <Button
                      label="💬 Défier"
                      onPress={() => router.push(`/chat/${p.id}`)}
                      size="sm"
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  header:       { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingBottom: 8 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bgCard, justifyContent: "center", alignItems: "center", borderWidth: 0.5, borderColor: C.border },
  backText:     { color: C.purple, fontSize: 18, fontWeight: "700" },
  title:        { fontSize: 20, fontWeight: "800", color: C.white },
  sub:          { fontSize: 12, color: C.gray, marginTop: 1 },
  content:      { padding: 16 },
  card:         { marginBottom: 12 },
  filterTitle:  { fontSize: 15, fontWeight: "700", color: C.white, marginBottom: 14 },
  filterLabel:  { color: C.gray, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  chipRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:         { borderWidth: 1, borderColor: C.border, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 4 },
  chipActive:   { backgroundColor: C.purpleFade, borderColor: C.purple },
  chipText:     { color: C.gray, fontSize: 12 },
  chipTextActive:{ color: C.purple, fontWeight: "700" },
  resultCount:  { color: C.gray, fontSize: 13, marginBottom: 10 },
  playerCard:   { marginBottom: 10 },
  playerRow:    { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  avatar:       { width: 46, height: 46, borderRadius: 23, backgroundColor: C.purple, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  avatarText:   { color: "#fff", fontWeight: "800", fontSize: 18 },
  playerNameRow:{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 },
  playerName:   { color: C.white, fontWeight: "700", fontSize: 15 },
  lvlBadge:     { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  lvlText:      { fontSize: 11, fontWeight: "700" },
  playerInfo:   { color: C.gray, fontSize: 12, lineHeight: 18 },
  playerActions:{ flexDirection: "row", gap: 8 },
  empty:        { alignItems: "center", paddingVertical: 20 },
  emptyTitle:   { color: C.white, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptySub:     { color: C.gray, fontSize: 13 },
});