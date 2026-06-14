import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { C } from "../../src/theme/colors";

export default function LoginScreen() {
  const { login }               = useAuthStore();
  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) { setError("Remplis tous les champs"); return; }
    setLoading(true); setError("");
    try {
      await login(phone.trim(), password);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.response?.data?.message || "Identifiants incorrects");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.logoBox}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={s.logo}
              resizeMode="contain"
            />
            <Text style={s.sub}>Plateforme Gaming #1 au Cameroun 🎮</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.title}>Connexion</Text>

            {!!error && (
              <View style={s.errBox}>
                <Text style={s.errText}>⚠️ {error}</Text>
              </View>
            )}

            <Text style={s.label}>Numéro de téléphone</Text>
            <TextInput
              style={s.input} placeholder="6XXXXXXXX"
              placeholderTextColor={C.grayDark}
              value={phone} onChangeText={setPhone}
              keyboardType="phone-pad" autoCapitalize="none"
            />

            <Text style={s.label}>Mot de passe</Text>
            <TextInput
              style={s.input} placeholder="••••••••"
              placeholderTextColor={C.grayDark}
              value={password} onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[s.btn, loading && { opacity: 0.6 }]}
              onPress={handleLogin} disabled={loading} activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Se connecter</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/(auth)/register")} style={s.linkRow}>
              <Text style={s.linkText}>
                Pas encore de compte ?{"  "}
                <Text style={{ color: C.purple, fontWeight: "700" }}>S'inscrire</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flexGrow: 1, justifyContent: "center", padding: 20 },
  logoBox: { alignItems: "center", marginBottom: 32 },
  logo:    { width: 120, height: 120, marginBottom: 12 },
  sub:     { color: C.gray, fontSize: 13, textAlign: "center" },
  card:    { backgroundColor: C.bgCard, borderRadius: 20, padding: 24, borderWidth: 0.5, borderColor: C.border },
  title:   { fontSize: 22, fontWeight: "700", color: C.white, marginBottom: 20 },
  errBox:  { backgroundColor: C.redFade, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 0.5, borderColor: C.red },
  errText: { color: C.red, fontSize: 13 },
  label:   { color: C.gray, fontSize: 13, marginBottom: 6, marginTop: 4 },
  input:   { backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, color: C.white, fontSize: 14, marginBottom: 8 },
  btn:     { backgroundColor: C.purple, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 12 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  linkRow: { alignItems: "center", marginTop: 20 },
  linkText:{ color: C.gray, fontSize: 13 },
});