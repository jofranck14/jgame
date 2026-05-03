import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  ScrollView, Alert, Platform,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuthStore } from "../../store/authStore";
import { TournamentStackParamList } from "../../navigation/types";
import { listTournamentsApi, listGamesApi, createTournamentApi } from "../../api/tournamentApi";
import { formatDateTime } from "../../utils/formatDate";
import { C } from "../../theme/colors";

type Nav = NativeStackNavigationProp<TournamentStackParamList>;

const STATUS_COLOR: Record<string, string> = {
  pending:   C.yellow,
  ongoing:   C.green,
  completed: C.grayDark,
  cancelled: C.red,
};
const STATUS_LABEL: Record<string, string> = {
  pending:   "À venir",
  ongoing:   "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

interface Tournament {
  id: number;
  title: string;
  game_name?: string;
  price: number;
  max_players: number;
  current_players: number;
  status: string;
  type: string;
  city?: string;
  date?: string;
}
interface Game { id: number; name: string; }

export default function TournamentsScreen() {
  // ← useNavigation typé avec TournamentStackParamList
  const navigation = useNavigation<Nav>();
  const { user, refreshUser } = useAuthStore();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [showCreate, setShowCreate]   = useState(false);
  const [games, setGames]             = useState<Game[]>([]);
  const [creating, setCreating]       = useState(false);
  const [form, setForm] = useState({
    title: "", game_id: "", price: "0", max_players: "8",
    city: "", type: "online" as "online" | "physical", location_details: "",
  });
  const [date, setDate]                     = useState<Date>(new Date(Date.now() + 86400000));
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
      load();
    }, [])
  );

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await listTournamentsApi();
      setTournaments(res.data?.tournaments || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const openCreate = async () => {
    if (games.length === 0) {
      try { const r = await listGamesApi(); setGames(r.data?.games || []); } catch {}
    }
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { Alert.alert("Erreur", "Titre requis"); return; }
    if (!form.game_id)      { Alert.alert("Erreur", "Choisis un jeu"); return; }
    setCreating(true);
    try {
      await createTournamentApi({
        title:            form.title.trim(),
        game_id:          Number(form.game_id),
        price:            Number(form.price) || 0,
        max_players:      Number(form.max_players) || 8,
        city:             form.city.trim() || undefined,
        type:             form.type,
        location_details: form.location_details.trim() || undefined,
        date:             date.toISOString(),
      });
      setShowCreate(false);
      setForm({ title: "", game_id: "", price: "0", max_players: "8",
                city: "", type: "online", location_details: "" });
      setDate(new Date(Date.now() + 86400000));
      load(true);
      Alert.alert("✅ Créé !", "Ton tournoi a été créé avec succès.");
    } catch (e: any) {
      Alert.alert("Erreur", e.response?.data?.message || "Impossible de créer le tournoi");
    } finally { setCreating(false); }
  };

  const canCreate = user?.role === "organizer" || user?.role === "admin";

  const renderItem = ({ item }: { item: Tournament }) => {
    const sc     = STATUS_COLOR[item.status] || C.gray;
    const isFull = item.current_players >= item.max_players;
    const pct    = item.max_players > 0
      ? Math.min(100, (item.current_players / item.max_players) * 100)
      : 0;
    const barColor = isFull ? C.red : pct >= 75 ? C.yellow : C.purple;

    return (
      // ← C'est ici le clic qui navigue vers le détail
      <TouchableOpacity
        style={s.card}
        onPress={() => navigation.navigate("TournamentDetail", { id: item.id })}
        activeOpacity={0.82}
      >
        <View style={[s.cardAccent, { backgroundColor: sc }]} />
        <View style={s.cardInner}>

          <View style={s.cardTopRow}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[s.badge, { backgroundColor: sc + "22", borderColor: sc }]}>
              <Text style={[s.badgeText, { color: sc }]}>
                {STATUS_LABEL[item.status] || item.status}
              </Text>
            </View>
          </View>

          <Text style={s.cardSub}>
            🎮 {item.game_name || "—"}
            {"  ·  "}
            {item.type === "physical" ? "🏟️ Présentiel" : "🌐 En ligne"}
            {item.city ? `  ·  📍 ${item.city}` : ""}
          </Text>

          <Text style={s.cardDate}>📅 {formatDateTime(item.date)}</Text>

          <View style={s.cardBottom}>
            <Text style={s.cardPrice}>
              {Number(item.price) > 0
                ? `${Number(item.price).toLocaleString()} FCFA`
                : "Gratuit"}
            </Text>
            <View style={s.playersRow}>
              <View style={s.progressBg}>
                <View style={[s.progressFill,
                  { width: `${pct}%` as any, backgroundColor: barColor }]} />
              </View>
              <Text style={[s.playersText, isFull && { color: C.red }]}>
                {item.current_players}/{item.max_players}
              </Text>
            </View>
          </View>

        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Tournois</Text>
          <Text style={s.headerSub}>
            {tournaments.length} tournoi{tournaments.length !== 1 ? "s" : ""}
          </Text>
        </View>
        {canCreate && (
          <TouchableOpacity style={s.createBtn} onPress={openCreate}>
            <Text style={s.createBtnText}>+ Créer</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.purple} />
        </View>
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={C.purple}
            />
          }
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyEmoji}>🏆</Text>
              <Text style={s.emptyText}>Aucun tournoi disponible</Text>
              {canCreate && (
                <TouchableOpacity style={[s.createBtn, { marginTop: 16 }]} onPress={openCreate}>
                  <Text style={s.createBtnText}>Créer le premier</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── Modal Créer tournoi ── */}
      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={s.overlay}>
          <ScrollView style={s.modalBox} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>🏆 Créer un tournoi</Text>

            <Text style={s.label}>Titre *</Text>
            <TextInput style={s.input} placeholder="Nom du tournoi"
              placeholderTextColor={C.grayDark} value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />

            <Text style={s.label}>Jeu *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {games.map((g) => (
                <TouchableOpacity key={g.id}
                  style={[s.chip, form.game_id === String(g.id) && s.chipActive]}
                  onPress={() => setForm((f) => ({ ...f, game_id: String(g.id) }))}>
                  <Text style={[s.chipText, form.game_id === String(g.id) && { color: "#fff" }]}>
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>Date et heure *</Text>
            <TouchableOpacity style={s.dateTrigger} onPress={() => setShowDatePicker(true)}>
              <Text style={s.dateTriggerText}>
                📅 {date.toLocaleDateString("fr-FR",
                  { day: "2-digit", month: "short", year: "numeric" })}
                {"   🕐 "}
                {date.toLocaleTimeString("fr-FR",
                  { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="datetime"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date()}
                onChange={(_, d) => {
                  if (Platform.OS === "android") setShowDatePicker(false);
                  if (d) setDate(d);
                }}
              />
            )}
            {Platform.OS === "ios" && showDatePicker && (
              <TouchableOpacity style={[s.createBtn, { marginBottom: 14 }]}
                onPress={() => setShowDatePicker(false)}>
                <Text style={s.createBtnText}>Confirmer la date</Text>
              </TouchableOpacity>
            )}

            <Text style={s.label}>Prix d'entrée (FCFA)</Text>
            <TextInput style={s.input} placeholder="0 = gratuit"
              placeholderTextColor={C.grayDark} keyboardType="numeric"
              value={form.price}
              onChangeText={(v) => setForm((f) => ({ ...f, price: v }))} />

            <Text style={s.label}>Nombre max de joueurs</Text>
            <TextInput style={s.input} placeholder="8"
              placeholderTextColor={C.grayDark} keyboardType="numeric"
              value={form.max_players}
              onChangeText={(v) => setForm((f) => ({ ...f, max_players: v }))} />

            <Text style={s.label}>Type</Text>
            <View style={s.typeRow}>
              {(["online", "physical"] as const).map((t) => (
                <TouchableOpacity key={t}
                  style={[s.typeBtn, form.type === t && s.typeBtnActive]}
                  onPress={() => setForm((f) => ({ ...f, type: t }))}>
                  <Text style={[s.typeBtnText, form.type === t && { color: "#fff" }]}>
                    {t === "online" ? "🌐 En ligne" : "🏟️ Présentiel"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {form.type === "physical" && (
              <>
                <Text style={s.label}>Ville</Text>
                <TextInput style={s.input} placeholder="Ex: Douala"
                  placeholderTextColor={C.grayDark} value={form.city}
                  onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} />
                <Text style={s.label}>Détails du lieu</Text>
                <TextInput style={s.input} placeholder="Adresse, salle..."
                  placeholderTextColor={C.grayDark} value={form.location_details}
                  onChangeText={(v) => setForm((f) => ({ ...f, location_details: v }))} />
              </>
            )}

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={s.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.submitBtn, creating && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.submitBtnText}>Créer le tournoi</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: C.bg },
  center:         { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  header:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  headerTitle:    { color: C.white, fontSize: 24, fontWeight: "800" },
  headerSub:      { color: C.grayDark, fontSize: 12, marginTop: 2 },
  createBtn:      { backgroundColor: C.purple, borderRadius: 10,
                    paddingHorizontal: 16, paddingVertical: 9 },
  createBtnText:  { color: "#fff", fontWeight: "700", fontSize: 13 },
  emptyEmoji:     { fontSize: 40, marginBottom: 8 },
  emptyText:      { color: C.gray, fontSize: 14 },
  card:           { backgroundColor: C.bgCard, borderRadius: 18, marginBottom: 12,
                    overflow: "hidden", borderWidth: 1, borderColor: C.border },
  cardAccent:     { height: 3, width: "100%" },
  cardInner:      { padding: 16 },
  cardTopRow:     { flexDirection: "row", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 5 },
  cardTitle:      { color: C.white, fontWeight: "700", fontSize: 15, flex: 1, marginRight: 8 },
  badge:          { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  badgeText:      { fontSize: 11, fontWeight: "600" },
  cardSub:        { color: C.gray, fontSize: 12, marginBottom: 3 },
  cardDate:       { color: C.grayDark, fontSize: 11, marginBottom: 10 },
  cardBottom:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardPrice:      { color: C.yellow, fontWeight: "700", fontSize: 15 },
  playersRow:     { flexDirection: "row", alignItems: "center", gap: 8 },
  progressBg:     { width: 70, height: 5, backgroundColor: C.border,
                    borderRadius: 3, overflow: "hidden" },
  progressFill:   { height: 5, borderRadius: 3 },
  playersText:    { color: C.gray, fontSize: 12 },
  overlay:        { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalBox:       { backgroundColor: C.bgCard, borderTopLeftRadius: 24,
                    borderTopRightRadius: 24, padding: 22, maxHeight: "92%" },
  modalTitle:     { color: C.white, fontSize: 19, fontWeight: "800",
                    marginBottom: 18, textAlign: "center" },
  label:          { color: C.gray, fontSize: 12, marginBottom: 6, fontWeight: "600" },
  input:          { backgroundColor: C.bg, borderRadius: 12, padding: 13, color: C.white,
                    fontSize: 14, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  dateTrigger:    { backgroundColor: C.bg, borderRadius: 12, padding: 14,
                    borderWidth: 1, borderColor: C.purple, marginBottom: 14 },
  dateTriggerText:{ color: C.white, fontSize: 14 },
  chip:           { backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 14,
                    paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: C.border },
  chipActive:     { backgroundColor: C.purple, borderColor: C.purple },
  chipText:       { color: C.gray, fontSize: 13 },
  typeRow:        { flexDirection: "row", gap: 10, marginBottom: 14 },
  typeBtn:        { flex: 1, padding: 12, borderRadius: 12,
                    borderWidth: 1, borderColor: C.border, alignItems: "center" },
  typeBtnActive:  { backgroundColor: C.purple, borderColor: C.purple },
  typeBtnText:    { color: C.gray, fontSize: 13 },
  modalActions:   { flexDirection: "row", gap: 10, marginTop: 6, marginBottom: 24 },
  cancelBtn:      { flex: 1, padding: 14, borderRadius: 12,
                    borderWidth: 1, borderColor: C.border, alignItems: "center" },
  cancelBtnText:  { color: C.gray, fontWeight: "600" },
  submitBtn:      { flex: 1, padding: 14, borderRadius: 12,
                    backgroundColor: C.purple, alignItems: "center" },
  submitBtnText:  { color: "#fff", fontWeight: "700", fontSize: 15 },
});