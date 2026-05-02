import React from "react";
import { View, Text } from "react-native";
import { colors } from "../../theme/colors";

export default function GamesScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: colors.white, fontSize: 18 }}>🚧 GamesScreen</Text>
    </View>
  );
}