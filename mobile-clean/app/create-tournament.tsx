import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { C } from "../src/theme/colors";
import { listGamesApi, createTournamentApi } from "../src/api/tournamentApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuthStore } from "../src/store/authStore";

const CITIES = [
  "Douala","Yaoundé","Bafoussam","Bamenda","Garoua",
  "Maroua","Ngaoundéré","Bertoua","Ebolowa","Kribi",
  "Limbe","Buea","Kumba","Foumban","Dschang",
];

const iStyle = {
  backgroundColor: C.bgInput,
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: C.white,
  fontSize: 14,
} as const;

export default function CreateTournamentScreen() {
  const { user }            = useAuthStore();
  const [games, setGames]   = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cityModal, setCityModal] = useState(false);
  const [gameModal, setGameModal] = useState(false);

  const [title, setTitle]                   = useState("");
  const [selectedGame, setSelectedGame]     = useState<any>(null);
  const [price, setPrice]                   = useState("0");
  const [maxPlayers, setMaxPlayers]         = useState("");
  const [type, setType]                     = useState<"online"|"physical">("online");
  const [city, setCity]                     = useState("");
  const [locationDetails, setLocationDetails] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);


// Formater la date pour le backend
const formatForBackend = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Formater pour affichage
const formatDisplay = (d: Date): string => {
  return d.toLocaleDateString("fr-FR", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

  useEffect(() => {
    if (!["organizer","admin"].includes(user?.role || "")) {
      Alert.alert("Accès refusé", "Réservé aux organisateurs");
      router.back();
      return;
    }
    listGamesApi()
      .then((r) => setGames(r.data?.games || r.data || []))
      .catch(() => Alert.alert("Erreur", "Impossible de charger les jeux"));
  }, [user?.role]);

  const handleSubmit = async () => {
    if (!title.trim())    return Alert.alert("Champ requis", "Entre le nom du tournoi");
    if (!selectedGame)    return Alert.alert("Champ requis", "Choisis un jeu");
    if (!maxPlayers)      return Alert.alert("Champ requis", "Entre le nombre de joueurs maximum");
    if (!selectedDate)    return Alert.alert("Champ requis", "Choisis la date et l'heure");
    if (type === "physical" && !city) return Alert.alert("Champ requis", "Choisis une ville");

    setLoading(true);
    try {
      const res = await createTournamentApi({
        title:            title.trim(),
        game_id:          selectedGame.id,
        price:            Number(price) || 0,
        max_players:      Number(maxPlayers),
        date:             formatForBackend(selectedDate),
        type,
        city:             type === "physical" ? city : null,
        location_details: type === "physical" ? locationDetails.trim() || null : null,
      });
      const t = res.data?.tournament;
      Alert.alert("🎉 Tournoi créé !", `"${title}" est maintenant visible.`, [
        { text: "Voir le tournoi", onPress: () => router.replace(`/tournament/${t?.id}`) },
        { text: "Retour", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Erreur", err.response?.data?.message || "Erreur lors de la création");
    } finally {
      setLoading(false); }
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>🏆 Créer un tournoi</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Nom */}
        <Text style={s.label}>Nom du tournoi *</Text>
        <TextInput
          style={iStyle}
          placeholder="Ex: Tournoi Free Fire Douala #1"
          placeholderTextColor={C.grayDark}
          value={title}
          onChangeText={setTitle}
        />

        {/* Jeu */}
        <Text style={s.label}>Jeu *</Text>
        <TouchableOpacity style={s.selectBtn} onPress={() => setGameModal(true)}>
          <Text style={selectedGame ? s.selectTxt : s.selectPlaceholder}>
            {selectedGame ? `🎮 ${selectedGame.name}` : "Sélectionner un jeu"}
          </Text>
          <Text style={s.selectArrow}>▾</Text>
        </TouchableOpacity>

        {/* Type */}
        <Text style={s.label}>Type *</Text>
        <View style={s.typeRow}>
          {[
            { v: "online"   as const, l: "🌐 En ligne",   desc: "Joueurs partout" },
            { v: "physical" as const, l: "📍 Présentiel", desc: "Lieu physique"   },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.v}
              style={[s.typeCard, type === opt.v && s.typeCardActive]}
              onPress={() => setType(opt.v)}
            >
              <Text style={[s.typeLabel, type === opt.v && { color: C.purple }]}>{opt.l}</Text>
              <Text style={s.typeDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ville + Lieu (si physique) */}
        {type === "physical" && (
          <View style={s.physicalBox}>
            <Text style={s.physicalTitle}>📍 Informations du lieu</Text>

            <Text style={s.label}>Ville *</Text>
            <TouchableOpacity style={s.selectBtn} onPress={() => setCityModal(true)}>
              <Text style={city ? s.selectTxt : s.selectPlaceholder}>
                {city || "Sélectionner une ville"}
              </Text>
              <Text style={s.selectArrow}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Adresse / Lieu exact</Text>
            <TextInput
              style={[iStyle, { marginTop: 0 }]}
              placeholder="Ex: Cyber Game Center, Rue de la Joie, Akwa"
              placeholderTextColor={C.grayDark}
              value={locationDetails}
              onChangeText={setLocationDetails}
              multiline
            />
          </View>
        )}

        {/* Prix & Joueurs */}
        <View style={s.row2}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Prix d'entrée (FCFA)</Text>
            <TextInput
              style={iStyle}
              placeholder="0 = Gratuit"
              placeholderTextColor={C.grayDark}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Joueurs max *</Text>
            <TextInput
              style={iStyle}
              placeholder="Ex: 32"
              placeholderTextColor={C.grayDark}
              value={maxPlayers}
              onChangeText={setMaxPlayers}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Date */}
       {/* Date */}
<Text style={s.label}>Date et heure *</Text>
<TouchableOpacity
  style={s.selectBtn}
  onPress={() => setShowDatePicker(true)}
>
  <Text style={s.selectTxt}>📅 {formatDisplay(selectedDate)}</Text>
  <Text style={s.selectArrow}>▾</Text>
</TouchableOpacity>

{/* Sélecteur de date */}
{showDatePicker && (
  <DateTimePicker
    value={selectedDate}
    mode={Platform.OS === "ios" ? "datetime" : "date"}
    display={Platform.OS === "ios" ? "spinner" : "default"}
    minimumDate={new Date()}
    onChange={(event, date) => {
      if (Platform.OS === "android") {
        setShowDatePicker(false);
        if (date) {
          const updated = new Date(selectedDate);
          updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
          setSelectedDate(updated);
          setShowTimePicker(true);
        }
      } else {
        if (date) setSelectedDate(date);
        setShowDatePicker(false);
      }
    }}
  />
)}

{/* Sélecteur d'heure */}
        {Platform.OS === "android" && showTimePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="time"
            display="default"
            onChange={(event, date) => {
              setShowTimePicker(false);
              if (date) {
                const updated = new Date(selectedDate);
                updated.setHours(date.getHours(), date.getMinutes());
                setSelectedDate(updated);
              }
            }}
          />
        )}
        {/* Récompenses */}
        <View style={s.rewardBox}>
          <Text style={s.rewardTitle}>🏅 Récompenses automatiques</Text>
          <View style={s.rewardRow}>
            {[["🥇","1er","+20 pts"],["🥈","2ème","+10 pts"],["🥉","3ème","+5 pts"]].map(([medal,rank,pts]) => (
              <View key={rank} style={s.rewardCard}>
                <Text style={s.rewardMedal}>{medal}</Text>
                <Text style={s.rewardRank}>{rank}</Text>
                <Text style={s.rewardPts}>{pts}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Boutons */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
            <Text style={s.cancelBtnTxt}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitBtnTxt}>🏆 Créer le tournoi</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal sélection jeu */}
      <Modal visible={gameModal} transparent animationType="slide" onRequestClose={() => setGameModal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setGameModal(false)}>
          <Pressable style={s.modalBox} onPress={() => {}}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Choisir un jeu</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {games.map((g) => (
                <TouchableOpacity
                  key={String(g.id)}
                  style={[s.modalOption, selectedGame?.id === g.id && s.modalOptionActive]}
                  onPress={() => { setSelectedGame(g); setGameModal(false); }}
                >
                  <Text style={s.modalOptionEmoji}>🎮</Text>
                  <Text style={[s.modalOptionTxt, selectedGame?.id === g.id && { color: C.purple }]}>
                    {g.name}
                  </Text>
                  {selectedGame?.id === g.id && <Text style={{ color: C.purple }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal sélection ville */}
      <Modal visible={cityModal} transparent animationType="slide" onRequestClose={() => setCityModal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setCityModal(false)}>
          <Pressable style={s.modalBox} onPress={() => {}}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Choisir une ville</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {CITIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[s.modalOption, city === c && s.modalOptionActive]}
                  onPress={() => { setCity(c); setCityModal(false); }}
                >
                  <Text style={s.modalOptionEmoji}>📍</Text>
                  <Text style={[s.modalOptionTxt, city === c && { color: C.purple }]}>{c}</Text>
                  {city === c && <Text style={{ color: C.purple }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: C.bg },
  header:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 10 },
  backBtn:          { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bgCard, justifyContent: "center", alignItems: "center" },
  backTxt:          { color: C.purple, fontSize: 18, fontWeight: "700" },
  title:            { fontSize: 18, fontWeight: "800", color: C.white },
  content:          { padding: 16, paddingBottom: 40 },
  label:            { color: C.gray, fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 16 },
  dateFmt:          { color: C.grayDark, fontSize: 11, fontWeight: "400" },
  selectBtn:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  selectTxt:        { color: C.white, fontSize: 14 },
  selectPlaceholder:{ color: C.grayDark, fontSize: 14 },
  selectArrow:      { color: C.gray, fontSize: 16 },
  typeRow:          { flexDirection: "row", gap: 10 },
  typeCard:         { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, backgroundColor: C.bgCard },
  typeCardActive:   { borderColor: C.purple, backgroundColor: C.purpleFade },
  typeLabel:        { color: C.white, fontWeight: "700", fontSize: 13, marginBottom: 3 },
  typeDesc:         { color: C.gray, fontSize: 11 },
  physicalBox:      { backgroundColor: C.purpleFade, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: C.purple, marginTop: 8 },
  physicalTitle:    { color: C.purple, fontWeight: "700", fontSize: 13, marginBottom: 4 },
  row2:             { flexDirection: "row", gap: 10 },
  rewardBox:        { backgroundColor: C.bgCard, borderRadius: 14, padding: 14, marginTop: 20, borderWidth: 0.5, borderColor: C.border },
  rewardTitle:      { color: C.white, fontWeight: "700", fontSize: 13, marginBottom: 12 },
  rewardRow:        { flexDirection: "row", gap: 8 },
  rewardCard:       { flex: 1, backgroundColor: C.bg, borderRadius: 10, padding: 10, alignItems: "center" },
  rewardMedal:      { fontSize: 22, marginBottom: 4 },
  rewardRank:       { color: C.white, fontSize: 12, fontWeight: "600" },
  rewardPts:        { color: C.purple, fontSize: 11, fontWeight: "700", marginTop: 2 },
  btnRow:           { flexDirection: "row", gap: 10, marginTop: 24 },
  cancelBtn:        { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 15, alignItems: "center" },
  cancelBtnTxt:     { color: C.gray, fontWeight: "600" },
  submitBtn:        { flex: 2, backgroundColor: C.purple, borderRadius: 14, padding: 15, alignItems: "center" },
  submitBtnTxt:     { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  modalBox:         { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12 },
  modalHandle:      { width: 40, height: 4, backgroundColor: C.border, borderRadius: 99, alignSelf: "center", marginBottom: 16 },
  modalTitle:       { fontSize: 17, fontWeight: "700", color: C.white, marginBottom: 16 },
  modalOption:      { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 0.5, borderColor: C.border },
  modalOptionActive:{ backgroundColor: C.purpleFade, borderRadius: 10, paddingHorizontal: 8, marginHorizontal: -8 },
  modalOptionEmoji: { fontSize: 20 },
  modalOptionTxt:   { flex: 1, color: C.white, fontSize: 15 },
});