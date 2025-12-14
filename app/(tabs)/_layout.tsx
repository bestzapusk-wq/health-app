import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';

// Эмодзи-иконки как надёжный фоллбек
const TAB_ICONS: Record<string, string> = {
  index: '🏠',
  diary: '📔',
  health: '💚',
  streams: '📺',
  plates: '🍽️',
};

function TabBarIcon({ name, color, focused }: { name: string; color: string; focused: boolean }) {
  const emoji = TAB_ICONS[name] || '📱';
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const defaultTabBarStyle = {
    backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    height: Platform.OS === 'ios' ? 88 : 68,
  };

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#14b8a6',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
        // Скрываем tab bar на главной странице
        tabBarStyle: route.name === 'index' 
          ? { display: 'none' } 
          : defaultTabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ color, focused }) => (
          <TabBarIcon name={route.name} color={color} focused={focused} />
        ),
      })}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Дневник',
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Здоровье',
        }}
      />
      <Tabs.Screen
        name="streams"
        options={{
          title: 'Эфиры',
        }}
      />
      <Tabs.Screen
        name="plates"
        options={{
          title: 'Тарелки',
        }}
      />
    </Tabs>
  );
}
