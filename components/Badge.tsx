import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type Tone = "success" | "warning" | "muted" | "destructive";

export function Badge({ label, tone = "muted" }: { label: string; tone?: Tone }) {
  const colors = useColors();

  const toneColors: Record<Tone, { bg: string; fg: string }> = {
    success: { bg: colors.primary + "22", fg: colors.primary },
    warning: { bg: colors.accent + "33", fg: colors.accentForeground },
    muted: { bg: colors.muted, fg: colors.mutedForeground },
    destructive: { bg: colors.destructive + "22", fg: colors.destructive },
  };

  const { bg, fg } = toneColors[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: colors.radius }]}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
});
