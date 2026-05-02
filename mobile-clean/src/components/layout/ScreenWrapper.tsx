import React from "react";
import { SafeAreaView, StatusBar, StyleSheet, ViewStyle } from "react-native";
import { C } from "../../theme/colors";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

export default function ScreenWrapper({ children, style, noPadding }: Props) {
  return (
    <SafeAreaView style={[s.safe, style]}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {children}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
});