import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { C } from "../../src/theme/colors";
import api from "../../src/api/api";

export default function RegisterScreen() {
  const { login }                   = useAuthStore();
  const [username, setUsername]     = useState("");
  const [phone, setPhone]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const handleRegister = async () => {
    setError("");
    if (!username.trim() || !phone.trim() || !password) { setError("Remplis tous les champs"); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas"); return; }
    if (password.length < 6)  { setError("Mot de passe trop court (min. 6 caractères)"); return; }
    setLoading(true);
    try {
      await api.post("/auth/register", { username: username.trim(), phone: phone.trim(), password });
      await login(phone.trim(), password);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: "Pseudo",                value: username,  setter: setUsername,  placeholder: "Ton pseudo de gamer",   keyboard: "default"    as const, secure: false },
    { label: "Téléphone",             value: phone,     setter: setPhone,     placeholder: "6XXXXXXXX",             keyboard: "phone-pad"  as const, secure: false },
    { label: "Mot de passe",          value: password,  setter: setPassword,  placeholder: "Min. 6 caractères",     keyboard: "default"    as const, secure: true  },
    { label: "Confirmer mot de passe",value: confirm,   setter: setConfirm,   placeholder: "••••••••",              keyboard: "default"    as const, secure: true  },
  ];

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.logoBox}>
          <Text style={s.logo}>JGAME</Text>
          <Text style={s.sub}>Rejoins la communauté 🎮</Text>
        </View>
        <View style={s.card}>
          <Text style={s.title}>Créer un compte</Text>
          {!!error && (
            <View style={s.errBox}><Text style={s.errText}>⚠️ {error}</Text></View>
          )}
          {fields.map((f) => (
            <View key={f.label}>
              <Text style={s.label}>{f.label}</Text>
              <TextInput
                style={s.input} placeholder={f.placeholder}
                placeholderTextColor={C.grayDark}
                value={f.value} onChangeText={f.setter}
                secureTextEntry={f.secure} keyboardType={f.keyboard}
                autoCapitalize="none"
              />
            </View>
          ))}
          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.6 }]}
            onPress={handleRegister} disabled={loading} activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Créer mon compte</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")} style={s.linkRow}>
            <Text style={s.linkText}>
              Déjà un compte ?{"  "}
              <Text style={{ color: C.purple, fontWeight: "700" }}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flexGrow: 1, justifyContent: "center", padding: 20 },
  logoBox: { alignItems: "center", marginBottom: 36 },
  logo:    { fontSize: 44, fontWeight: "900", color: C.purple, letterSpacing: 4 },
  sub:     { color: C.gray, fontSize: 13, marginTop: 8 },
  card:    { backgroundColor: C.bgCard, borderRadius: 20, padding: 24, borderWidth: 0.5, borderColor: C.border },
  title:   { fontSize: 22, fontWeight: "700", color: C.white, marginBottom: 20 },
  errBox:  { backgroundColor: C.redFade, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 0.5, borderColor: C.red },
  errText: { color: C.red, fontSize: 13 },
  label:   { color: C.gray, fontSize: 13, marginBottom: 6, marginTop: 8 },
  input:   { backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, color: C.white, fontSize: 14 },
  btn:     { backgroundColor: C.purple, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 16 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  linkRow: { alignItems: "center", marginTop: 20 },
  linkText:{ color: C.gray, fontSize: 13 },
});