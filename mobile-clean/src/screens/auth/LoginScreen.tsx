import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";
import { RootStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Login">;

export default function LoginScreen() {
  const navigation    = useNavigation<Nav>();
  const { login }     = useAuthStore();
  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) { setError("Remplis tous les champs"); return; }
    setLoading(true); setError("");
    try {
      await login(phone.trim(), password);
    } catch (err: any) {
      setError(err.response?.data?.message || "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.header}>
          <Text style={styles.logo}>JGAME</Text>
          <Text style={styles.subtitle}>Plateforme Gaming #1 au Cameroun</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.card}>
          <Text style={styles.title}>Connexion</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Numéro de téléphone</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 6XXXXXXXX"
              placeholderTextColor={colors.grayDark}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.grayDark}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Se connecter</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.link}>
            <Text style={styles.linkText}>
              Pas encore de compte ? <Text style={{ color: colors.purple }}>S'inscrire</Text>
            </Text>
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
  input:    {
    backgroundColor: "#0F172A", borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, color: colors.white, fontSize: 14,
  },
  btn:      {
    backgroundColor: colors.purple, borderRadius: 12,
    padding: 16, alignItems: "center", marginTop: 8,
  },
  btnText:  { color: "#fff", fontWeight: "700", fontSize: 15 },
  link:     { alignItems: "center", marginTop: 20 },
  linkText: { color: colors.gray, fontSize: 13 },
});