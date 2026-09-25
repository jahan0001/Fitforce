import React from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
  const colors = useColors();
  const cardStyle = [
    styles.card,
    { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...cardStyle, { opacity: pressed ? 0.85 : 1 }]}>
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
});
