import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import type { UserRole } from '@/lib/types';

function canSeeTab(tab: string, role: UserRole): boolean {
  const map: Record<string, UserRole[]> = {
    index: ['co', '2ic', 'coy_comd', 'adjutant', 'clerk', 'soldier'],
    soldiers: ['co', '2ic', 'coy_comd', 'adjutant', 'clerk'],
    plan: ['2ic', 'adjutant', 'clerk', 'soldier'],
    reports: ['co', '2ic', 'coy_comd', 'adjutant', 'clerk'],
    messages: ['co', '2ic', 'coy_comd', 'adjutant', 'clerk'],
    notifications: ['co', '2ic', 'coy_comd', 'adjutant', 'clerk', 'soldier'],
    profile: ['co', '2ic', 'coy_comd', 'adjutant', 'clerk', 'soldier'],
  };
  return (map[tab] ?? []).includes(role);
}

export default function TabLayout() {
  const colors = useColors();
  const isDark = true;
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const { user } = useAuth();
  const role: UserRole = user?.role ?? 'soldier';

  const tabBarStyle = {
    position: 'absolute' as const,
    backgroundColor: isIOS ? 'transparent' : colors.background,
    borderTopWidth: isWeb ? 1 : 0,
    borderTopColor: colors.border,
    elevation: 0,
    ...(isWeb ? { height: 84 } : {}),
    paddingBottom: isIOS ? 6 : 4,
    paddingTop: 4,
  };

  const tabBg = () =>
    isIOS ? (
      <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
    ) : isWeb ? (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          headerShown: false,
          tabBarStyle,
          tabBarBackground: tabBg,
          tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            href: canSeeTab('index', role) ? undefined : null,
            tabBarIcon: ({ color }) => <Feather name="home" size={26} color={color} />,
          }}
        />
        <Tabs.Screen
          name="soldiers"
          options={{
            title: 'Soldiers',
            href: canSeeTab('soldiers', role) ? undefined : null,
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-group" size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="plan"
          options={{
            title: role === '2ic' ? 'Plans' : 'My Plan',
            href: canSeeTab('plan', role) ? undefined : null,
            tabBarIcon: ({ color }) => <Feather name="calendar" size={26} color={color} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            href: canSeeTab('reports', role) ? undefined : null,
            tabBarIcon: ({ color }) => <Feather name="file-text" size={26} color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            href: canSeeTab('messages', role) ? undefined : null,
            tabBarIcon: ({ color }) => <Feather name="message-square" size={26} color={color} />,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Alerts',
            href: canSeeTab('notifications', role) ? undefined : null,
            tabBarIcon: ({ color }) => <Feather name="bell" size={26} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            href: canSeeTab('profile', role) ? undefined : null,
            tabBarIcon: ({ color }) => <Feather name="user" size={26} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
