import { Tabs } from "expo-router";
import { Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../../src/theme/colors";

const TABS = [
  { name: "index",       icon: "🏠", label: "Accueil"    },
  { name: "tournaments", icon: "🏆", label: "Tournois"   },
  { name: "games",       icon: "🎮", label: "Jeux"       },
  { name: "leaderboard", icon: "📊", label: "Classement" },
  { name: "profile",     icon: "👤", label: "Profil"     },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => {
        const tab = TABS.find((t) => t.name === route.name);
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.bg,
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            shadowColor: "transparent",
            height: 58 + insets.bottom,
            paddingBottom: insets.bottom + 4,
            paddingTop: 10,
          },
          tabBarBackground: () => null,
          tabBarActiveTintColor:   C.purple,
          tabBarInactiveTintColor: C.gray,
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>{tab?.icon ?? "•"}</Text>
          ),
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 10, marginTop: 2, marginBottom: 0 }}>
              {tab?.label}
            </Text>
          ),
        };
      }}
    >
      <Tabs.Screen name="index"       />
      <Tabs.Screen name="tournaments" />
      <Tabs.Screen name="games"       />
      <Tabs.Screen name="leaderboard" />
      <Tabs.Screen name="profile"     />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}