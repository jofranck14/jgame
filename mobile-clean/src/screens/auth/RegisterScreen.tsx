import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";
import { RootStackParamList } from "../../navigation/types";
import api from "../../api/api";

type Nav = NativeStackNavigationProp<RootStackParamList, "Register">;

export default function RegisterScreen() {
  const navigation       = useNavigation<Nav>();
  const { login }        = useAuthStore();
  const [username, setUsername] = useState("");
  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleRegister = async () => {
    setError("");
    if (!username.trim() || !phone.trim() || !password) { setError("Remplis tous les champs"); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas"); return; }
    if (password.length < 6) { setError("Mot de passe trop court (min. 6 caractères)"); return; }
    setLoading(true);
    try {
      await api.post("/auth/register", { username: username.trim(), phone: phone.trim(), password });
      await login(phone.trim(), password);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>JGAME</Text>
          <Text style={styles.subtitle}>Rejoins la communauté gaming 🎮</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>Créer un compte</Text>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
          {[
            { label: "Pseudo", value: username, setter: setUsername, placeholder: "Ton pseudo de gamer", keyboard: "default" as const },
            { label: "Téléphone", value: phone, setter: setPhone, placeholder: "6XXXXXXXX", keyboard: "phone-pad" as const },
            { label: "Mot de passe", value: password, setter: setPassword, placeholder: "Min. 6 caractères", secure: true, keyboard: "default" as const },
            { label: "Confirmer le mot de passe", value: confirm, setter: setConfirm, placeholder: "••••••••", secure: true, keyboard: "default" as const },
          ].map((f) => (
            <View key={f.label} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput style={styles.input} placeholder={f.placeholder} placeholderTextColor={colors.grayDark}
                value={f.value} onChangeText={f.setter} secureTextEntry={f.secure} keyboardType={f.keyboard}
                autoCapitalize="none" />
            </View>
          ))}
          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Créer mon compte</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.link}>
            <Text style={styles.linkText}>Déjà un compte ? <Text style={{ color: colors.purple }}>Se connecter</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: colors.bg },
  scroll:   { flexGrow: 1, justifyContent: "center", padding: 20 },
  header:   { alignItems: "center", marginBottom: 32 },
  logo:     { fontSize: 40, fontWeight: "800", color: colors.purple, letterSpacing: 2 },
  subtitle: { color: colors.gray, fontSize: 13, marginTop: 6 },
  card:     { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 24, borderWidth: 0.5, borderColor: colors.border },
  title:    { fontSize: 22, fontWeight: "700", color: colors.white, marginBottom: 20 },
  errorBox: { backgroundColor: colors.redLight, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText:{ color: colors.red, fontSize: 13 },
  field:    { marginBottom: 16 },
  label:    { color: colors.gray, fontSize: 13, marginBottom: 6 },
  input:    { backgroundColor: "#0F172A", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.white, fontSize: 14 },
  btn:      { backgroundColor: colors.purple, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  btnText:  { color: "#fff", fontWeight: "700", fontSize: 15 },
  link:     { alignItems: "center", marginTop: 20 },
  linkText: { color: colors.gray, fontSize: 13 },
});