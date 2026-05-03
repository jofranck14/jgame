import React, { useCallback, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Modal, FlatList,
} from "react-native";
import {
  useFocusEffect, useNavigation, useRoute, RouteProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuthStore } from "../../store/authStore";
import { ProfileStackParamList } from "../../navigation/types";
import {
  getUserGamesApi, addUserGameApi, removeUserGameApi,
  getUserApi, getMeApi, listGamesApi,
} from "../../api/tournamentApi";
import { formatDate } from "../../utils/formatDate";
import { C } from "../../theme/colors";

type Nav   = NativeStackNavigationProp<ProfileStackParamList>;
type RouteP = RouteProp<ProfileStackParamList, "MyProfile" | "UserProfile">;

const ROLE_LABEL: Record<string, string>  = { player: "Joueur", organizer: "Organisateur", admin: "Admin" };
const ROLE_COLOR: Record<string, string>  = { player: C.cyan,   organizer: C.purple,        admin: C.yellow };

interface GameEntry {
  id: number; game_id: number; name: string;
  points: number; wins: number; losses: number;
}
interface AllGame { id: number; name: string; }

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<RouteP>();
  const { user: authUser, refreshUser, logout } = useAuthStore();

  const viewedId: number = (route.params as any)?.id ?? authUser?.id ?? 0;
  const isOwn = viewedId === authUser?.id;

  const [profile, setProfile]       = useState<any>(null);
  const [games, setGames]           = useState<GameEntry[]>([]);
  const [allGames, setAllGames]     = useState<AllGame[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [addingId, setAddingId]     = useState<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (isOwn) await refreshUser();          // rafraîchit le rôle
      const [pRes, gRes] = await Promise.all([
        isOwn ? getMeApi() : getUserApi(viewedId),
        getUserGamesApi(viewedId),
      ]);
      setProfile(pRes.data?.user ?? pRes.data);
      setGames(gRes.data?.games ?? []);
    } catch (e) { console.warn("profile load", e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [viewedId, isOwn]);

  // Recharge à chaque focus → capte les changements de rôle depuis l'admin
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = async () => {
    try {
      const res = await listGamesApi();
      setAllGames(res.data?.games ?? []);
    } catch {}
    setShowModal(true);
  };

  const handleAdd = async (gameId: number) => {
    if (!authUser) return;
    setAddingId(gameId);
    try {
      await addUserGameApi(authUser.id, gameId);
      await load(true);
      setShowModal(false);
    } catch (e: any) {
      Alert.alert("Erreur", e.response?.data?.message ?? "Impossible d'ajouter");
    } finally { setAddingId(null); }
  };

  const handleRemove = (g: GameEntry) => {
    if (!authUser) return;
    Alert.alert("Retirer", `Retirer "${g.name}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Retirer", style: "destructive", onPress: async () => {
        try {
          await removeUserGameApi(authUser.id, g.game_id);
          setGames((p) => p.filter((x) => x.id !== g.id));
        } catch (e: any) {
          Alert.alert("Erreur", e.response?.data?.message ?? "Erreur");
        }
      }},
    ]);
  };

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={C.purple} /></View>
  );
  if (!profile) return (
    <View style={s.center}><Text style={{ color: C.gray }}>Profil introuvable</Text></View>
  );

  const pts        = profile.points || 0;
  const lvl        = pts >= 200 ? { label: "🐐 GOAT", c: C.yellow }
                   : pts >= 100 ? { label: "⚡ Légendaire", c: C.purple }
                   : { label: "🌱 Débutant", c: C.cyan };
  const roleColor  = ROLE_COLOR[profile.role] ?? C.gray;
  const addedIds   = new Set(games.map((g) => g.game_id));
  const totalWins  = games.reduce((a, g) => a + (g.wins || 0), 0);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={C.purple}
        />
      }
    >
      {/* ─── Hero ─── */}
      <View style={s.hero}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{profile.username[0]?.toUpperCase()}</Text>
        </View>
        <Text style={s.username}>{profile.username}</Text>
        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: roleColor + "22", borderColor: roleColor }]}>
            <Text style={[s.badgeText, { color: roleColor }]}>
              {ROLE_LABEL[profile.role] ?? profile.role}
            </Text>
          </View>
          <View style={[s.badge, { backgroundColor: lvl.c + "22", borderColor: lvl.c }]}>
            <Text style={[s.badgeText, { color: lvl.c }]}>{lvl.label}</Text>
          </View>
        </View>
        {profile.city && <Text style={s.city}>📍 {profile.city}</Text>}
        {profile.bio  && <Text style={s.bio}>{profile.bio}</Text>}
        <Text style={s.since}>Membre depuis {formatDate(profile.created_at)}</Text>
      </View>

      {/* ─── Stats ─── */}
      <View style={s.statsRow}>
        {[
          { val: pts,        lbl: "Points" },
          { val: games.length, lbl: "Jeux" },
          { val: totalWins,  lbl: "Victoires" },
        ].map((item) => (
          <View key={item.lbl} style={s.statCard}>
            <Text style={s.statVal}>{item.val}</Text>
            <Text style={s.statLbl}>{item.lbl}</Text>
          </View>
        ))}
      </View>

      {/* ─── Actions ─── */}
      <View style={s.actions}>
        {isOwn ? (
          <>
            <TouchableOpacity style={s.actionBtn}
              onPress={() => navigation.navigate("Matchmaking")}>
              <Text style={s.actionBtnText}>⚔️ Matchmaking</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn}
              onPress={() => navigation.navigate("Notifications")}>
              <Text style={s.actionBtnText}>🔔 Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn}
              onPress={() => navigation.navigate("ChatList")}>
              <Text style={s.actionBtnText}>💬 Messages</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: C.purple, flex: 1 }]}
            onPress={() => navigation.navigate("Chat", { userId: profile.id, username: profile.username })}
          >
            <Text style={[s.actionBtnText, { color: "#fff" }]}>💬 Envoyer un message</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Jeux ─── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>🎮 Jeux ({games.length})</Text>
          {isOwn && (
            <TouchableOpacity style={s.addBtn} onPress={openModal}>
              <Text style={s.addBtnText}>+ Ajouter</Text>
            </TouchableOpacity>
          )}
        </View>

        {games.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>
              {isOwn
                ? "Ajoute tes jeux pour apparaître dans le matchmaking !"
                : "Aucun jeu enregistré"}
            </Text>
          </View>
        ) : (
          games.map((g) => (
            <View key={g.id} style={s.gameRow}>
              <View style={s.gameInfo}>
                <Text style={s.gameName}>🎮 {g.name}</Text>
                <Text style={s.gameStats}>
                  {g.wins ?? 0}V – {g.losses ?? 0}D  ·  {g.points ?? 0} pts
                </Text>
              </View>
              {isOwn && (
                <TouchableOpacity onPress={() => handleRemove(g)} style={s.removeBtn}>
                  <Text style={s.removeBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      {/* ─── Déconnexion ─── */}
      {isOwn && (
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={() =>
            Alert.alert("Déconnexion", "Confirmer ?", [
              { text: "Annuler", style: "cancel" },
              { text: "Oui", style: "destructive", onPress: logout },
            ])
          }
        >
          <Text style={s.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      )}

      {/* ─── Modal ajouter jeu ─── */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Choisir un jeu</Text>
            <FlatList
              data={allGames.filter((g) => !addedIds.has(g.id))}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.modalItem}
                  onPress={() => handleAdd(item.id)}
                  disabled={addingId === item.id}
                >
                  {addingId === item.id
                    ? <ActivityIndicator size="small" color={C.purple} />
                    : <Text style={s.modalItemText}>🎮 {item.name}</Text>
                  }
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ color: C.gray, textAlign: "center", marginTop: 20 }}>
                  Tous les jeux sont déjà ajoutés
                </Text>
              }
            />
            <TouchableOpacity style={s.modalClose} onPress={() => setShowModal(false)}>
              <Text style={s.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  center:        { flex: 1, justifyContent: "center", alignItems: "center" },
  hero:          { alignItems: "center", padding: 24, paddingTop: 56 },
  avatar:        { width: 80, height: 80, borderRadius: 40, backgroundColor: C.purple,
                   justifyContent: "center", alignItems: "center",
                   borderWidth: 3, borderColor: C.purpleFade, marginBottom: 12 },
  avatarText:    { color: "#fff", fontSize: 34, fontWeight: "700" },
  username:      { color: C.white, fontSize: 22, fontWeight: "700", marginBottom: 8 },
  badgeRow:      { flexDirection: "row", gap: 8, marginBottom: 8 },
  badge:         { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  badgeText:     { fontSize: 12, fontWeight: "600" },
  city:          { color: C.gray, fontSize: 13, marginTop: 4 },
  bio:           { color: C.gray, fontSize: 13, textAlign: "center", marginTop: 8, paddingHorizontal: 20 },
  since:         { color: C.grayDark, fontSize: 11, marginTop: 8 },
  statsRow:      { flexDirection: "row", marginHorizontal: 16, marginBottom: 16, gap: 8 },
  statCard:      { flex: 1, backgroundColor: C.bgCard, borderRadius: 12, padding: 14,
                   alignItems: "center", borderWidth: 1, borderColor: C.border },
  statVal:       { color: C.purple, fontSize: 22, fontWeight: "700" },
  statLbl:       { color: C.gray, fontSize: 11, marginTop: 2 },
  actions:       { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 16, marginBottom: 20, gap: 8 },
  actionBtn:     { flex: 1, minWidth: "28%", backgroundColor: C.bgCard, borderRadius: 12,
                   padding: 12, alignItems: "center", borderWidth: 1, borderColor: C.border },
  actionBtnText: { color: C.white, fontSize: 12, fontWeight: "600" },
  section:       { marginHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle:  { color: C.white, fontSize: 16, fontWeight: "700" },
  addBtn:        { backgroundColor: C.purpleFade, borderRadius: 8,
                   paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: C.purple },
  addBtnText:    { color: C.purple, fontSize: 13, fontWeight: "600" },
  emptyBox:      { backgroundColor: C.bgCard, borderRadius: 12, padding: 20,
                   alignItems: "center", borderWidth: 1, borderColor: C.border },
  emptyText:     { color: C.gray, fontSize: 13, textAlign: "center" },
  gameRow:       { flexDirection: "row", alignItems: "center", backgroundColor: C.bgCard,
                   borderRadius: 12, padding: 14, marginBottom: 8,
                   borderWidth: 1, borderColor: C.border },
  gameInfo:      { flex: 1 },
  gameName:      { color: C.white, fontWeight: "600", fontSize: 14 },
  gameStats:     { color: C.gray, fontSize: 12, marginTop: 3 },
  removeBtn:     { padding: 6 },
  removeBtnText: { color: C.red, fontSize: 16 },
  logoutBtn:     { marginHorizontal: 16, marginTop: 4, backgroundColor: C.redFade,
                   borderRadius: 12, padding: 14, alignItems: "center",
                   borderWidth: 1, borderColor: C.red },
  logoutText:    { color: C.red, fontWeight: "600", fontSize: 14 },
  overlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox:      { backgroundColor: C.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
                   padding: 20, maxHeight: "70%" },
  modalTitle:    { color: C.white, fontSize: 18, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  modalItem:     { padding: 14, borderBottomWidth: 1, borderColor: C.border,
                   minHeight: 48, justifyContent: "center" },
  modalItemText: { color: C.white, fontSize: 15 },
  modalClose:    { marginTop: 16, backgroundColor: C.purple, borderRadius: 12,
                   padding: 14, alignItems: "center" },
  modalCloseText:{ color: "#fff", fontWeight: "700", fontSize: 15 },
});