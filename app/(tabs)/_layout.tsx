import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { UserRole } from "@workspace/api-client-react";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout({ role }: { role: UserRole }) {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      {role !== UserRole.SOLDIER && (
        <NativeTabs.Trigger name="soldiers">
          <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
          <Label>Soldiers</Label>
        </NativeTabs.Trigger>
      )}
      {role !== UserRole.CLERK && (
        <NativeTabs.Trigger name="plan">
          <Icon sf={{ default: "list.clipboard", selected: "list.clipboard.fill" }} />
          <Label>{role === UserRole.ADJUTANT ? "Plans" : "My Plan"}</Label>
        </NativeTabs.Trigger>
      )}
      {role === UserRole.SOLDIER && (
        <NativeTabs.Trigger name="progress">
          <Icon sf={{ default: "chart.line.uptrend.xyaxis", selected: "chart.line.uptrend.xyaxis" }} />
          <Label>Progress</Label>
        </NativeTabs.Trigger>
      )}
      {role !== UserRole.SOLDIER && (
        <NativeTabs.Trigger name="reports">
          <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
          <Label>Reports</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="notifications">
        <Icon sf={{ default: "bell", selected: "bell.fill" }} />
        <Label>Alerts</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout({ role }: { role: UserRole }) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="house" tintColor={color} size={24} /> : <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="soldiers"
        options={{
          title: "Soldiers",
          href: role === UserRole.SOLDIER ? null : undefined,
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person.2" tintColor={color} size={24} /> : <Feather name="users" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: role === UserRole.ADJUTANT ? "Plans" : "My Plan",
          href: role === UserRole.CLERK ? null : undefined,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="list.clipboard" tintColor={color} size={24} />
            ) : (
              <Feather name="clipboard" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          href: role === UserRole.SOLDIER ? undefined : null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.line.uptrend.xyaxis" tintColor={color} size={24} />
            ) : (
              <Feather name="trending-up" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          href: role === UserRole.SOLDIER ? null : undefined,
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="doc.text" tintColor={color} size={24} /> : <Feather name="file-text" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="bell" tintColor={color} size={24} /> : <Feather name="bell" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.crop.circle" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!user.isApproved) return <Redirect href="/(auth)/pending" />;

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout role={user.role} />;
  }
  return <ClassicTabLayout role={user.role} />;
}
