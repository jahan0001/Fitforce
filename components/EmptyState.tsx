import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <Feather name={icon} size={40} color={colors.mutedForeground} />
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
  },
});
