import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '@/constants/Colors';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Warunki dziś',
          tabBarLabel: 'Dziś',
          tabBarIcon: () => <TabIcon emoji="☀️" />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa łowisk',
          tabBarLabel: 'Mapa',
          tabBarIcon: () => <TabIcon emoji="🗺️" />,
        }}
      />
      <Tabs.Screen
        name="advisor"
        options={{
          title: 'AI Doradca',
          tabBarLabel: 'AI Doradca',
          tabBarIcon: () => <TabIcon emoji="🤖" />,
        }}
      />
      <Tabs.Screen
        name="spots"
        options={{
          title: 'Moje miejsca',
          tabBarLabel: 'Miejsca',
          tabBarIcon: () => <TabIcon emoji="📍" />,
        }}
      />
      <Tabs.Screen name="two" options={{ href: null, tabBarButton: () => null }} />
    </Tabs>
  );
}
