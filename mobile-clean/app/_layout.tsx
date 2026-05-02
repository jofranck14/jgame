import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { View, Image, StyleSheet } from "react-native";
import { useAuthStore } from "../src/store/authStore";
import { C } from "../src/theme/colors";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

function SplashScreen() {
  return (
    <View style={s.splash}>
      <Image
        source={require("../assets/images/logo.png")}
        style={s.logo}
        resizeMode="contain"
      />
    </View>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const segments            = useSegments();
  const router              = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      // Pas connecté → login
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      // Connecté → tabs
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const { isLoading, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  if (isLoading) return <SplashScreen />;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" backgroundColor={C.bg} />
        <AuthGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: C.bg },
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="tournament/[id]" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="game/[id]"       options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="profile/[id]"    options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="chat/[userId]"   options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="notifications"   options={{ animation: "slide_from_bottom" }} />
            <Stack.Screen name="matchmaking"     options={{ animation: "slide_from_bottom" }} />
            <Stack.Screen name="create-tournament" options={{ animation: "slide_from_bottom" }} />
          </Stack>
        </AuthGuard>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 200,
    height: 200,
  },
});