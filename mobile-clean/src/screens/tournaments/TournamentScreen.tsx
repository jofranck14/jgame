import React, { useCallback, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Modal,
  Image, Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";
import { TournamentStackParamList } from "../../navigation/types";
import { getTournamentApi, joinTournamentApi } from "../../api/tournamentApi";
import api from "../../api/api";
import { formatDateTime } from "../../utils/formatDate";
import { C } from "../../theme/colors";

type RouteP = RouteProp<TournamentStackParamList, "TournamentDetail">;

/* ─── StatusBadge ─────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pending:   { label: "À venir",  color: C.yellow },
    ongoing:   { label: "En cours", color: C.green },
    completed: { label: "Terminé",  color: C.grayDark },
    cancelled: { label: "Annulé",   color: C.red },
  };
  const { label, color } = map[status] ?? map.pending;
  return (
    <View style={[sb.wrap, { backgroundColor: color + "22", borderColor: color }]}>
      <Text style={[sb.text, { color }]}>{label}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, alignSelf: "flex-start" },
  text: { fontSize: 11, fontWeight: "700" },
});

/* ─── PlacesBar ───────────────────────────────────────── */
function PlacesBar({ current, max }: { current: number; max: number }) {
  const pct      = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const isFull   = current >= max;
  const isWarn   = pct >= 75 && !isFull;
  const barColor = isFull ? C.red : isWarn ? C.yellow : C.purple;
  const remaining = max - current;

  return (
    <View>
      <View style={pb.row}>
        <Text style={pb.label}>👥 Places</Text>
        <Text style={[pb.count, isFull && { color: C.red }, isWarn && { color: C.yellow }]}>
          {current} / {max}
        </Text>
      </View>
      <View style={pb.track}>
        <View style={[pb.fill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
      <View style={pb.row}>
        <Text style={pb.pct}>{Math.round(pct)}% rempli</Text>
        {isFull
          ? <Text style={pb.fullText}>🔴 Complet — inscriptions fermées</Text>
          : <Text style={[pb.rem, isWarn && { color: C.yellow }]}>
              {remaining} place{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}
            </Text>
        }
      </View>
    </View>
  );
}
const pb = StyleSheet.create({
  row:      { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label:    { color: C.gray, fontSize: 13, fontWeight: "600" },
  count:    { color: C.white, fontSize: 13, fontWeight: "700" },
  track:    { height: 10, borderRadius: 5, backgroundColor: C.bgCard,
              overflow: "hidden", marginBottom: 6 },
  fill:     { height: 10, borderRadius: 5 },
  pct:      { color: C.grayDark, fontSize: 11 },
  fullText: { color: C.red, fontSize: 11, fontWeight: "600" },
  rem:      { color: C.green, fontSize: 11, fontWeight: "600" },
});

/* ─── InfoTile ────────────────────────────────────────── */
function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={it.wrap}>
      <Text style={it.label}>{label}</Text>
      <Text style={it.value}>{value}</Text>
    </View>
  );
}
const it = StyleSheet.create({
  wrap:  { flex: 1, backgroundColor: C.bg, borderRadius: 12, padding: 12,
           borderWidth: 1, borderColor: C.border, margin: 4 },
  label: { color: C.grayDark, fontSize: 11, marginBottom: 3 },
  value: { color: C.white, fontWeight: "600", fontSize: 13 },
});

/* ══════════════════════════════════════════════════════ */
/*                  TournamentScreen                      */
/* ══════════════════════════════════════════════════════ */
export default function TournamentScreen() {
  const route      = useRoute<RouteP>();
  const navigation = useNavigation();
  const { user }   = useAuthStore();
  const { id }     = route.params;

  const [tournament, setTournament]     = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [joining, setJoining]           = useState(false);

  // Modal paiement
  const [payModal, setPayModal]         = useState(false);
  const [paymentInfo, setPaymentInfo]   = useState<any>(null);
  const [proofUri, setProofUri]         = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getTournamentApi(id);
      setTournament(res.data?.tournament ?? res.data);
    } catch {
      Alert.alert("Erreur", "Tournoi introuvable");
      navigation.goBack();
    } finally { setLoading(false); setRefreshing(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /* ── Rejoindre ── */
  const handleJoin = async () => {
    if (!tournament) return;
    if (tournament.current_players >= tournament.max_players) {
      Alert.alert("Complet", "Ce tournoi n'a plus de places disponibles.");
      return;
    }
    setJoining(true);
    try {
      const res  = await joinTournamentApi(id);
      const data = res.data;
      if (data?.paymentRequired) {
        setPaymentInfo(data.payment);
        setPayModal(true);
      } else {
        Alert.alert("🎉 Inscrit !", "Tu as rejoint le tournoi avec succès !");
        load(true);
      }
    } catch (e: any) {
      const msg = e.response?.data?.message ?? "Erreur";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("déjà")) {
        Alert.alert("Déjà inscrit", "Tu es déjà inscrit à ce tournoi.");
      } else {
        Alert.alert("Erreur", msg);
      }
      load(true);
    } finally { setJoining(false); }
  };

  /* ── Choisir image preuve ── */
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProofUri(result.assets[0].uri);
    }
  };

  /* ── Envoyer preuve ── */
  const submitPayment = async () => {
    if (!proofUri) { Alert.alert("", "Ajoute la capture d'écran de ton paiement"); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("payment_id", String(paymentInfo?.id));
      formData.append("method",     "mtn");
      formData.append("proof_image", {
        uri:  proofUri,
        type: "image/jpeg",
        name: "proof.jpg",
      } as any);
      await api.patch("/payments/proof", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Alert.alert("✅ Envoyé !", "Capture envoyée. En attente de validation admin (24h).");
      setPayModal(false);
      setProofUri(null);
      load(true);
    } catch (e: any) {
      Alert.alert("Erreur", e.response?.data?.message ?? "Erreur lors de l'envoi");
    } finally { setSubmitting(false); }
  };

  /* ── Loading ── */
  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={C.purple} />
    </View>
  );
  if (!tournament) return null;

  const current       = tournament.current_players || 0;
  const max           = tournament.max_players     || 0;
  const price         = Number(tournament.price)   || 0;
  const isFull        = current >= max;
  const isCompleted   = tournament.status === "completed";
  const isCancelled   = tournament.status === "cancelled";
  const isOngoing     = tournament.status === "ongoing";
  const canJoin       = !isFull && !isCompleted && !isCancelled && !isOngoing && !!user;
  const isParticipant = tournament.participants?.some(
    (p: any) => Number(p.user_id) === Number(user?.id)
  );
  const pct           = max > 0 ? (current / max) * 100 : 0;
  const remaining     = max - current;
  const prizePool     = price > 0
    ? `${Math.round(price * max * 0.7).toLocaleString()} FCFA`
    : "Trophée JGAME 🏆";

  return (
    <>
      <ScrollView
        style={s.root}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.purple} />
        }
      >
        {/* ── Back ── */}
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>

        {/* ══ HERO ══ */}
        <View style={s.hero}>
          {/* Glow */}
          <View style={s.heroGlow} />

          <StatusBadge status={tournament.status} />

          <View style={s.heroContent}>
            <View style={s.heroLeft}>
              <Text style={s.heroTitle}>{tournament.title}</Text>
              <Text style={s.heroMeta}>
                🎮 {tournament.game_name || "—"}
                {tournament.city ? `  ·  📍 ${tournament.city}` : ""}
                {"  ·  "}
                {tournament.type === "physical" ? "Présentiel" : "🌐 En ligne"}
              </Text>
            </View>
            <View style={s.heroRight}>
              <Text style={s.heroPrice}>
                {price > 0 ? `${price.toLocaleString()} FCFA` : "Gratuit"}
              </Text>
              <Text style={s.heroPriceLbl}>Prix d'entrée</Text>
            </View>
          </View>
        </View>

        {/* ── Infos grid 2×2 ── */}
        <View style={s.infoGrid}>
          <InfoTile label="📅 Date de début" value={formatDateTime(tournament.date)} />
          <InfoTile label="🏟️ Type"
            value={tournament.type === "physical" ? "Présentiel" : "🌐 En ligne"} />
          <InfoTile label="🥇 1ère place"    value="+20 pts" />
          <InfoTile label="🥈 2ème place"    value="+10 pts" />
        </View>

        {/* ── Lieu ── */}
        {(tournament.location_details || tournament.city) && (
          <View style={s.card}>
            <Text style={s.cardTitle}>
              {tournament.type === "physical" ? "📍 Lieu du tournoi" : "ℹ️ Détails"}
            </Text>
            {tournament.city && (
              <Text style={s.locCity}>🏙️ {tournament.city}</Text>
            )}
            {tournament.location_details && (
              <View style={s.locDetails}>
                <Text style={s.locDetailsText}>{tournament.location_details}</Text>
              </View>
            )}
            {tournament.type === "physical" && (
              <Text style={s.locHint}>
                📌 Présente-toi à l'adresse indiquée à l'heure du tournoi.
              </Text>
            )}
          </View>
        )}

        {/* ── Barre de places ── */}
        <View style={s.card}>
          <PlacesBar current={current} max={max} />
        </View>

        {/* ══ COLONNE ACTION (prize pool + bouton) ══ */}
        <View style={s.actionCard}>
          <Text style={s.prizeIcon}>🏆</Text>
          <Text style={s.prizeLabel}>Prize pool estimé</Text>
          <Text style={s.prizeValue}>{prizePool}</Text>
          <Text style={s.prizeNote}>70% du pool · 10% JGAME</Text>

          <View style={s.actionDivider} />

          {/* CTA selon statut */}
          {isFull ? (
            <View style={[s.ctaBox, { backgroundColor: C.redFade, borderColor: C.red }]}>
              <Text style={[s.ctaText, { color: C.red }]}>🔴 Tournoi complet</Text>
            </View>
          ) : isCompleted ? (
            <View style={[s.ctaBox, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <Text style={[s.ctaText, { color: C.grayDark }]}>Tournoi terminé</Text>
            </View>
          ) : isCancelled ? (
            <View style={[s.ctaBox, { backgroundColor: C.redFade, borderColor: C.red }]}>
              <Text style={[s.ctaText, { color: C.red }]}>Tournoi annulé</Text>
            </View>
          ) : isOngoing ? (
            <View style={[s.ctaBox, { backgroundColor: C.yellowFade, borderColor: C.yellow }]}>
              <Text style={[s.ctaText, { color: C.yellow }]}>🟡 En cours — inscriptions fermées</Text>
            </View>
          ) : isParticipant ? (
            <View style={[s.ctaBox, { backgroundColor: C.greenFade, borderColor: C.green }]}>
              <Text style={[s.ctaText, { color: C.green }]}>✅ Tu es inscrit à ce tournoi</Text>
            </View>
          ) : !user ? (
            <View style={[s.ctaBox, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <Text style={[s.ctaText, { color: C.gray }]}>Connecte-toi pour rejoindre</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.joinBtn, joining && { opacity: 0.6 }]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.joinBtnText}>
                    {price > 0 ? `💳 Rejoindre & Payer` : "🎮 Rejoindre gratuitement"}
                  </Text>
              }
            </TouchableOpacity>
          )}

          {/* Urgence places */}
          {canJoin && !isParticipant && pct >= 90 && (
            <Text style={s.urgenceRed}>
              🔥 Dépêche-toi ! Plus que {remaining} place{remaining > 1 ? "s" : ""} !
            </Text>
          )}
          {canJoin && !isParticipant && pct >= 75 && pct < 90 && (
            <Text style={s.urgenceYellow}>
              ⚡ {remaining} place{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}
            </Text>
          )}
        </View>

        {/* ── Participants ── */}
        {tournament.participants?.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>
              👥 Participants ({tournament.participants.length})
            </Text>
            {tournament.participants.map((p: any) => (
              <View key={p.user_id} style={s.participantRow}>
                <View style={s.pAvatar}>
                  <Text style={s.pAvatarText}>{p.username?.[0]?.toUpperCase()}</Text>
                </View>
                <Text style={s.pName}>{p.username}</Text>
                <View style={[s.pStatus,
                  p.payment_status === "paid"
                    ? { backgroundColor: C.greenFade, borderColor: C.green }
                    : { backgroundColor: C.yellowFade, borderColor: C.yellow }
                ]}>
                  <Text style={{
                    color: p.payment_status === "paid" ? C.green : C.yellow,
                    fontSize: 11, fontWeight: "600",
                  }}>
                    {p.payment_status === "paid" ? "✅ Confirmé" : "⏳ En attente"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Date de création */}
        <View style={[s.card, { alignItems: "center" }]}>
          <Text style={{ color: C.grayDark, fontSize: 12 }}>
            📅 Créé le {formatDateTime(tournament.created_at)}
          </Text>
        </View>
      </ScrollView>

      {/* ══ MODAL PAIEMENT ══ */}
      <Modal
        visible={payModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setPayModal(false); setProofUri(null); }}
      >
        <View style={pm.overlay}>
          <ScrollView style={pm.sheet} keyboardShouldPersistTaps="handled">
            <View style={pm.handle} />
            <Text style={pm.title}>💳 Paiement requis</Text>

            {/* Montant */}
            <View style={pm.amountBox}>
              <Text style={pm.amountLabel}>Montant à payer</Text>
              <Text style={pm.amountValue}>
                {paymentInfo ? Number(paymentInfo.amount).toLocaleString() : 0} FCFA
              </Text>
            </View>

            {/* Instructions */}
            <View style={pm.instrBox}>
              <Text style={pm.instrTitle}>📋 Instructions de paiement</Text>

              <Text style={pm.instrLine}>
                <Text style={pm.step}>1.  </Text>
                <Text style={pm.instrText}>Envoie le montant via </Text>
                <Text style={pm.instrBold}>MTN MoMo</Text>
                <Text style={pm.instrText}> ou </Text>
                <Text style={pm.instrBold}>Orange Money</Text>
              </Text>

              {/* Numéros */}
              <View style={pm.numbersBox}>
                <View style={pm.numbersHeader}>
                  <Text style={pm.numbersHeaderText}>📱 Numéros de paiement</Text>
                </View>
                <View style={pm.numberRow}>
                  <View>
                    <Text style={pm.networkLabel}>MTN MoMo</Text>
                    <Text style={pm.numberText}>681 640 130</Text>
                  </View>
                  <Text style={{ fontSize: 22 }}>📲</Text>
                </View>
                <View style={[pm.numberRow, { borderTopWidth: 1, borderColor: C.border }]}>
                  <View>
                    <Text style={pm.networkLabel}>Orange Money</Text>
                    <Text style={pm.numberText}>692 099 194</Text>
                  </View>
                  <Text style={{ fontSize: 22 }}>📲</Text>
                </View>
              </View>

              <Text style={pm.instrLine}>
                <Text style={pm.step}>2.  </Text>
                <Text style={pm.instrText}>Nom du bénéficiaire : </Text>
                <Text style={pm.instrBold}>BOPDA FEUKOUO JOFRANCK</Text>
              </Text>

              <Text style={pm.instrLine}>
                <Text style={pm.step}>3.  </Text>
                <Text style={pm.instrText}>Fais une capture d'écran de la confirmation</Text>
              </Text>

              <Text style={pm.instrLine}>
                <Text style={pm.step}>4.  </Text>
                <Text style={pm.instrText}>Uploade la capture ci-dessous</Text>
              </Text>
            </View>

            {/* Upload */}
            <Text style={pm.uploadLabel}>📸 Capture d'écran <Text style={{ color: C.red }}>*</Text></Text>
            <TouchableOpacity
              style={[pm.uploadZone, proofUri && pm.uploadZoneDone]}
              onPress={pickImage}
            >
              {proofUri ? (
                <>
                  <Image source={{ uri: proofUri }} style={pm.preview} />
                  <Text style={pm.uploadDoneText}>✅ Image sélectionnée</Text>
                  <Text style={pm.uploadChangeText}>Appuie pour changer</Text>
                </>
              ) : (
                <>
                  <Text style={pm.uploadIcon}>📸</Text>
                  <Text style={pm.uploadText}>Appuie pour ajouter la capture</Text>
                  <Text style={pm.uploadHint}>JPG, PNG, WEBP · Max 5MB</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Avertissement */}
            <View style={pm.warnBox}>
              <Text style={pm.warnText}>
                ⚠️ Ta participation sera confirmée après vérification par l'admin sous 24h.
                Tu recevras une notification de confirmation.
              </Text>
            </View>

            {/* Boutons */}
            <View style={pm.btnRow}>
              <TouchableOpacity style={pm.cancelBtn}
                onPress={() => { setPayModal(false); setProofUri(null); }}>
                <Text style={pm.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[pm.sendBtn, (!proofUri || submitting) && { opacity: 0.5 }]}
                onPress={submitPayment}
                disabled={!proofUri || submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={pm.sendBtnText}>Envoyer ✅</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

/* ─── Styles principaux ───────────────────────────────── */
const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: C.bg },
  center:         { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn:        { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 8 },
  backText:       { color: C.purple, fontSize: 15, fontWeight: "700" },
  // Hero
  hero:           { marginHorizontal: 16, borderRadius: 20, overflow: "hidden", padding: 20,
                    backgroundColor: "#1e1040", marginBottom: 12,
                    borderWidth: 1, borderColor: "rgba(124,58,237,0.3)" },
  heroGlow:       { position: "absolute", right: -30, top: -30, width: 140, height: 140,
                    borderRadius: 70, backgroundColor: "rgba(124,58,237,0.18)" },
  heroContent:    { flexDirection: "row", justifyContent: "space-between",
                    alignItems: "flex-start", marginTop: 10 },
  heroLeft:       { flex: 1, marginRight: 12 },
  heroTitle:      { color: C.white, fontSize: 20, fontWeight: "800", marginBottom: 5,
                    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium" },
  heroMeta:       { color: C.gray, fontSize: 12 },
  heroRight:      { alignItems: "flex-end" },
  heroPrice:      { color: C.cyan, fontSize: 22, fontWeight: "800" },
  heroPriceLbl:   { color: C.grayDark, fontSize: 11, marginTop: 2 },
  // Info grid
  infoGrid:       { flexDirection: "row", flexWrap: "wrap",
                    marginHorizontal: 12, marginBottom: 4 },
  // Card générique
  card:           { backgroundColor: C.bgCard, borderRadius: 16, padding: 16,
                    marginHorizontal: 16, marginBottom: 12,
                    borderWidth: 1, borderColor: C.border },
  cardTitle:      { color: C.white, fontWeight: "700", fontSize: 14, marginBottom: 10 },
  locCity:        { color: C.white, fontWeight: "600", fontSize: 13, marginBottom: 6 },
  locDetails:     { backgroundColor: "rgba(124,58,237,0.08)", borderRadius: 10, padding: 10,
                    borderWidth: 1, borderColor: "rgba(124,58,237,0.2)", marginBottom: 6 },
  locDetailsText: { color: C.gray, fontSize: 13, lineHeight: 19 },
  locHint:        { color: C.grayDark, fontSize: 11, marginTop: 2 },
  // Action card
  actionCard:     { backgroundColor: C.bgCard, borderRadius: 16, padding: 20,
                    marginHorizontal: 16, marginBottom: 12,
                    borderWidth: 1, borderColor: C.border, alignItems: "center" },
  prizeIcon:      { fontSize: 44, marginBottom: 6 },
  prizeLabel:     { color: C.grayDark, fontSize: 12, marginBottom: 4 },
  prizeValue:     { color: C.white, fontWeight: "800", fontSize: 18, marginBottom: 2 },
  prizeNote:      { color: C.grayDark, fontSize: 11, marginBottom: 14 },
  actionDivider:  { width: "100%", height: 1, backgroundColor: C.border, marginBottom: 16 },
  ctaBox:         { width: "100%", borderRadius: 12, padding: 14,
                    alignItems: "center", borderWidth: 1 },
  ctaText:        { fontWeight: "700", fontSize: 14 },
  joinBtn:        { width: "100%", backgroundColor: C.purple, borderRadius: 14,
                    padding: 16, alignItems: "center" },
  joinBtnText:    { color: "#fff", fontWeight: "700", fontSize: 15 },
  urgenceRed:     { color: C.red, fontSize: 12, marginTop: 10, fontWeight: "700" },
  urgenceYellow:  { color: C.yellow, fontSize: 12, marginTop: 10 },
  // Participants
  participantRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8,
                    borderBottomWidth: 1, borderColor: C.border },
  pAvatar:        { width: 32, height: 32, borderRadius: 16, backgroundColor: C.purple,
                    justifyContent: "center", alignItems: "center", marginRight: 10 },
  pAvatarText:    { color: "#fff", fontWeight: "700", fontSize: 13 },
  pName:          { flex: 1, color: C.white, fontSize: 14 },
  pStatus:        { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
});

/* ─── Styles modal paiement ───────────────────────────── */
const pm = StyleSheet.create({
  overlay:         { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  sheet:           { backgroundColor: C.bgCard, borderTopLeftRadius: 24,
                     borderTopRightRadius: 24, padding: 22, maxHeight: "92%" },
  handle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: C.grayDark,
                     alignSelf: "center", marginBottom: 16 },
  title:           { color: C.white, fontSize: 19, fontWeight: "800",
                     textAlign: "center", marginBottom: 16 },
  amountBox:       { backgroundColor: C.bg, borderRadius: 14, padding: 16,
                     alignItems: "center", borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  amountLabel:     { color: C.grayDark, fontSize: 12, marginBottom: 4 },
  amountValue:     { color: C.cyan, fontSize: 30, fontWeight: "800" },
  instrBox:        { backgroundColor: C.bg, borderRadius: 14, padding: 14,
                     borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  instrTitle:      { color: C.white, fontWeight: "700", fontSize: 14, marginBottom: 10 },
  instrLine:       { marginBottom: 8 },
  step:            { color: C.purple, fontWeight: "700", fontSize: 12 },
  instrText:       { color: C.gray, fontSize: 13 },
  instrBold:       { color: C.white, fontWeight: "700", fontSize: 13 },
  numbersBox:      { borderRadius: 12, overflow: "hidden", borderWidth: 1,
                     borderColor: "rgba(124,58,237,0.3)", marginVertical: 8 },
  numbersHeader:   { backgroundColor: "rgba(124,58,237,0.12)", padding: 10 },
  numbersHeaderText:{ color: C.purple, fontSize: 12, fontWeight: "700" },
  numberRow:       { flexDirection: "row", justifyContent: "space-between",
                     alignItems: "center", padding: 12, backgroundColor: C.bg },
  networkLabel:    { color: C.grayDark, fontSize: 11 },
  numberText:      { color: C.white, fontWeight: "800", fontSize: 16, letterSpacing: 1 },
  uploadLabel:     { color: C.gray, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  uploadZone:      { borderWidth: 2, borderStyle: "dashed", borderColor: C.grayDark,
                     borderRadius: 14, padding: 22, alignItems: "center",
                     marginBottom: 14, backgroundColor: "rgba(255,255,255,0.02)" },
  uploadZoneDone:  { borderColor: C.green, backgroundColor: C.greenFade },
  uploadIcon:      { fontSize: 34, marginBottom: 6 },
  uploadText:      { color: C.gray, fontSize: 14 },
  uploadHint:      { color: C.grayDark, fontSize: 11, marginTop: 4 },
  preview:         { width: 100, height: 100, borderRadius: 10, marginBottom: 8 },
  uploadDoneText:  { color: C.green, fontWeight: "700", fontSize: 14 },
  uploadChangeText:{ color: C.grayDark, fontSize: 11, marginTop: 3 },
  warnBox:         { backgroundColor: C.yellowFade, borderRadius: 12, padding: 12,
                     borderWidth: 1, borderColor: C.yellow, marginBottom: 16 },
  warnText:        { color: C.yellow, fontSize: 12, lineHeight: 18 },
  btnRow:          { flexDirection: "row", gap: 10, marginBottom: 16 },
  cancelBtn:       { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1,
                     borderColor: C.border, alignItems: "center" },
  cancelBtnText:   { color: C.gray, fontWeight: "600" },
  sendBtn:         { flex: 1, padding: 14, borderRadius: 12,
                     backgroundColor: C.purple, alignItems: "center" },
  sendBtnText:     { color: "#fff", fontWeight: "700", fontSize: 15 },
});