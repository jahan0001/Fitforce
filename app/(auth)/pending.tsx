import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function PendingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout, refreshUser, isRefetchingUser } = useAuth();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.accent + "22" }]}>
        <Feather name="clock" size={40} color={colors.accent} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Awaiting Approval</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        Your soldier account has been created and is pending review by your unit Adjutant. You will
        gain full access once approved.
      </Text>

      <View style={styles.actions}>
        <Button
          label="Check Status"
          variant="outline"
          onPress={() => refreshUser()}
          loading={isRefetchingUser}
        />
        <Button label="Log Out" variant="secondary" onPress={() => logout()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  body: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  actions: {
    width: "100%",
    gap: 12,
    marginTop: 24,
  },
});
