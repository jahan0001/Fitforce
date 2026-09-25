import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  FitnessStatus,
  UserRole,
  useApproveSoldier,
  useCreateMark,
  useCreateTest,
  useGetSoldier,
  useListSoldierMarks,
  useListSoldierTests,
  IpftTestInputPassFailStatus,
} from "@workspace/api-client-react";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FormInput } from "@/components/FormInput";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function SoldierDetailScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const soldierId = Number(id);

  const soldierQuery = useGetSoldier(soldierId);
  const marksQuery = useListSoldierMarks(soldierId, { query: { enabled: user?.role === UserRole.CLERK } as never });
  const testsQuery = useListSoldierTests(soldierId, { query: { enabled: user?.role === UserRole.CLERK } as never });
  const approveMutation = useApproveSoldier();
  const createMark = useCreateMark();
  const createTest = useCreateTest();

  const [exerciseName, setExerciseName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [markStatus, setMarkStatus] = useState<FitnessStatus>(FitnessStatus.FIT);

  const [testScore, setTestScore] = useState("");
  const [testNotes, setTestNotes] = useState("");
  const [testStatus, setTestStatus] = useState<IpftTestInputPassFailStatus>(IpftTestInputPassFailStatus.PASS);

  const soldier = soldierQuery.data;
  if (!soldier) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.mutedForeground }}>Loading soldier profile...</Text>
      </View>
    );
  }

  const handleApprove = () => {
    Alert.alert("Approve soldier", `Approve ${soldier.fullName} for full access?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: () => approveMutation.mutate({ id: soldierId }),
      },
    ]);
  };

  const handleMark = () => {
    if (!exerciseName.trim()) return;
    createMark.mutate(
      { data: { soldierId, exerciseName: exerciseName.trim(), status: markStatus, remarks: remarks.trim() || undefined } },
      {
        onSuccess: () => {
          setExerciseName("");
          setRemarks("");
          marksQuery.refetch();
        },
      },
    );
  };

  const handleRecordTest = () => {
    const score = Number(testScore);
    if (!Number.isFinite(score)) return;
    createTest.mutate(
      {
        data: {
          soldierId,
          testDate: new Date().toISOString().slice(0, 10),
          overallScore: score,
          passFailStatus: testStatus,
          notes: testNotes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setTestScore("");
          setTestNotes("");
          testsQuery.refetch();
        },
      },
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Card>
        <View style={styles.headerRow}>
          <Text style={[styles.name, { color: colors.foreground }]}>{soldier.fullName}</Text>
          {!soldier.isApproved ? <Badge label="Pending" tone="warning" /> : null}
        </View>
        <Text style={{ color: colors.mutedForeground }}>
          {soldier.rank} · {soldier.unit}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>#{soldier.serviceNumber}</Text>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.grid}>
          <Info label="Email" value={soldier.email} />
          <Info label="Blood Group" value={soldier.bloodGroup} />
          <Info label="Medical Category" value={soldier.medicalCategory} />
          <Info label="Date of Birth" value={soldier.dateOfBirth} />
          <Info label="Phone" value={soldier.phone ?? "—"} />
          <Info label="Joining Date" value={soldier.joiningDate ?? "—"} />
          <Info label="Height" value={`${soldier.heightCm} cm`} />
          <Info label="Weight" value={`${soldier.weightKg} kg`} />
        </View>

        <View style={styles.statusRow}>
          <Badge label={`BMI ${soldier.bmi}`} tone={soldier.fitnessStatus === "UNFIT" ? "warning" : "muted"} />
          <Badge label={soldier.fitnessStatus} tone={soldier.fitnessStatus === "UNFIT" ? "destructive" : "success"} />
        </View>

        {user?.role === UserRole.ADJUTANT && !soldier.isApproved ? (
          <Button label="Approve Soldier" onPress={handleApprove} loading={approveMutation.isPending} style={{ marginTop: 12 }} />
        ) : null}
      </Card>

      {user?.role === UserRole.CLERK ? (
        <>
          <Card style={{ gap: 12 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mark Exercise</Text>
            <FormInput label="Exercise Name" value={exerciseName} onChangeText={setExerciseName} placeholder="Push-ups" />
            <View style={styles.chipRow}>
              {[FitnessStatus.FIT, FitnessStatus.UNFIT].map((s) => (
                <Button
                  key={s}
                  label={s}
                  variant={markStatus === s ? "primary" : "outline"}
                  onPress={() => setMarkStatus(s)}
                  style={{ flex: 1, height: 42 }}
                />
              ))}
            </View>
            <FormInput label="Remarks (optional)" value={remarks} onChangeText={setRemarks} placeholder="Notes..." />
            <Button label="Save Mark" onPress={handleMark} loading={createMark.isPending} />

            {(marksQuery.data ?? []).length > 0 ? (
              <View style={{ gap: 8, marginTop: 8 }}>
                {(marksQuery.data ?? []).slice(0, 5).map((mark) => (
                  <View key={mark.id} style={styles.markRow}>
                    <Text style={{ color: colors.foreground, flex: 1 }}>{mark.exerciseName}</Text>
                    <Badge label={mark.status} tone={mark.status === "UNFIT" ? "destructive" : "success"} />
                  </View>
                ))}
              </View>
            ) : null}
          </Card>

          <Card style={{ gap: 12 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Record IPFT Test</Text>
            <FormInput label="Overall Score" keyboardType="numeric" value={testScore} onChangeText={setTestScore} placeholder="75" />
            <View style={styles.chipRow}>
              {[IpftTestInputPassFailStatus.PASS, IpftTestInputPassFailStatus.FAIL].map((s) => (
                <Button
                  key={s}
                  label={s}
                  variant={testStatus === s ? "primary" : "outline"}
                  onPress={() => setTestStatus(s)}
                  style={{ flex: 1, height: 42 }}
                />
              ))}
            </View>
            <FormInput label="Notes (optional)" value={testNotes} onChangeText={setTestNotes} placeholder="Observations..." />
            <Button label="Save Test Result" onPress={handleRecordTest} loading={createTest.isPending} />

            {(testsQuery.data ?? []).length > 0 ? (
              <View style={{ gap: 8, marginTop: 8 }}>
                {(testsQuery.data ?? []).slice(0, 5).map((test) => (
                  <View key={test.id} style={styles.markRow}>
                    <Text style={{ color: colors.foreground, flex: 1 }}>
                      {new Date(test.testDate).toLocaleDateString()} · {test.overallScore}
                    </Text>
                    <Badge label={test.passFailStatus} tone={test.passFailStatus === "PASS" ? "success" : "destructive"} />
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ width: "47%", gap: 2 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    gap: 10,
  },
  markRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
