import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "./types";
import ProfileScreen       from "../screens/profile/ProfileScreen";
import MatchmakingScreen   from "../screens/matchmaking/MatchmakingScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import ChatScreen          from "../screens/chat/ChatScreen";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyProfile"     component={ProfileScreen} />
      <Stack.Screen name="UserProfile"   component={ProfileScreen} />
      <Stack.Screen name="Matchmaking"   component={MatchmakingScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Chat"          component={ChatScreen} />
    </Stack.Navigator>
  );
}