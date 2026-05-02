import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TournamentStackParamList } from "./types";
import TournamentsScreen   from "../screens/tournaments/TournamentsScreen";
import TournamentScreen    from "../screens/tournaments/TournamentScreen";

const Stack = createNativeStackNavigator<TournamentStackParamList>();

export default function TournamentsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TournamentList"   component={TournamentsScreen} />
      <Stack.Screen name="TournamentDetail" component={TournamentScreen} />
    </Stack.Navigator>
  );
}