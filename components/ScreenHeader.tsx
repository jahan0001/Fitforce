import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === "web" ? 67 : insets.top + 12,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textCol: {
    gap: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
});
