import React from "react";
import { View, Text, StyleSheet } from "react-native";

const MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: "À venir",  bg: "rgba(59,130,246,0.2)",  color: "#60A5FA" },
  ongoing:   { label: "En cours", bg: "rgba(16,185,129,0.2)",  color: "#34D399" },
  completed: { label: "Terminé",  bg: "rgba(100,116,139,0.2)", color: "#94A3B8" },
  cancelled: { label: "Annulé",   bg: "rgba(239,68,68,0.2)",   color: "#F87171" },
};

export default function StatusBadge({ status }: { status: string }) {
  const m = MAP[status] || MAP.pending;
  return (
    <View style={[s.badge, { backgroundColor: m.bg }]}>
      <Text style={[s.text, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  text:  { fontSize: 11, fontWeight: "600" },
});