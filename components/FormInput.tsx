import React from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useColors } from "@/hooks/useColors";

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function FormInput({ label, error, style, ...rest }: FormInputProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            color: colors.foreground,
            borderColor: error ? colors.destructive : colors.border,
            borderRadius: colors.radius,
          },
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    height: 50,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
  },
});
