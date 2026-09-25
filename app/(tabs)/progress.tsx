import { Feather } from "@expo/vector-icons";
import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useGetMyProgress, type IpftTest } from "@workspace/api-client-react";

import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { useColors } from "@/hooks/useColors";

export default function ProgressScreen() {
  const colors = useColors();
  const query = useGetMyProgress();
  const summary = query.data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={query.isFetching && !query.isLoading} onRefresh={() => query.refetch()} tintColor={colors.primary} />}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>IPFT Progress</Text>
        {summary ? (
          <>
            <View style={styles.statGrid}>
              <StatCard icon="target" label="Pass Rate" value={`${Math.round(summary.passRate * 100)}%`} />
              <StatCard icon="zap" label="Streak" value={`${summary.currentStreak}`} />
              <StatCard icon="check-circle" label="Passed" value={`${summary.testsPassed}/${summary.totalTests}`} />
              <StatCard icon="calendar" label="Next IPFT" value={summary.nextIpftDate ?? "TBD"} small />
            </View>
            <Text style={[styles.subTitle, { color: colors.foreground }]}>Test History</Text>
            {summary.history.length === 0 ? (
              <EmptyState icon="activity" title="No tests recorded yet" subtitle="Your IPFT results will appear here once a Clerk records them." />
            ) : (
              summary.history.map((test) => <TestRow key={test.id} test={test} />)
            )}
          </>
        ) : query.isLoading ? null : (
          <EmptyState icon="activity" title="No progress data" subtitle="Get your first IPFT test recorded by a Clerk." />
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, small }: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; value: string; small?: boolean }) {
  const colors = useColors();
  return (
    <Card style={styles.statCard}>
      <Feather name={icon} size={18} color={colors.primary} />
      <Text style={[small ? styles.statValueSmall : styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{label}</Text>
    </Card>
  );
}

function TestRow({ test }: { test: IpftTest }) {
  const colors = useColors();
  return (
    <Card style={styles.testRow}>
      <View>
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>{new Date(test.testDate).toLocaleDateString()}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Score: {test.overallScore}</Text>
        {test.notes ? <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{test.notes}</Text> : null}
      </View>
      <Badge label={test.passFailStatus} tone={test.passFailStatus === "PASS" ? "success" : "destructive"} />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 60 },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  subTitle: { fontSize: 17, fontWeight: "700", marginTop: 8 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "47%", gap: 4 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statValueSmall: { fontSize: 14, fontWeight: "800" },
  testRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
