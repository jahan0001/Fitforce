import React from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export function AppHeader({ right }: { right?: React.ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === "web" ? 67 : insets.top + 10,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.brand}>
        <View style={[styles.logoWrap, { borderColor: colors.primary + "44" }]}>
          <Image
            source={require("@/assets/images/fitforce_logo.png")}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <View style={styles.textGroup}>
          <Text style={[styles.appName, { color: colors.foreground }]}>FitForce</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Soldier's Fitness Assessment & Monitoring System
          </Text>
        </View>
      </View>
      {right ? <View style={styles.rightSlot}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  textGroup: {
    flex: 1,
    gap: 1,
  },
  appName: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  tagline: {
    fontSize: 9.5,
    fontWeight: "500",
    lineHeight: 13,
  },
  rightSlot: {
    flexShrink: 0,
    marginLeft: 8,
  },
});
