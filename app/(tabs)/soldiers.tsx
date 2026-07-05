import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import {
  UserRole,
  useGetSoldierStats,
  useListPendingSoldiers,
  useListSoldiers,
  type SoldierProfile,
} from "@workspace/api-client-react";

import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const FITNESS_FILTERS = ["All", "FIT", "UNFIT"] as const;
type FitnessFilter = (typeof FITNESS_FILTERS)[number];

export default function SoldiersScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showPending, setShowPending] = useState(false);
  const [fitnessFilter, setFitnessFilter] = useState<FitnessFilter>("All");
  const [showStats, setShowStats] = useState(false);

  const queryParams = useMemo(() => {
    const params: { search?: string; fitnessStatus?: string } = {};
    if (search) params.search = search;
    if (fitnessFilter !== "All") params.fitnessStatus = fitnessFilter;
    return Object.keys(params).length ? params : undefined;
  }, [search, fitnessFilter]);

  const soldiersQuery = useListSoldiers(queryParams, { query: { enabled: !showPending } as never });
  const pendingQuery = useListPendingSoldiers({ query: { enabled: showPending && user?.role === UserRole.ADJUTANT } as never });
  const statsQuery = useGetSoldierStats({ query: { enabled: !showPending } as never });

  const data = showPending ? pendingQuery.data : soldiersQuery.data;
  const isLoading = showPending ? pendingQuery.isLoading : soldiersQuery.isLoading;
  const isRefreshing = showPending ? pendingQuery.isFetching : soldiersQuery.isFetching;

  const onRefresh = () => {
    if (showPending) pendingQuery.refetch();
    else { soldiersQuery.refetch(); statsQuery.refetch(); }
  };

  const list = useMemo(() => data ?? [], [data]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader />

      {user?.role === UserRole.ADJUTANT ? (
        <View style={styles.segmentRow}>
          <SegmentButton label="Active Roster" active={!showPending} onPress={() => setShowPending(false)} />
          <SegmentButton label={`Pending${pendingQuery.data?.length ? ` (${pendingQuery.data.length})` : ""}`} active={showPending} onPress={() => setShowPending(true)} />
        </View>
      ) : null}

      {!showPending ? (
        <>
          <View style={styles.searchRow}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Name, rank, service no..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
            />
          </View>
          <View style={styles.filterRow}>
            {FITNESS_FILTERS.map((f) => (
              <Pressable key={f} onPress={() => setFitnessFilter(f)}
                style={[styles.filterChip, { backgroundColor: fitnessFilter === f ? colors.primary : colors.secondary, borderRadius: colors.radius }]}>
                <Text style={{ color: fitnessFilter === f ? colors.primaryForeground : colors.secondaryForeground, fontWeight: "700", fontSize: 12 }}>{f}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowStats(!showStats)}
              style={[styles.filterChip, { backgroundColor: showStats ? colors.accent : colors.secondary, borderRadius: colors.radius, flexDirection: "row", gap: 4 }]}>
              <Feather name="bar-chart-2" size={14} color={showStats ? colors.accentForeground : colors.secondaryForeground} />
              <Text style={{ color: showStats ? colors.accentForeground : colors.secondaryForeground, fontWeight: "700", fontSize: 12 }}>Stats</Text>
            </Pressable>
          </View>

          {showStats && statsQuery.data ? (
            <View style={styles.statsSection}>
              <View style={styles.statCards}>
                {[
                  { label: "Total", value: statsQuery.data.totalSoldiers, color: colors.primary },
                  { label: "FIT", value: statsQuery.data.fitCount, color: colors.primary },
                  { label: "UNFIT", value: statsQuery.data.unfitCount, color: colors.destructive },
                  { label: "Overweight", value: statsQuery.data.overweightCount, color: colors.accent },
                ].map(({ label, value, color }) => (
                  <Card key={label} style={styles.statCard}>
                    <Text style={[styles.statNum, { color }]}>{value}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{label}</Text>
                  </Card>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      <FlatList
        data={list}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing && !isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState icon="users" title={showPending ? "No pending soldiers" : "No soldiers found"}
              subtitle={showPending ? "New signups will appear here for approval." : "Try a different search."} />
          ) : null
        }
        renderItem={({ item }) => <SoldierRow soldier={item} onPress={() => router.push(`/soldier/${item.id}`)} />}
      />
    </View>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress}
      style={[styles.segmentBtn, { backgroundColor: active ? colors.primary : colors.secondary, borderRadius: colors.radius }]}>
      <Text style={{ color: active ? colors.primaryForeground : colors.secondaryForeground, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function SoldierRow({ soldier, onPress }: { soldier: SoldierProfile; onPress: () => void }) {
  const colors = useColors();
  return (
    <Card onPress={onPress} style={styles.rowCard}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowName, { color: colors.foreground }]}>{soldier.fullName}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{soldier.rank} · {soldier.unit}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>#{soldier.serviceNumber}</Text>
      </View>
      <View style={styles.rowBadges}>
        <Badge label={`BMI ${soldier.bmi}`} tone={soldier.fitnessStatus === "UNFIT" ? "warning" : "muted"} />
        <Badge label={soldier.fitnessStatus} tone={soldier.fitnessStatus === "UNFIT" ? "destructive" : "success"} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  segmentRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 14 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginTop: 14, paddingHorizontal: 14, height: 44, borderRadius: 12, backgroundColor: "rgba(120,120,120,0.08)" },
  searchInput: { flex: 1, fontSize: 15 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingTop: 10, flexWrap: "wrap" },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, alignItems: "center" },
  statsSection: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  statCards: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 12, paddingHorizontal: 6 },
  statNum: { fontSize: 20, fontWeight: "800" },
  listContent: { padding: 20, gap: 12, flexGrow: 1 },
  rowCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  rowMain: { gap: 2, flexShrink: 1 },
  rowName: { fontSize: 16, fontWeight: "700" },
  rowBadges: { gap: 6, alignItems: "flex-end" },
});
