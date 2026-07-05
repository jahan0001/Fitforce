import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  UserRole,
  useGetMe,
  useListInboxReports,
  useListMyNotifications,
  useListPendingSoldiers,
  useListSoldiers,
} from "@workspace/api-client-react";

import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const meQuery = useGetMe({ query: { enabled: user?.role === UserRole.SOLDIER } as never });
  const soldierProfile = meQuery.data as unknown as { bmi?: number; fitnessStatus?: string } | undefined;

  const pendingQuery = useListPendingSoldiers({ query: { enabled: user?.role === UserRole.ADJUTANT } as never });
  const soldiersQuery = useListSoldiers(undefined, { query: { enabled: user?.role !== UserRole.SOLDIER } as never });
  const inboxQuery = useListInboxReports({ query: { enabled: user?.role === UserRole.ADJUTANT } as never });
  const notificationsQuery = useListMyNotifications();

  const unreadCount = (notificationsQuery.data ?? []).filter((n) => !n.isRead).length;
  const bmiAlert = (notificationsQuery.data ?? []).find((n) => n.type === "BMI_ALERT" && !n.isRead);

  const isRefreshing =
    meQuery.isFetching || pendingQuery.isFetching || soldiersQuery.isFetching || inboxQuery.isFetching || notificationsQuery.isFetching;

  const onRefresh = () => {
    meQuery.refetch();
    pendingQuery.refetch();
    soldiersQuery.refetch();
    inboxQuery.refetch();
    notificationsQuery.refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            Welcome, {user?.fullName?.split(" ")[0]}
          </Text>
          <Badge label={user?.role ?? ""} tone="success" />
        </View>

        {bmiAlert ? (
          <Card style={{ borderColor: colors.destructive, backgroundColor: colors.destructive + "12" }}>
            <View style={styles.alertRow}>
              <Feather name="alert-triangle" size={20} color={colors.destructive} />
              <Text style={[styles.alertTitle, { color: colors.destructive }]}>{bmiAlert.title}</Text>
            </View>
            <Text style={{ color: colors.foreground }}>{bmiAlert.message}</Text>
          </Card>
        ) : null}

        {user?.role === UserRole.SOLDIER && (
          <Card>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Your Fitness Status</Text>
            <View style={styles.statRow}>
              <View>
                <Text style={[styles.bigStat, { color: colors.foreground }]}>
                  {soldierProfile?.bmi ?? "--"}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>BMI</Text>
              </View>
              <Badge
                label={soldierProfile?.fitnessStatus ?? "—"}
                tone={soldierProfile?.fitnessStatus === "UNFIT" ? "destructive" : "success"}
              />
            </View>
          </Card>
        )}

        {user?.role === UserRole.ADJUTANT && (
          <View style={styles.grid}>
            <Card style={styles.gridCard} onPress={() => router.push("/(tabs)/soldiers")}>
              <Feather name="user-plus" size={22} color={colors.primary} />
              <Text style={[styles.gridNumber, { color: colors.foreground }]}>{pendingQuery.data?.length ?? 0}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Pending Approvals</Text>
            </Card>
            <Card style={styles.gridCard}>
              <Feather name="users" size={22} color={colors.primary} />
              <Text style={[styles.gridNumber, { color: colors.foreground }]}>{soldiersQuery.data?.length ?? 0}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Active Soldiers</Text>
            </Card>
            <Card style={styles.gridCard}>
              <Feather name="file-text" size={22} color={colors.primary} />
              <Text style={[styles.gridNumber, { color: colors.foreground }]}>{inboxQuery.data?.length ?? 0}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Reports Received</Text>
            </Card>
            <Card style={styles.gridCard}>
              <Feather name="bell" size={22} color={colors.primary} />
              <Text style={[styles.gridNumber, { color: colors.foreground }]}>{unreadCount}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Unread Alerts</Text>
            </Card>
          </View>
        )}

        {user?.role === UserRole.CLERK && (
          <View style={styles.grid}>
            <Card style={styles.gridCard}>
              <Feather name="users" size={22} color={colors.primary} />
              <Text style={[styles.gridNumber, { color: colors.foreground }]}>{soldiersQuery.data?.length ?? 0}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Roster Size</Text>
            </Card>
            <Card style={styles.gridCard}>
              <Feather name="bell" size={22} color={colors.primary} />
              <Text style={[styles.gridNumber, { color: colors.foreground }]}>{unreadCount}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Unread Alerts</Text>
            </Card>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {user?.role === UserRole.SOLDIER && (
            <QuickAction icon="clipboard" label="My Plan" onPress={() => router.push("/(tabs)/plan")} />
          )}
          {user?.role === UserRole.SOLDIER && (
            <QuickAction icon="trending-up" label="Progress" onPress={() => router.push("/(tabs)/progress")} />
          )}
          {user?.role === UserRole.ADJUTANT && (
            <QuickAction icon="user-check" label="Approvals" onPress={() => router.push("/(tabs)/soldiers")} />
          )}
          {user?.role === UserRole.ADJUTANT && (
            <QuickAction icon="plus-square" label="New Plan" onPress={() => router.push("/plan/new")} />
          )}
          {user?.role === UserRole.CLERK && (
            <QuickAction icon="users" label="Roster" onPress={() => router.push("/(tabs)/soldiers")} />
          )}
          {user?.role === UserRole.CLERK && (
            <QuickAction icon="send" label="Send Report" onPress={() => router.push("/report/new")} />
          )}
          <QuickAction icon="bell" label="Alerts" onPress={() => router.push("/(tabs)/notifications")} />
          <QuickAction icon="user" label="Profile" onPress={() => router.push("/(tabs)/profile")} />
        </View>
      </ScrollView>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Card style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: colors.primary + "18" }]}>
        <Feather name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 12, textAlign: "center" }}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 100,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bigStat: {
    fontSize: 34,
    fontWeight: "800",
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridCard: {
    width: "47%",
    gap: 6,
  },
  gridNumber: {
    fontSize: 24,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    width: "30%",
    alignItems: "center",
    gap: 8,
    paddingVertical: 18,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
