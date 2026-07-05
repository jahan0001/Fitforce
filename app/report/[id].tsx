import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useGetReport } from "@workspace/api-client-react";

import { Card } from "@/components/Card";
import { useColors } from "@/hooks/useColors";

export default function ReportDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useGetReport(Number(id));
  const report = query.data;

  if (!report) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.mutedForeground }}>Loading report...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Card style={{ gap: 12 }}>
        <Text style={[styles.title, { color: colors.foreground }]}>{report.title}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
          From {report.createdByName} · {new Date(report.createdAt).toLocaleString()}
        </Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 22 }}>{report.messageBody}</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
