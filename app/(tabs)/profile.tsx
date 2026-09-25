import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { UserRole, useGetMe } from "@workspace/api-client-react";

import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const meQuery = useGetMe({ query: { enabled: !!user } as never });
  const profile = meQuery.data as unknown as {
    rank?: string; unit?: string; serviceNumber?: string;
    heightCm?: number; weightKg?: number; bmi?: number;
    fitnessStatus?: string; bloodGroup?: string; medicalCategory?: string;
    dateOfBirth?: string; phone?: string; joiningDate?: string;
  } | undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Profile</Text>
        <Card style={styles.headerCard}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="user" size={28} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.foreground }]}>{user?.fullName}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{user?.email}</Text>
          </View>
          <Badge label={user?.role ?? ""} tone="success" />
        </Card>

        {profile ? (
          <Card style={{ gap: 14 }}>
            <Text style={[styles.subTitle, { color: colors.foreground }]}>Service Record</Text>
            <InfoRow label="Full Name" value={user?.fullName} />
            <InfoRow label="Service No." value={user?.serviceNumber ?? undefined} />
            <InfoRow label="Rank" value={profile.rank} />
            <InfoRow label="Unit" value={profile.unit} />
            <InfoRow label="Joining Date" value={profile.joiningDate} />
            <InfoRow label="Blood Group" value={profile.bloodGroup} />
            <InfoRow label="Medical Category" value={profile.medicalCategory} />
            <InfoRow label="Date of Birth" value={profile.dateOfBirth} />
            <InfoRow label="Phone" value={profile.phone} />
            <InfoRow label="Email" value={user?.email} />
            {user?.role === UserRole.SOLDIER && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.subTitle, { color: colors.foreground }]}>Fitness Data</Text>
                <InfoRow label="Height" value={profile.heightCm ? `${profile.heightCm} cm` : undefined} />
                <InfoRow label="Weight" value={profile.weightKg ? `${profile.weightKg} kg` : undefined} />
                <InfoRow label="BMI" value={profile.bmi ? String(profile.bmi) : undefined} />
                <View style={styles.statusRow}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: "600" }}>Fitness Status</Text>
                  <Badge label={profile.fitnessStatus ?? "—"} tone={profile.fitnessStatus === "UNFIT" ? "destructive" : "success"} />
                </View>
              </>
            )}
          </Card>
        ) : null}

        <Button label="Log Out" variant="destructive" onPress={() => logout()} style={{ marginTop: 8 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  const colors = useColors();
  return (
    <View style={styles.infoRow}>
      <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>{value ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, paddingBottom: 80 },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  subTitle: { fontSize: 15, fontWeight: "700" },
  headerCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 17, fontWeight: "800" },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  divider: { height: StyleSheet.hairlineWidth },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
