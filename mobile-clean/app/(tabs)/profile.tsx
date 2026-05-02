import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { C } from "../../src/theme/colors";
import Card from "../../src/components/ui/Card";
import Button from "../../src/components/ui/Button";
import { useAuthStore } from "../../src/store/authStore";
import { getMeApi, getUserGamesApi, getReviewsApi } from "../../src/api/tournamentApi";
import { formatDate } from "../../src/utils/formatDate";

function getLvl(pts: number) {
  if (pts >= 200) return { icon: "👑", label: "GOAT",       color: C.purple, next: null,         nextPts: null };
  if (pts >= 100) return { icon: "⭐", label: "Légendaire", color: C.yellow, next: "GOAT 👑",     nextPts: 200  };
  return                  { icon: "🌱", label: "Débutant",  color: C.gray,   next: "Légendaire ⭐", nextPts: 100 };
}

const ROLE_LABELS: Record<string, string> = {
  player:    "Joueur",
  organizer: "Organisateur",
  admin:     "Administrateur",
};

export default function ProfileScreen() {
  const { user: me, logout }        = useAuthStore();
  const [profile, setProfile]       = useState<any>(null);
  const [userGames, setUserGames]   = useState<any[]>([]);
  const [reviews, setReviews]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]               = useState<"info"|"jeux"|"avis">("info");

  const load = async () => {
    if (!me) return;
    try {
      const [pRes, ugRes, revRes] = await Promise.all([
        getMeApi(),
        getUserGamesApi(me.id).catch(() => ({ data: { games: [] } })),
        getReviewsApi(me.id).catch(() => ({ data: { reviews: [] } })),
      ]);
      setProfile(pRes.data?.user || pRes.data);
      setUserGames(ugRes.data?.games || ugRes.data || []);
      setReviews(revRes.data?.reviews || revRes.data || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Tu veux vraiment te déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Se déconnecter", style: "destructive", onPress: async () => { await logout(); } },
      ]
    );
  };

  if (loading) return (
    <SafeAreaView style={[s.root, s.center]}>
      <ActivityIndicator size="large" color={C.purple} />
    </SafeAreaView>
  );

  const pts      = profile?.points || 0;
  const lvl      = getLvl(pts);
  const progress = lvl.nextPts ? Math.min((pts / lvl.nextPts) * 100, 100) : 100;
  const avgRating = reviews.length
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const canCreate = ["organizer","admin"].includes(me?.role || "");

  return (
    <SafeAreaView style={s.root}>
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
        {/* ── Carte profil ── */}
        <View style={s.heroCard}>

          {/* Avatar + infos */}
          <View style={s.heroTop}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>
                {profile?.username?.[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.username} numberOfLines={1}>{profile?.username}</Text>

              {/* Badges */}
              <View style={s.badgeRow}>
                <View style={[s.badge, { backgroundColor: lvl.color + "25" }]}>
                  <Text style={[s.badgeTxt, { color: lvl.color }]}>
                    {lvl.icon} {lvl.label}
                  </Text>
                </View>
                {me?.role && me.role !== "player" && (
                  <View style={[s.badge, { backgroundColor: C.cyanFade }]}>
                    <Text style={[s.badgeTxt, { color: C.cyan }]}>
                      {me.role === "admin" ? "⚙️" : "🎖️"} {ROLE_LABELS[me.role]}
                    </Text>
                  </View>
                )}
              </View>

              {profile?.city && (
                <Text style={s.city}>📍 {profile.city}</Text>
              )}
              {profile?.bio && (
                <Text style={s.bio} numberOfLines={2}>"{profile.bio}"</Text>
              )}
              {avgRating && (
                <Text style={s.rating}>⭐ {avgRating}/5 · {reviews.length} avis</Text>
              )}
            </View>

            {/* Points */}
            <View style={s.ptsBox}>
              <Text style={s.ptsValue}>{pts}</Text>
              <Text style={s.ptsSub}>points</Text>
            </View>
          </View>

          {/* Barre XP */}
          <View style={s.xpSection}>
            <View style={s.xpLabels}>
              <Text style={s.xpLeft}>{pts} pts</Text>
              <Text style={s.xpRight}>
                {lvl.nextPts
                  ? `Prochain niveau : ${lvl.next} (${lvl.nextPts} pts)`
                  : "👑 Niveau maximum atteint !"}
              </Text>
            </View>
            <View style={s.xpBg}>
              <View style={[s.xpFill, { width: `${progress}%` as any }]} />
            </View>
          </View>
        </View>

        {/* ── Stats rapides ── */}
        <View style={s.statsRow}>
          {[
            { icon: "⭐", label: "Points",   value: pts           },
            { icon: "🎮", label: "Jeux",     value: userGames.length },
            { icon: "📝", label: "Avis",     value: reviews.length   },
          ].map((st) => (
            <Card key={st.label} style={s.statCard}>
              <Text style={s.statIcon}>{st.icon}</Text>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </Card>
          ))}
        </View>

        {/* ── Actions rapides ── */}
        <View style={s.actionsGrid}>
          <TouchableOpacity
            style={s.actionCard}
            onPress={() => router.push("/matchmaking")}
            activeOpacity={0.8}
          >
            <Text style={s.actionIcon}>📍</Text>
            <Text style={s.actionLabel}>Recherche{"\n"}d'adversaires</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.actionCard}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.8}
          >
            <Text style={s.actionIcon}>🔔</Text>
            <Text style={s.actionLabel}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.actionCard}
            onPress={() => router.push("/(tabs)/games")}
            activeOpacity={0.8}
          >
            <Text style={s.actionIcon}>🎮</Text>
            <Text style={s.actionLabel}>Mes jeux</Text>
          </TouchableOpacity>

          {canCreate && (
            <TouchableOpacity
              style={[s.actionCard, { borderColor: C.purple, backgroundColor: C.purpleFade }]}
              onPress={() => router.push("/create-tournament")}
              activeOpacity={0.8}
            >
              <Text style={s.actionIcon}>➕</Text>
              <Text style={[s.actionLabel, { color: C.purple }]}>Créer un{"\n"}tournoi</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Onglets ── */}
        <View style={s.tabs}>
          {(["info","jeux","avis"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.tab, tab === t && s.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
                {t === "info" ? "📊 Infos"
                 : t === "jeux" ? `🎮 Jeux (${userGames.length})`
                 : `⭐ Avis (${reviews.length})`
                }
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Onglet Infos ── */}
        {tab === "info" && (
          <Card>
            {[
              { icon: "🎮", label: "Pseudo",          value: profile?.username },
              { icon: "📍", label: "Ville",            value: profile?.city || "Non précisé" },
              { icon: "💬", label: "Bio",              value: profile?.bio  || "Aucune bio renseignée" },
              { icon: "📞", label: "Téléphone",        value: profile?.phone || "—" },
              { icon: "📧", label: "E-mail",           value: profile?.email || "—" },
              { icon: "🏅", label: "Niveau",           value: `${lvl.icon} ${lvl.label}` },
              { icon: "🎖️", label: "Rôle",             value: ROLE_LABELS[profile?.role] || profile?.role },
              { icon: "📅", label: "Membre depuis",    value: formatDate(profile?.created_at) },
            ].map((row, i, arr) => (
              <View
                key={row.label}
                style={[s.infoRow, i < arr.length - 1 && s.infoRowBorder]}
              >
                <Text style={s.infoIcon}>{row.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.infoLabel}>{row.label}</Text>
                  <Text style={s.infoValue}>{row.value}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* ── Onglet Jeux ── */}
        {tab === "jeux" && (
          <Card>
            {userGames.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>🎮</Text>
                <Text style={s.emptyTitle}>Aucun jeu sélectionné</Text>
                <Button
                  label="Ajouter des jeux"
                  onPress={() => router.push("/(tabs)/games")}
                  style={{ marginTop: 14 }}
                />
              </View>
            ) : (
              <>
                {userGames.map((g: any, i, arr) => (
                  <View
                    key={g.id || g.game_id}
                    style={[s.gameRow, i < arr.length - 1 && s.infoRowBorder]}
                  >
                    <Text style={{ fontSize: 24 }}>🎮</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.gameName}>{g.name}</Text>
                      <Text style={s.gameLevel}>{g.level || "Débutant"}</Text>
                    </View>
                    <View style={s.gamePtsBox}>
                      <Text style={s.gamePts}>{g.points || 0}</Text>
                      <Text style={s.gamePtsSub}>pts</Text>
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={s.addGameBtn} onPress={() => router.push("/(tabs)/games")}>
                  <Text style={s.addGameBtnTxt}>+ Gérer mes jeux</Text>
                </TouchableOpacity>
              </>
            )}
          </Card>
        )}

        {/* ── Onglet Avis ── */}
        {tab === "avis" && (
          <Card>
            {reviews.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>⭐</Text>
                <Text style={s.emptyTitle}>Aucun avis pour l'instant</Text>
              </View>
            ) : reviews.map((r: any, i, arr) => (
              <View
                key={r.id}
                style={[s.reviewRow, i < arr.length - 1 && s.infoRowBorder]}
              >
                <View style={s.reviewAvatar}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                    {r.username?.[0]?.toUpperCase() || "?"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.reviewName}>{r.username || "Joueur"}</Text>
                  <Text style={{ color: C.yellow, fontSize: 12 }}>
                    {"⭐".repeat(Math.min(r.rating || 0, 5))}
                  </Text>
                  {r.comment && <Text style={s.reviewComment}>{r.comment}</Text>}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* ── Déconnexion ── */}
        <Button
          label="Se déconnecter"
          onPress={handleLogout}
          variant="danger"
          style={{ marginTop: 20, marginBottom: 32 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  center:       { justifyContent: "center", alignItems: "center" },
  content:      { padding: 16 },
  // Hero
  heroCard:     { backgroundColor: C.bgCard, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 0.5, borderColor: C.border },
  heroTop:      { flexDirection: "row", gap: 14, alignItems: "flex-start", marginBottom: 14 },
  avatar:       { width: 60, height: 60, borderRadius: 30, backgroundColor: C.purple, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  avatarTxt:    { color: "#fff", fontWeight: "900", fontSize: 24 },
  username:     { color: C.white, fontWeight: "800", fontSize: 18, marginBottom: 6 },
  badgeRow:     { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  badge:        { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:     { fontSize: 11, fontWeight: "700" },
  city:         { color: C.gray, fontSize: 12, marginTop: 2 },
  bio:          { color: C.gray, fontSize: 12, fontStyle: "italic", marginTop: 2 },
  rating:       { color: C.yellow, fontSize: 12, marginTop: 2 },
  ptsBox:       { alignItems: "flex-end", flexShrink: 0 },
  ptsValue:     { color: C.purple, fontWeight: "900", fontSize: 28 },
  ptsSub:       { color: C.grayDark, fontSize: 11 },
  // XP
  xpSection:    { },
  xpLabels:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  xpLeft:       { color: C.purple, fontWeight: "700", fontSize: 12 },
  xpRight:      { color: C.grayDark, fontSize: 11, maxWidth: "65%" },
  xpBg:         { height: 7, backgroundColor: C.border, borderRadius: 99, overflow: "hidden" },
  xpFill:       { height: 7, backgroundColor: C.purple, borderRadius: 99 },
  // Stats
  statsRow:     { flexDirection: "row", gap: 10, marginBottom: 12 },
  statCard:     { flex: 1, alignItems: "center", paddingVertical: 14 },
  statIcon:     { fontSize: 20, marginBottom: 4 },
  statValue:    { fontSize: 18, fontWeight: "800", color: C.white },
  statLabel:    { fontSize: 10, color: C.gray, marginTop: 2 },
  // Actions grid
  actionsGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  actionCard:   { width: "47%", backgroundColor: C.bgCard, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 0.5, borderColor: C.border },
  actionIcon:   { fontSize: 26, marginBottom: 6 },
  actionLabel:  { color: C.gray, fontSize: 12, textAlign: "center", lineHeight: 17 },
  // Tabs
  tabs:         { flexDirection: "row", backgroundColor: C.bgCard, borderRadius: 12, padding: 4, marginBottom: 12, borderWidth: 0.5, borderColor: C.border },
  tab:          { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 9 },
  tabActive:    { backgroundColor: C.purpleFade },
  tabTxt:       { color: C.gray, fontSize: 11, fontWeight: "600" },
  tabTxtActive: { color: C.purple },
  // Info rows
  infoRow:      { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 11 },
  infoRowBorder:{ borderBottomWidth: 0.5, borderColor: C.border },
  infoIcon:     { fontSize: 18, marginTop: 2 },
  infoLabel:    { color: C.gray, fontSize: 11, marginBottom: 2 },
  infoValue:    { color: C.white, fontSize: 13, fontWeight: "500" },
  // Jeux
  gameRow:      { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  gameName:     { color: C.white, fontWeight: "600", fontSize: 13 },
  gameLevel:    { color: C.gray, fontSize: 11, marginTop: 1 },
  gamePtsBox:   { alignItems: "flex-end" },
  gamePts:      { color: C.purple, fontWeight: "800", fontSize: 15 },
  gamePtsSub:   { color: C.grayDark, fontSize: 10 },
  addGameBtn:   { borderTopWidth: 0.5, borderColor: C.border, paddingTop: 12, marginTop: 4, alignItems: "center" },
  addGameBtnTxt:{ color: C.purple, fontSize: 13, fontWeight: "600" },
  // Avis
  reviewRow:    { flexDirection: "row", gap: 10, paddingVertical: 11 },
  reviewAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.purple, justifyContent: "center", alignItems: "center" },
  reviewName:   { color: C.white, fontWeight: "600", fontSize: 13, marginBottom: 2 },
  reviewComment:{ color: C.gray, fontSize: 12, marginTop: 4, lineHeight: 18 },
  // Vide
  emptyBox:     { alignItems: "center", paddingVertical: 30 },
  emptyIcon:    { fontSize: 40, marginBottom: 8 },
  emptyTitle:   { color: C.gray, fontSize: 14, fontWeight: "600" },
});