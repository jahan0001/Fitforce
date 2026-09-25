import { router } from "expo-router";
import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { UserRole, useListInboxReports, useListSentReports, type Report } from "@workspace/api-client-react";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ReportsScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const isClerk = user?.role === UserRole.CLERK;
  const inboxQuery = useListInboxReports({ query: { enabled: !isClerk } as never });
  const sentQuery = useListSentReports({ query: { enabled: isClerk } as never });
  const list = isClerk ? sentQuery.data : inboxQuery.data;
  const isLoading = isClerk ? sentQuery.isLoading : inboxQuery.isLoading;
  const isRefreshing = isClerk ? sentQuery.isFetching : inboxQuery.isFetching;
  const refetch = isClerk ? () => sentQuery.refetch() : () => inboxQuery.refetch();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader right={
        isClerk ? <Button label="+ Report" onPress={() => router.push("/report/new")} style={{ height: 36, paddingHorizontal: 14 }} /> : undefined
      } />
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {isClerk ? "Sent Reports" : "Reports Inbox"}
        </Text>
        {!isLoading && (list ?? []).length === 0 ? (
          <EmptyState icon="file-text" title="No reports yet"
            subtitle={isClerk ? "Send a report to keep your Adjutant informed." : "Reports from your Clerks will appear here."} />
        ) : null}
        {(list ?? []).map((report) => (
          <ReportRow key={report.id} report={report} onPress={() => router.push(`/report/${report.id}`)} />
        ))}
      </ScrollView>
    </View>
  );
}

function ReportRow({ report, onPress }: { report: Report; onPress: () => void }) {
  const colors = useColors();
  return (
    <Card onPress={onPress}>
      <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 15 }}>{report.title}</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 13 }} numberOfLines={2}>{report.messageBody}</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
        {report.createdByName} · {new Date(report.createdAt).toLocaleDateString()}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, flexGrow: 1 },
  sectionTitle: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
});
