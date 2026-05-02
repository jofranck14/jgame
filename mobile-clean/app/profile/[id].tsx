import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { C } from "../../src/theme/colors";
import Card from "../../src/components/ui/Card";
import Button from "../../src/components/ui/Button";
import { useAuthStore } from "../../src/store/authStore";
import {
  getUserApi, getUserGamesApi, getReviewsApi,
  createReviewApi, createReportApi,
} from "../../src/api/tournamentApi";
import { formatDate } from "../../src/utils/formatDate";

function getLvl(pts: number) {
  if (pts >= 200) return { icon: "👑", label: "GOAT",       color: C.purple };
  if (pts >= 100) return { icon: "⭐", label: "Légendaire", color: C.yellow };
  return                  { icon: "🌱", label: "Débutant",  color: C.gray   };
}

export default function UserProfileScreen() {
  const { id }                        = useLocalSearchParams<{ id: string }>();
  const { user: me }                  = useAuthStore();
  const [profile, setProfile]         = useState<any>(null);
  const [userGames, setUserGames]     = useState<any[]>([]);
  const [reviews, setReviews]         = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [tab, setTab]                 = useState<"info"|"games"|"reviews">("info");

  const isMe = String(me?.id) === String(id);

  const load = async () => {
    try {
      const [pRes, ugRes, revRes] = await Promise.all([
        getUserApi(id),
        getUserGamesApi(id).catch(() => ({ data: { games: [] } })),
        getReviewsApi(id).catch(() => ({ data: { reviews: [] } })),
      ]);
      setProfile(pRes.data?.user || pRes.data);
      setUserGames(ugRes.data?.games || ugRes.data || []);
      setReviews(revRes.data?.reviews || revRes.data || []);
    } catch {
      Alert.alert("Erreur", "Profil introuvable");
      router.back();
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleReview = () => {
    let rating = 5;
    let comment = "";
    Alert.prompt?.("⭐ Laisser un avis", "Ton commentaire :", async (text) => {
      if (!text) return;
      try {
        await createReviewApi({ organizer_id: Number(id), rating, comment: text });
        Alert.alert("✅ Avis envoyé !");
        load();
      } catch (err: any) {
        Alert.alert("Erreur", err.response?.data?.message || "Erreur");
      }
    });
  };

  const handleReport = () => {
    Alert.alert(
      "🚨 Signaler",
      "Raison du signalement ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Triche",         onPress: () => sendReport("Triche / comportement frauduleux") },
        { text: "Comportement",   onPress: () => sendReport("Comportement abusif / toxique") },
        { text: "Faux résultats", onPress: () => sendReport("Résultats falsifiés") },
      ]
    );
  };

  const sendReport = async (reason: string) => {
    try {
      await createReportApi({ reported_user_id: Number(id), reason });
      Alert.alert("✅ Signalement envoyé");
    } catch (err: any) {
      Alert.alert("Erreur", err.response?.data?.message || "Erreur");
    }
  };

  if (loading) return (
    <SafeAreaView style={[s.root, { justifyContent: "center", alignItems: "center" }]}>
      <ActivityIndicator size="large" color={C.purple} />
    </SafeAreaView>
  );
  if (!profile) return null;

  const pts     = profile.points || 0;
  const lvl     = getLvl(pts);
  const nextPts = pts < 100 ? 100 : pts < 200 ? 200 : null;
  const progress = nextPts ? Math.min((pts / nextPts) * 100, 100) : 100;
  const avgRating = reviews.length
    ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <SafeAreaView style={s.root}>
      {/* Back */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.topTitle} numberOfLines={1}>{profile.username}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.purple} />}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{profile.username?.[0]?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.nameRow}>
              <Text style={s.username}>{profile.username}</Text>
              <View style={[s.lvlBadge, { backgroundColor: lvl.color + "25" }]}>
                <Text style={[s.lvlText, { color: lvl.color }]}>{lvl.icon} {lvl.label}</Text>
              </View>
            </View>
            {profile.role === "organizer" && (
              <View style={s.roleBadge}>
                <Text style={s.roleText}>🎖️ Organisateur</Text>
              </View>
            )}
            {profile.city && <Text style={s.city}>📍 {profile.city}</Text>}
            {profile.bio  && <Text style={s.bio}>"{profile.bio}"</Text>}
            {avgRating && <Text style={s.rating}>⭐ {avgRating}/5 · {reviews.length} avis</Text>}
          </View>
        </View>

        {/* XP */}
        <Card style={s.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ color: C.purple, fontWeight: "700" }}>{pts} pts</Text>
            <Text style={{ color: C.grayDark, fontSize: 12 }}>
              {nextPts ? `→ ${nextPts} pts` : "👑 MAX"}
            </Text>
          </View>
          <View style={s.xpBg}>
            <View style={[s.xpFill, { width: `${progress}%` as any }]} />
          </View>
        </Card>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { icon: "⭐", label: "Points", value: pts },
            { icon: "🎮", label: "Jeux",   value: userGames.length },
            { icon: "📝", label: "Avis",   value: reviews.length },
          ].map((st) => (
            <Card key={st.label} style={s.statCard}>
              <Text style={s.statIcon}>{st.icon}</Text>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </Card>
          ))}
        </View>

        {/* Actions (si pas moi) */}
        {!isMe && (
          <View style={s.actionsRow}>
            <Button label="💬 Défier"       onPress={() => router.push(`/chat/${profile.id}`)} style={{ flex: 1 }} />
            {profile.role === "organizer" && (
              <Button label="⭐ Avis"       onPress={handleReview} variant="outline" style={{ flex: 1 }} />
            )}
            <Button label="🚨 Signaler"     onPress={handleReport} variant="danger"  style={{ flex: 1 }} />
          </View>
        )}

        {/* Tabs */}
        <View style={s.tabs}>
          {(["info","games","reviews"] as const).map((t) => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                {t === "info" ? "📊 Infos" : t === "games" ? `🎮 Jeux (${userGames.length})` : `⭐ Avis (${reviews.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "info" && (
          <Card style={s.card}>
            {[
              { icon: "🎮", label: "Pseudo",       value: profile.username },
              { icon: "📍", label: "Ville",         value: profile.city || "Non précisé" },
              { icon: "💬", label: "Bio",           value: profile.bio  || "Aucune bio" },
              { icon: "🏅", label: "Niveau",        value: `${lvl.icon} ${lvl.label}` },
              { icon: "🏆", label: "Rôle",          value: profile.role || "player" },
              { icon: "📅", label: "Membre depuis", value: formatDate(profile.created_at) },
            ].map((row) => (
              <View key={row.label} style={s.infoRow}>
                <Text style={s.infoIcon}>{row.icon}</Text>
                <View>
                  <Text style={s.infoLabel}>{row.label}</Text>
                  <Text style={s.infoValue}>{row.value}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {tab === "games" && (
          <Card style={s.card}>
            {userGames.length === 0 ? (
              <Text style={s.empty}>Ce joueur n'a pas encore de jeux</Text>
            ) : userGames.map((g: any) => (
              <View key={g.id || g.game_id} style={s.gameRow}>
                <Text style={{ fontSize: 22 }}>🎮</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.gameName}>{g.name}</Text>
                  <Text style={s.gameLevel}>{g.level || "beginner"}</Text>
                </View>
                <Text style={s.gamePts}>{g.points || 0} pts</Text>
              </View>
            ))}
          </Card>
        )}

        {tab === "reviews" && (
          <Card style={[s.card, { marginBottom: 32 }]}>
            {reviews.length === 0 ? (
              <Text style={s.empty}>Aucun avis pour l'instant</Text>
            ) : reviews.map((r: any) => (
              <View key={r.id} style={s.reviewRow}>
                <View style={s.reviewAvatar}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                    {r.username?.[0]?.toUpperCase() || "?"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.reviewName}>{r.username}</Text>
                  <Text style={{ color: C.yellow, fontSize: 12 }}>{"⭐".repeat(Math.min(r.rating || 0, 5))}</Text>
                  {r.comment && <Text style={s.reviewComment}>{r.comment}</Text>}
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },
  topBar:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 8 },
  backBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bgCard, justifyContent: "center", alignItems: "center", borderWidth: 0.5, borderColor: C.border },
  backText:   { color: C.purple, fontSize: 18, fontWeight: "700" },
  topTitle:   { color: C.white, fontWeight: "700", fontSize: 16, flex: 1, textAlign: "center" },
  content:    { padding: 16 },
  hero:       { flexDirection: "row", gap: 14, alignItems: "flex-start", backgroundColor: C.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: C.border },
  avatar:     { width: 56, height: 56, borderRadius: 28, backgroundColor: C.purple, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  avatarText: { color: "#fff", fontWeight: "900", fontSize: 22 },
  nameRow:    { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 },
  username:   { color: C.white, fontWeight: "800", fontSize: 17 },
  lvlBadge:   { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  lvlText:    { fontSize: 11, fontWeight: "700" },
  roleBadge:  { backgroundColor: C.cyanFade, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 4 },
  roleText:   { color: C.cyan, fontSize: 11, fontWeight: "600" },
  city:       { color: C.gray, fontSize: 12, marginBottom: 2 },
  bio:        { color: C.gray, fontSize: 12, fontStyle: "italic", marginBottom: 2 },
  rating:     { color: C.yellow, fontSize: 12 },
  card:       { marginBottom: 12 },
  xpBg:       { height: 6, backgroundColor: C.border, borderRadius: 99, overflow: "hidden" },
  xpFill:     { height: 6, backgroundColor: C.purple, borderRadius: 99 },
  statsRow:   { flexDirection: "row", gap: 10, marginBottom: 12 },
  statCard:   { flex: 1, alignItems: "center", paddingVertical: 14 },
  statIcon:   { fontSize: 20, marginBottom: 4 },
  statValue:  { fontSize: 18, fontWeight: "800", color: C.white },
  statLabel:  { fontSize: 10, color: C.gray, marginTop: 2 },
  actionsRow: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  tabs:       { flexDirection: "row", backgroundColor: C.bgCard, borderRadius: 12, padding: 4, marginBottom: 12, borderWidth: 0.5, borderColor: C.border },
  tab:        { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 9 },
  tabActive:  { backgroundColor: C.purpleFade },
  tabText:    { color: C.gray, fontSize: 11, fontWeight: "600" },
  tabTextActive:{ color: C.purple },
  infoRow:    { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderColor: C.border },
  infoIcon:   { fontSize: 18, marginTop: 2 },
  infoLabel:  { color: C.gray, fontSize: 11, marginBottom: 2 },
  infoValue:  { color: C.white, fontSize: 13, fontWeight: "500", textTransform: "capitalize" },
  gameRow:    { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderColor: C.border },
  gameName:   { color: C.white, fontWeight: "600", fontSize: 13 },
  gameLevel:  { color: C.gray, fontSize: 11, marginTop: 1, textTransform: "capitalize" },
  gamePts:    { color: C.purple, fontWeight: "700", fontSize: 13 },
  reviewRow:  { flexDirection: "row", gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderColor: C.border },
  reviewAvatar:{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.purple, justifyContent: "center", alignItems: "center" },
  reviewName: { color: C.white, fontWeight: "600", fontSize: 13, marginBottom: 2 },
  reviewComment:{ color: C.gray, fontSize: 12, marginTop: 4 },
  empty:      { color: C.gray, textAlign: "center", paddingVertical: 20 },
});