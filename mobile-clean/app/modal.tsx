import { router } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { C } from "../src/theme/colors";

export default function ModalScreen() {
  return (
    <View style={s.root}>
      <TouchableOpacity style={s.btn} onPress={() => router.back()}>
        <Text style={s.btnText}>← Retour</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },
  btn:  { padding: 16 },
  btnText: { color: C.purple, fontSize: 16, fontWeight: "700" },
});