import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl, Modal, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { C } from "../../src/theme/colors";
import Card from "../../src/components/ui/Card";
import StatusBadge from "../../src/components/ui/StatusBadge";
import { listTournamentsApi, listGamesApi } from "../../src/api/tournamentApi";
import { useAuthStore } from "../../src/store/authStore";
import { formatDateTime } from "../../src/utils/formatDate";

const PER_PAGE = 8;

const STATUS_OPTIONS = [
  { v: "",          l: "Tous",     emoji: "🔄" },
  { v: "pending",   l: "À venir",  emoji: "⏳" },
  { v: "ongoing",   l: "En cours", emoji: "▶️" },
  { v: "completed", l: "Terminé",  emoji: "✅" },
  { v: "cancelled", l: "Annulé",   emoji: "❌" },
];

const TYPE_OPTIONS = [
  { v: "",         l: "Tous",        emoji: "🔄" },
  { v: "online",   l: "En ligne",    emoji: "🌐" },
  { v: "physical", l: "Présentiel",  emoji: "📍" },
];

export default function TournamentsScreen() {
  const { user }                      = useAuthStore();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [games, setGames]             = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const [search, setSearch]             = useState("");
  const [filterGame, setFilterGame]     = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType]     = useState("");
  const [page, setPage]                 = useState(1);
  const [filterModal, setFilterModal]   = useState(false);

  const canCreate = ["organizer", "admin"].includes(user?.role || "");

  useEffect(() => {
    listGamesApi()
      .then((r) => setGames(r.data?.games || r.data || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await listTournamentsApi();
      setTournaments(res.data?.tournaments || res.data?.data || res.data || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tournaments.filter((t) => {
    const mS  = !search       || t.title?.toLowerCase().includes(search.toLowerCase());
    const mG  = !filterGame   || String(t.game_id) === String(filterGame);
    const mSt = !filterStatus || t.status  === filterStatus;
    const mT  = !filterType   || t.type    === filterType;
    return mS && mG && mSt && mT;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasFilters = !!(search || filterGame || filterStatus || filterType);
  const activeFiltersCount = [filterGame, filterStatus, filterType].filter(Boolean).length;

  const reset = () => {
    setSearch(""); setFilterGame(""); setFilterStatus(""); setFilterType(""); setPage(1);
  };

  return (
    <SafeAreaView style={s.root}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>🏆 Tournois</Text>
          <Text style={s.sub}>
            {loading ? "Chargement..." : `${filtered.length} résultat${filtered.length !== 1 ? "s" : ""}`}
          </Text>
        </View>

        <View style={s.headerActions}>
          {/* Bouton filtres */}
          <TouchableOpacity
            style={[s.iconBtn, activeFiltersCount > 0 && s.iconBtnActive]}
            onPress={() => setFilterModal(true)}
          >
            <Text style={s.iconBtnEmoji}>⚙️</Text>
            {activeFiltersCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Bouton créer — visible uniquement pour organizer/admin */}
          {canCreate && (
            <TouchableOpacity
              style={s.createBtn}
              onPress={() => router.push("/create-tournament")}
              activeOpacity={0.85}
            >
              <Text style={s.createBtnTxt}>+ Créer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Barre de recherche ── */}
      <View style={s.searchRow}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher un tournoi..."
          placeholderTextColor={C.grayDark}
          value={search}
          onChangeText={(v) => { setSearch(v); setPage(1); }}
        />
        {!!search && (
          <TouchableOpacity onPress={() => { setSearch(""); setPage(1); }} hitSlop={8}>
            <Text style={{ color: C.gray, fontSize: 16, paddingHorizontal: 8 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filtres rapides (chips statut) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipsScroll}
        contentContainerStyle={s.chipsContent}
      >
        {STATUS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.v}
            style={[s.chip, filterStatus === opt.v && s.chipActive]}
            onPress={() => { setFilterStatus(opt.v); setPage(1); }}
          >
            <Text style={[s.chipTxt, filterStatus === opt.v && s.chipTxtActive]}>
              {opt.emoji} {opt.l}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Liste ── */}
      <ScrollView
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.purple}
          />
        }
      >
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={C.purple} />
          </View>
        ) : paginated.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🏆</Text>
            <Text style={s.emptyTitle}>Aucun tournoi trouvé</Text>
            {hasFilters && (
              <TouchableOpacity onPress={reset} style={s.resetBtn}>
                <Text style={s.resetBtnTxt}>✕ Effacer les filtres</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          paginated.map((t) => {
            const isFull   = t.current_players >= t.max_players;
            const progress = t.max_players > 0
              ? Math.min((t.current_players / t.max_players) * 100, 100)
              : 0;
            const barColor = isFull ? C.red : progress >= 75 ? C.yellow : C.purple;

            return (
              <TouchableOpacity
                key={String(t.id)}
                onPress={() => router.push(`/tournament/${t.id}`)}
                activeOpacity={0.85}
              >
                <Card style={s.card}>
                  {/* Top */}
                  <View style={s.cardTop}>
                    <StatusBadge status={t.status} />
                    <Text style={s.price}>
                      {t.price > 0 ? `${Number(t.price).toLocaleString()} FCFA` : "Gratuit"}
                    </Text>
                  </View>

                  {/* Titre */}
                  <Text style={s.cardTitle} numberOfLines={1}>{t.title}</Text>

                  {/* Infos */}
                  <View style={s.cardInfoRow}>
                    <Text style={s.cardInfo}>🎮 {t.game_name || "—"}</Text>
                    <Text style={s.cardInfoDot}>·</Text>
                    <Text style={s.cardInfo}>
                      {t.type === "physical" ? `📍 ${t.city || "Physique"}` : "🌐 En ligne"}
                    </Text>
                  </View>

                  {t.date && (
                    <Text style={s.cardDate}>📅 {formatDateTime(t.date)}</Text>
                  )}

                  {/* Barre de places */}
                  <View style={s.barRow}>
                    <Text style={[s.barLabel, isFull && { color: C.red }]}>
                      {isFull ? "🔴 Complet" : `👥 ${t.current_players}/${t.max_players}`}
                    </Text>
                    <View style={s.barBg}>
                      <View style={[s.barFill, {
                        width: `${progress}%` as any,
                        backgroundColor: barColor,
                      }]} />
                    </View>
                    <Text style={s.barPct}>{Math.round(progress)}%</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <View style={s.pgRow}>
            <TouchableOpacity
              style={[s.pgBtn, page === 1 && s.pgOff]}
              disabled={page === 1}
              onPress={() => setPage(page - 1)}
            >
              <Text style={s.pgTxt}>←</Text>
            </TouchableOpacity>
            <Text style={s.pgInfo}>{page} / {totalPages}</Text>
            <TouchableOpacity
              style={[s.pgBtn, page === totalPages && s.pgOff]}
              disabled={page === totalPages}
              onPress={() => setPage(page + 1)}
            >
              <Text style={s.pgTxt}>→</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Modal filtres avancés ── */}
      <Modal visible={filterModal} transparent animationType="slide" onRequestClose={() => setFilterModal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setFilterModal(false)}>
          <Pressable style={s.modalBox} onPress={() => {}}>

            {/* Poignée */}
            <View style={s.modalHandle} />

            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Filtres avancés</Text>
              {activeFiltersCount > 0 && (
                <TouchableOpacity onPress={reset}>
                  <Text style={s.modalReset}>Tout effacer</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Jeu */}
            <Text style={s.filterLabel}>🎮 Jeu</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <TouchableOpacity
                style={[s.chip, !filterGame && s.chipActive]}
                onPress={() => setFilterGame("")}
              >
                <Text style={[s.chipTxt, !filterGame && s.chipTxtActive]}>Tous</Text>
              </TouchableOpacity>
              {games.map((g) => (
                <TouchableOpacity
                  key={String(g.id)}
                  style={[s.chip, String(filterGame) === String(g.id) && s.chipActive]}
                  onPress={() => setFilterGame(String(g.id))}
                >
                  <Text style={[s.chipTxt, String(filterGame) === String(g.id) && s.chipTxtActive]}>
                    🎮 {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Type */}
            <Text style={s.filterLabel}>📡 Type</Text>
            <View style={s.chipWrap}>
              {TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.v}
                  style={[s.chip, filterType === opt.v && s.chipActive]}
                  onPress={() => setFilterType(opt.v)}
                >
                  <Text style={[s.chipTxt, filterType === opt.v && s.chipTxtActive]}>
                    {opt.emoji} {opt.l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bouton appliquer */}
            <TouchableOpacity
              style={s.applyBtn}
              onPress={() => { setPage(1); setFilterModal(false); }}
            >
              <Text style={s.applyBtnTxt}>
                Appliquer{activeFiltersCount > 0 ? ` (${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""})` : ""}
              </Text>
            </TouchableOpacity>

          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  title:        { fontSize: 22, fontWeight: "800", color: C.white },
  sub:          { fontSize: 12, color: C.gray, marginTop: 2 },
  headerActions:{ flexDirection: "row", gap: 10, alignItems: "center" },
  iconBtn:      { width: 38, height: 38, borderRadius: 12, backgroundColor: C.bgCard, justifyContent: "center", alignItems: "center", borderWidth: 0.5, borderColor: C.border },
  iconBtnActive:{ borderColor: C.purple, backgroundColor: C.purpleFade },
  iconBtnEmoji: { fontSize: 18 },
  badge:        { position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: C.red, justifyContent: "center", alignItems: "center" },
  badgeTxt:     { color: "#fff", fontSize: 9, fontWeight: "800" },
  createBtn:    { backgroundColor: C.purple, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
  createBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  searchRow:    { flexDirection: "row", alignItems: "center", backgroundColor: C.bgCard, borderRadius: 12, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, borderWidth: 0.5, borderColor: C.border },
  searchIcon:   { fontSize: 15, marginRight: 8 },
  searchInput:  { flex: 1, color: C.white, fontSize: 14, paddingVertical: 11 },
  chipsScroll:  { flexGrow: 0, marginBottom: 8 },
  chipsContent: { paddingHorizontal: 16, gap: 8, flexDirection: "row" },
  chip:         { borderWidth: 1, borderColor: C.border, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive:   { backgroundColor: C.purpleFade, borderColor: C.purple },
  chipTxt:      { color: C.gray, fontSize: 12, fontWeight: "500" },
  chipTxtActive:{ color: C.purple, fontWeight: "700" },
  chipWrap:     { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  list:         { padding: 16, paddingTop: 4, paddingBottom: 24 },
  card:         { marginBottom: 10 },
  cardTop:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  price:        { color: C.cyan, fontWeight: "700", fontSize: 14 },
  cardTitle:    { fontSize: 15, fontWeight: "700", color: C.white, marginBottom: 5 },
  cardInfoRow:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  cardInfo:     { fontSize: 12, color: C.gray },
  cardInfoDot:  { fontSize: 12, color: C.grayDark },
  cardDate:     { fontSize: 11, color: C.grayDark, marginBottom: 8 },
  barRow:       { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  barLabel:     { fontSize: 11, color: C.gray, width: 82, flexShrink: 0 },
  barBg:        { flex: 1, height: 5, backgroundColor: C.border, borderRadius: 99, overflow: "hidden" },
  barFill:      { height: 5, borderRadius: 99 },
  barPct:       { fontSize: 10, color: C.grayDark, width: 30, textAlign: "right" },
  center:       { paddingTop: 60, alignItems: "center" },
  emptyBox:     { alignItems: "center", paddingVertical: 60 },
  emptyTitle:   { color: C.gray, fontSize: 16, fontWeight: "600" },
  resetBtn:     { marginTop: 16, borderWidth: 1, borderColor: C.border, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8 },
  resetBtnTxt:  { color: C.gray, fontSize: 13 },
  pgRow:        { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 16, paddingVertical: 16 },
  pgBtn:        { backgroundColor: C.bgCard, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 0.5, borderColor: C.border },
  pgOff:        { opacity: 0.35 },
  pgTxt:        { color: C.white, fontSize: 16 },
  pgInfo:       { color: C.gray, fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  modalBox:     { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12 },
  modalHandle:  { width: 40, height: 4, backgroundColor: C.border, borderRadius: 99, alignSelf: "center", marginBottom: 16 },
  modalHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle:   { fontSize: 18, fontWeight: "700", color: C.white },
  modalReset:   { color: C.red, fontSize: 13, fontWeight: "600" },
  filterLabel:  { color: C.gray, fontSize: 13, fontWeight: "600", marginBottom: 10 },
  applyBtn:     { backgroundColor: C.purple, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  applyBtnTxt:  { color: "#fff", fontWeight: "700", fontSize: 15 },
});