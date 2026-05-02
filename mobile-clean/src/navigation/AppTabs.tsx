import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { colors } from '../theme/colors';

import HomeScreen        from '../screens/home/HomeScreen';
import TournamentsStack  from './TournamentsStack';
import GamesStack        from './GamesStack';
import LeaderboardScreen from '../screens/leaderboard/LeaderboardScreen';
import ProfileStack      from './ProfileStack';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home',        icon: '🏠', label: 'Accueil',    component: HomeScreen        },
  { name: 'Tournaments', icon: '🏆', label: 'Tournois',   component: TournamentsStack  },
  { name: 'Games',       icon: '🎮', label: 'Jeux',       component: GamesStack        },
  { name: 'Leaderboard', icon: '📊', label: 'Classement', component: LeaderboardScreen },
  { name: 'Profile',     icon: '👤', label: 'Profil',     component: ProfileStack      },
];

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find((t) => t.name === route.name);
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0F172A',
            borderTopColor: colors.border,
            paddingBottom: 8,
            paddingTop: 6,
            height: 64,
          },
          tabBarActiveTintColor:   colors.purple,
          tabBarInactiveTintColor: colors.gray,
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>{tab?.icon}</Text>,
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 10, marginTop: -4 }}>{tab?.label}</Text>
          ),
        };
      }}
    >
      {TABS.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
}