import { Feather } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const ROLES = [
  { label: "Adjutant", icon: "shield" as const, email: "adjutant@gmail.com" },
  { label: "Clerk", icon: "clipboard" as const, email: "clerk@gmail.com" },
  { label: "Soldier", icon: "user" as const, email: "" },
] as const;

type Role = "Adjutant" | "Clerk" | "Soldier";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, token, user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (token && user) {
    return <Redirect href="/" />;
  }

  const handleRoleSelect = (role: (typeof ROLES)[number]) => {
    setSelectedRole(role.label);
    if (role.email) setEmail(role.email);
    setRolePickerOpen(false);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedRole) {
      setError("Please select your role first.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand */}
        <View style={styles.brand}>
          <View style={[styles.logoCircle, { borderColor: colors.primary }]}>
            <Image
              source={require("@/assets/images/fitforce_logo.png")}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>FitForce</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Soldier's Fitness Assessment & Monitoring System
          </Text>
        </View>

        <View style={styles.form}>
          {/* Role Selector */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Role</Text>
            <Pressable
              onPress={() => setRolePickerOpen(true)}
              style={[
                styles.dropdownBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: selectedRole ? colors.primary : colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              {selectedRole ? (
                <View style={styles.selectedRow}>
                  <Feather
                    name={ROLES.find((r) => r.label === selectedRole)?.icon ?? "user"}
                    size={17}
                    color={colors.primary}
                  />
                  <Text style={[styles.selectedText, { color: colors.foreground }]}>
                    {selectedRole}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>
                  Select your role...
                </Text>
              )}
              <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <FormInput
            label="Email Address"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@fitforce.mil"
          />
          <FormInput
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
          />

          {error ? (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <Button label="Log In" onPress={handleSubmit} loading={isSubmitting} style={{ marginTop: 4 }} />
        </View>

        <View style={styles.footer}>
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>New soldier?</Text>
          <Text
            style={[styles.link, { color: colors.primary }]}
            onPress={() => router.push("/(auth)/signup")}
          >
            Create an account
          </Text>
        </View>
      </ScrollView>

      {/* Role Picker Modal */}
      <Modal
        visible={rolePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRolePickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRolePickerOpen(false)}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Role</Text>
            {ROLES.map((role) => (
              <Pressable
                key={role.label}
                onPress={() => handleRoleSelect(role)}
                style={({ pressed }) => [
                  styles.roleOption,
                  {
                    backgroundColor:
                      selectedRole === role.label
                        ? colors.primary + "18"
                        : pressed
                          ? colors.muted
                          : "transparent",
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <View style={[styles.roleIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name={role.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleLabel, { color: colors.foreground }]}>{role.label}</Text>
                  <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>
                    {role.label === "Adjutant"
                      ? "Unit commander — approves soldiers & plans"
                      : role.label === "Clerk"
                        ? "Records marks, tests & reports"
                        : "View plans, progress & notifications"}
                  </Text>
                </View>
                {selectedRole === role.label ? (
                  <Feather name="check-circle" size={20} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    gap: 32,
  },
  brand: {
    alignItems: "center",
    gap: 10,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2.5,
    overflow: "hidden",
    marginBottom: 6,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 18,
  },
  form: {
    gap: 16,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownBtn: {
    height: 50,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: "600",
  },
  placeholder: {
    fontSize: 15,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    alignItems: "center",
  },
  link: {
    fontWeight: "700",
    fontSize: 14,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  modalSheet: {
    padding: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  roleDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
