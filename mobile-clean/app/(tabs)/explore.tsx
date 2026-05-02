import { View, Text } from "react-native";
import { C } from "../../src/theme/colors";

export default function ExploreScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: C.white }}>Explorer</Text>
    </View>
  );
}