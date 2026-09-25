import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "destructive";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  testID,
}: ButtonProps) {
  const colors = useColors();

  const backgroundColor =
    variant === "primary"
      ? colors.primary
      : variant === "destructive"
        ? colors.destructive
        : variant === "secondary"
          ? colors.secondary
          : "transparent";

  const textColor =
    variant === "primary"
      ? colors.primaryForeground
      : variant === "destructive"
        ? colors.destructiveForeground
        : variant === "secondary"
          ? colors.secondaryForeground
          : colors.primary;

  const borderColor = variant === "outline" ? colors.primary : "transparent";

  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor,
          borderWidth: variant === "outline" ? 1.5 : 0,
          opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1,
          borderRadius: colors.radius,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
});
