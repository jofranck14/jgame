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
            borderTopColor: C.border,
            borderTopWidth: 0.5,
            height: 52 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
          tabBarActiveTintColor:   C.purple,
          tabBarInactiveTintColor: C.gray,
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>{tab?.icon ?? "•"}</Text>
          ),
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 10, marginTop: 1, marginBottom: 2 }}>
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