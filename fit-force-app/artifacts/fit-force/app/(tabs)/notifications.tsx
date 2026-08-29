import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl, TextInput, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { showAlert } from '@/lib/alert';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getIPFTSchedule, saveIPFTSchedule, getUsers, addNotification, genId } from '@/lib/storage';
import type { Notification, IPFTSchedule } from '@/lib/types';
import { Calendar } from '@/components/Calendar';

const TODAY = new Date().toISOString().slice(0, 10);

function notifIcon(type: Notification['type']): { name: string; color: (c: any) => string } {
  switch (type) {
    case 'ipft_approved': return { name: 'calendar-check', color: c => c.success };
    case 'ipft_proposed': return { name: 'calendar-clock', color: c => c.accent };
    case 'ipft_rejected': return { name: 'calendar-remove', color: c => c.destructive };
    case 'new_result': return { name: 'clipboard-check', color: c => c.primary };
    case 'overweight': return { name: 'alert', color: c => c.warning };
    case 'new_plan': return { name: 'dumbbell', color: c => c.primary };
    default: return { name: 'bell', color: c => c.mutedForeground };
  }
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [schedule, setSchedule] = useState<IPFTSchedule | null>(null);
  const [proposeVisible, setProposeVisible] = useState(false);
  const [proposedDate, setProposedDate] = useState('');
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [altDate, setAltDate] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    const [all, sched] = await Promise.all([getNotifications(), getIPFTSchedule()]);
    const mine = all.filter(n => {
      // Personal notices (targetUserId) always win, regardless of role.
      if (n.targetUserId) return n.targetUserId === user.id;
      // Soldiers never see company-wide or role-targeted staff alerts about
      // other soldiers (e.g. "so-and-so is overweight") — only their own
      // notices (handled above) and true all-hands broadcasts with no
      // targeting at all (e.g. "IPFT date confirmed").
      if (user.role === 'soldier') return !n.targetCompany && !n.targetRole;
      if (n.targetCompany && n.targetCompany !== user.company) return false;
      if (n.targetRole && n.targetRole !== user.role) return false;
      return true;
    });
    setNotifs(mine);
    setSchedule(sched);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleMarkAll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markAllNotificationsRead();
    await load();
  };

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    await load();
  };

  const handlePropose = async () => {
    if (!proposedDate) { showAlert('Error', 'Please pick a date on the calendar.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const sched: IPFTSchedule = {
      id: genId(), proposedDate: proposedDate.trim(),
      proposedBy: user!.id, proposedByName: user!.name,
      status: 'pending', createdAt: new Date().toISOString(),
    };
    await saveIPFTSchedule(sched);
    await addNotification({
      id: genId(), targetRole: 'co', title: 'New IPFT Date Proposed',
      body: `Adjutant has proposed IPFT on ${proposedDate.trim()}. Your approval is required.`,
      type: 'ipft_proposed', read: false, createdAt: new Date().toISOString(),
    });
    setProposeVisible(false);
    setProposedDate('');
    await load();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert('Sent', 'IPFT date proposal has been sent to CO.');
  };

  const handleApprove = async () => {
    if (!schedule) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveIPFTSchedule({ ...schedule, status: 'approved', approvedBy: user!.id });
    await addNotification({
      id: genId(), title: 'IPFT Date Confirmed',
      body: `Next IPFT confirmed for ${schedule.proposedDate}. All companies must prepare.`,
      type: 'ipft_approved', read: false, createdAt: new Date().toISOString(),
    });
    await load();
    showAlert('Approved', 'IPFT date approved and unit notified.');
  };

  const handleReject = async () => {
    if (!schedule) return;
    if (!rejectionNote.trim() && !altDate.trim()) { showAlert('Error', 'Please provide a reason or alternate date.'); return; }
    await saveIPFTSchedule({ ...schedule, status: 'rejected', rejectionNote: rejectionNote.trim(), alternateDate: altDate.trim() || undefined });
    await addNotification({
      id: genId(), targetRole: 'adjutant', title: 'IPFT Date Rejected',
      body: `Proposed date ${schedule.proposedDate} was rejected.${rejectionNote ? ' Reason: ' + rejectionNote : ''}${altDate ? ' Alternate date suggested: ' + altDate : ''}`,
      type: 'ipft_rejected', read: false, createdAt: new Date().toISOString(),
    });
    setRejectVisible(false);
    setRejectionNote('');
    setAltDate('');
    await load();
    showAlert('Rejected', 'Rejection sent to Adjutant.');
  };

  const unread = notifs.filter(n => !n.read).length;
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' });

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = notifIcon(item.type);
    const iconColor = icon.color(colors);
    const fmtTime = (d: string) => new Date(d).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: item.read ? colors.card : colors.primary + '08', borderColor: item.read ? colors.border : colors.primary }]}
        onPress={() => handleRead(item.id)}
        activeOpacity={0.75}
      >
        <View style={[styles.iconWrap, { backgroundColor: iconColor + '20' }]}>
          <MaterialCommunityIcons name={icon.name as any} size={22} color={iconColor} />
        </View>
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.notifTitle, { color: colors.foreground }]}>{item.title}</Text>
            {!item.read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
          </View>
          <Text style={[styles.notifBody, { color: colors.mutedForeground }]}>{item.body}</Text>
          <Text style={[styles.notifDate, { color: colors.mutedForeground }]}>{fmtTime(item.createdAt)}</Text>
          {user?.role === 'co' && item.type === 'ipft_proposed' && schedule?.status === 'pending' && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.approveActionBtn, { backgroundColor: colors.success }]} onPress={handleApprove}>
                <Feather name="check" size={16} color="#FFF" />
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.approveActionBtn, { backgroundColor: colors.destructive }]} onPress={() => setRejectVisible(true)}>
                <Feather name="x" size={16} color="#FFF" />
                <Text style={styles.actionBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const paddingTop = 16;
  const paddingBottom = isWeb ? 34 : insets.bottom + 90;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
          {unread > 0 && <Text style={[styles.badge, { color: colors.primary }]}>{unread} unread</Text>}
        </View>
        {unread > 0 && (
          <TouchableOpacity style={[styles.markAllBtn, { borderColor: colors.border }]} onPress={handleMarkAll}>
            <Feather name="check-square" size={16} color={colors.mutedForeground} />
            <Text style={[styles.markAllText, { color: colors.mutedForeground }]}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>

      {user?.role === 'adjutant' && (
        <TouchableOpacity style={[styles.proposeBtn, { backgroundColor: colors.accent, marginHorizontal: 16 }]} onPress={() => setProposeVisible(true)}>
          <Feather name="calendar" size={16} color={colors.accentForeground ?? '#000'} />
          <Text style={[styles.proposeBtnText, { color: colors.accentForeground ?? '#000' }]}>Propose IPFT Date to CO</Text>
        </TouchableOpacity>
      )}

      {schedule && (
        <View style={[styles.schedBanner, { backgroundColor: schedule.status === 'approved' ? colors.success + '15' : schedule.status === 'rejected' ? colors.destructive + '15' : colors.accent + '15', borderColor: schedule.status === 'approved' ? colors.success : schedule.status === 'rejected' ? colors.destructive : colors.accent, marginHorizontal: 16 }]}>
          <Text style={[styles.schedLabel, { color: schedule.status === 'approved' ? colors.success : schedule.status === 'rejected' ? colors.destructive : colors.accent }]}>
            IPFT Proposed: {schedule.proposedDate} — {schedule.status.toUpperCase()}
          </Text>
        </View>
      )}

      <FlatList
        data={notifs}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell-off" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No notifications</Text>
          </View>
        }
      />

      {/* Propose date modal */}
      <Modal visible={proposeVisible} transparent animationType="slide" onRequestClose={() => setProposeVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20, maxHeight: '90%' }]}>
            <View style={styles.modalHandle} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Propose IPFT Date</Text>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Tap a date on the calendar</Text>
              <Calendar value={proposedDate} onChange={setProposedDate} minDate={TODAY} colors={colors} />
              {proposedDate ? (
                <Text style={[styles.selectedDateText, { color: colors.primary }]}>Selected: {proposedDate}</Text>
              ) : null}
              <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary, marginTop: 14 }]} onPress={handlePropose}>
                <Feather name="send" size={18} color="#FFF" />
                <Text style={styles.sendBtnText}>Send to CO</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setProposeVisible(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reject modal */}
      <Modal visible={rejectVisible} transparent animationType="slide" onRequestClose={() => setRejectVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20, maxHeight: '90%' }]}>
            <View style={styles.modalHandle} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Reject IPFT Date</Text>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Reason for rejection</Text>
              <TextInput style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]} value={rejectionNote} onChangeText={setRejectionNote} placeholder="Enter reason..." placeholderTextColor={colors.mutedForeground} multiline />
              <Text style={[styles.modalLabel, { color: colors.mutedForeground, marginTop: 4 }]}>Suggest a new date (optional) — tap the calendar</Text>
              <Calendar value={altDate} onChange={setAltDate} minDate={TODAY} colors={colors} />
              {altDate ? (
                <Text style={[styles.selectedDateText, { color: colors.destructive }]}>Suggested: {altDate}</Text>
              ) : null}
              <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.destructive, marginTop: 14 }]} onPress={handleReject}>
                <Text style={styles.sendBtnText}>Send Rejection</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setRejectVisible(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  badge: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1 },
  markAllText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  proposeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 11, marginBottom: 10 },
  proposeBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  schedBanner: { borderRadius: 10, padding: 10, borderWidth: 1, marginBottom: 10 },
  schedLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  card: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5, alignItems: 'flex-start' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  notifBody: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  notifDate: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 16 },
  modalLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  selectedDateText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 8, textAlign: 'center' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 13, marginBottom: 8 },
  sendBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  cancelBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  approveActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, paddingVertical: 10 },
  actionBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
});
