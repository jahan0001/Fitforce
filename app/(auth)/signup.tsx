import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MedicalCategory, type SoldierSignupInput } from "@workspace/api-client-react";

import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type FormState = Omit<SoldierSignupInput, "heightCm" | "weightKg"> & {
  heightCm: string;
  weightKg: string;
};

const emptyForm: FormState = {
  fullName: "",
  email: "",
  password: "",
  serviceNumber: "",
  rank: "",
  unit: "",
  dateOfBirth: "",
  bloodGroup: "",
  heightCm: "",
  weightKg: "",
  medicalCategory: MedicalCategory.A,
  phone: "",
  joiningDate: "",
};

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signup } = useAuth();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const required: (keyof FormState)[] = [
      "fullName",
      "email",
      "password",
      "serviceNumber",
      "rank",
      "unit",
      "dateOfBirth",
      "bloodGroup",
      "heightCm",
      "weightKg",
    ];
    const missing = required.find((key) => !String(form[key]).trim());
    if (missing) {
      setError("Please fill in every required field.");
      return;
    }
    const heightCm = Number(form.heightCm);
    const weightKg = Number(form.weightKg);
    if (!Number.isFinite(heightCm) || heightCm <= 0 || !Number.isFinite(weightKg) || weightKg <= 0) {
      setError("Height and weight must be valid numbers.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signup({
        ...form,
        email: form.email.trim().toLowerCase(),
        heightCm,
        weightKg,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <View
        style={[
          styles.successContainer,
          { backgroundColor: colors.background, paddingTop: insets.top + 80 },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="check" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Account Created</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Your registration was submitted. Your Adjutant will review and approve your account.
        </Text>
        <Button
          label="Go to Login"
          onPress={() => router.replace("/(auth)/login")}
          style={{ marginTop: 24, alignSelf: "stretch" }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
          <Text style={{ color: colors.foreground, fontWeight: "600" }}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Soldier Registration</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Your account will require Adjutant approval before you can log in.
          </Text>
        </View>

        <View style={styles.form}>
          <FormInput label="Full Name" value={form.fullName} onChangeText={update("fullName")} placeholder="John A. Miller" />
          <FormInput
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={form.email}
            onChangeText={update("email")}
            placeholder="you@fitforce.mil"
          />
          <FormInput label="Password" secureTextEntry value={form.password} onChangeText={update("password")} placeholder="At least 6 characters" />
          <FormInput label="Service Number" value={form.serviceNumber} onChangeText={update("serviceNumber")} placeholder="SN-10234" />
          <FormInput label="Rank" value={form.rank} onChangeText={update("rank")} placeholder="Private" />
          <FormInput label="Unit Name" value={form.unit} onChangeText={update("unit")} placeholder="2nd Infantry Battalion" />
          <FormInput
            label="Date of Birth (YYYY-MM-DD)"
            value={form.dateOfBirth}
            onChangeText={update("dateOfBirth")}
            placeholder="1995-06-15"
          />
          <FormInput label="Blood Group" value={form.bloodGroup} onChangeText={update("bloodGroup")} placeholder="O+" />
          <FormInput label="Phone Number" keyboardType="phone-pad" value={form.phone ?? ""} onChangeText={update("phone")} placeholder="+91 9876543210" />
          <FormInput
            label="Joining Date (YYYY-MM-DD)"
            value={form.joiningDate ?? ""}
            onChangeText={update("joiningDate")}
            placeholder="2020-01-15"
          />

          <View style={styles.row}>
            <FormInput
              label="Height (cm)"
              keyboardType="numeric"
              value={form.heightCm}
              onChangeText={update("heightCm")}
              placeholder="175"
              style={{ flex: 1 }}
            />
            <FormInput
              label="Weight (kg)"
              keyboardType="numeric"
              value={form.weightKg}
              onChangeText={update("weightKg")}
              placeholder="70"
              style={{ flex: 1 }}
            />
          </View>

          <View style={styles.medicalRow}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Medical Category</Text>
            <View style={styles.chipRow}>
              {(Object.values(MedicalCategory) as string[]).map((cat) => {
                const active = form.medicalCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setForm((prev) => ({ ...prev, medicalCategory: cat as SoldierSignupInput["medicalCategory"] }))}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.secondary,
                        borderRadius: colors.radius,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? colors.primaryForeground : colors.secondaryForeground, fontWeight: "700" }}>
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <Button label="Create Account" onPress={handleSubmit} loading={isSubmitting} style={{ marginTop: 8 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  body: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  medicalRow: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
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
  successContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
});
