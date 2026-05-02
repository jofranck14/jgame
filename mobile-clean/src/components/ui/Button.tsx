import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from "react-native";
import { C } from "../../theme/colors";

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
}

export default function Button({
  label, onPress, disabled, loading,
  variant = "primary", size = "md", style,
}: Props) {
  const py = size === "sm" ? 9 : size === "lg" ? 16 : 12;
  const fs = size === "sm" ? 13 : size === "lg" ? 16 : 14;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        s.base,
        { paddingVertical: py, opacity: (disabled || loading) ? 0.5 : 1 },
        variant === "primary" && s.primary,
        variant === "outline" && s.outline,
        variant === "danger"  && s.danger,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator size="small" color={variant === "outline" ? C.purple : "#fff"} />
        : <Text style={[s.label, { fontSize: fs }, variant === "outline" && { color: C.gray }]}>
            {label}
          </Text>
      }
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base:    { borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  primary: { backgroundColor: C.purple },
  outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: C.border },
  danger:  { backgroundColor: C.red },
  label:   { color: "#fff", fontWeight: "600" },
});