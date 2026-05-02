import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GameStackParamList } from "./types";
import GamesScreen  from "../screens/games/GamesScreen";
import GameScreen   from "../screens/games/GameScreen";

const Stack = createNativeStackNavigator<GameStackParamList>();

export default function GamesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GameList"   component={GamesScreen} />
      <Stack.Screen name="GameDetail" component={GameScreen} />
    </Stack.Navigator>
  );
}