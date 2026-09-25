import { Feather } from "@expo/vector-icons";
import React from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { NotificationType, useListMyNotifications, useMarkNotificationRead, type Notification } from "@workspace/api-client-react";

import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { useColors } from "@/hooks/useColors";

const ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  [NotificationType.BMI_ALERT]: "alert-triangle",
  [NotificationType.APPROVAL]: "user-check",
  [NotificationType.PLAN_ASSIGNED]: "clipboard",
  [NotificationType.GENERAL]: "bell",
};

export default function NotificationsScreen() {
  const colors = useColors();
  const query = useListMyNotifications();
  const markRead = useMarkNotificationRead();
  const list = query.data ?? [];
  const unread = list.filter((n) => !n.isRead).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader right={
        unread > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{unread}</Text>
          </View>
        ) : undefined
      } />
      <FlatList
        data={list}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={query.isFetching && !query.isLoading} onRefresh={() => query.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Alerts {unread > 0 ? `(${unread} unread)` : ""}
          </Text>
        }
        ListEmptyComponent={
          !query.isLoading ? (
            <EmptyState icon="bell-off" title="No notifications yet" subtitle="We'll let you know when something needs attention." />
          ) : null
        }
        renderItem={({ item }) => (
          <NotificationRow notification={item} onPress={() => { if (!item.isRead) markRead.mutate({ id: item.id }); }} />
        )}
      />
    </View>
  );
}

function NotificationRow({ notification, onPress }: { notification: Notification; onPress: () => void }) {
  const colors = useColors();
  const isAlert = notification.type === NotificationType.BMI_ALERT;
  return (
    <Card onPress={onPress}
      style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", opacity: notification.isRead ? 0.6 : 1, borderColor: isAlert && !notification.isRead ? colors.destructive : colors.border }}>
      <View style={[styles.iconWrap, { backgroundColor: (isAlert ? colors.destructive : colors.primary) + "18" }]}>
        <Feather name={ICONS[notification.type] ?? "bell"} size={18} color={isAlert ? colors.destructive : colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 15 }}>{notification.title}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{notification.message}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>{new Date(notification.createdAt).toLocaleString()}</Text>
      </View>
      {!notification.isRead ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, flexGrow: 1 },
  sectionTitle: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
});
