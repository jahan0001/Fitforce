import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Platform, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { showAlert } from '@/lib/alert';
import { getSoldiers, updateSoldier, updateUser, deleteSoldier, deleteUser, calcBMI, addNotification, genId } from '@/lib/storage';
import type { Soldier, Company } from '@/lib/types';

const COMPANIES: (Company | 'ALL')[] = ['ALL', 'A', 'B', 'C', 'D'];
const STATUS_FILTERS = ['ALL', 'fit', 'unfit', 'pending'];
// "pending" here is ptStatus (not yet taken an IPFT test), which is a
// different thing from a registration awaiting Adjutant approval — the chip
// is labeled differently from the raw value to avoid the two "pending"s
// being read as the same thing.
const STATUS_LABELS: Record<string, string> = { ALL: 'ALL', fit: 'FIT', unfit: 'UNFIT', pending: 'AWAITING TEST' };

export default function SoldiersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [filtered, setFiltered] = useState<Soldier[]>([]);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<Company | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const all = await getSoldiers();
    const visible = user?.role === 'coy_comd'
      ? all.filter(s => s.company === user.company)
      : all;
    setSoldiers(visible);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    let result = [...soldiers];
    if (companyFilter !== 'ALL') result = result.filter(s => s.company === companyFilter);
    if (statusFilter !== 'ALL') result = result.filter(s => s.ptStatus === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.serviceNumber.toLowerCase().includes(q) ||
        s.rank.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [soldiers, search, companyFilter, statusFilter]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleApprove = async (soldier: Soldier) => {
    if (user?.role !== 'adjutant') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAlert('Approve Soldier', `Approve ${soldier.rank} ${soldier.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve', onPress: async () => {
          // Reflect the approval immediately instead of waiting on the
          // network round trip to the shared server, so the row (and the
          // dashboard's pending/total counts) update the instant you tap
          // Approve rather than only after load() resolves.
          setSoldiers(prev => prev.map(s => s.id === soldier.id ? { ...s, isApproved: true, ptStatus: 'pending' } : s));
          try {
            await updateSoldier(soldier.id, { isApproved: true, ptStatus: 'pending' });
            await updateUser(soldier.userId, { isApproved: true });
            await addNotification({
              id: genId(), targetUserId: soldier.userId, title: 'Account Approved',
              body: 'Your soldier account has been approved by Adjutant.', type: 'general', read: false, createdAt: new Date().toISOString(),
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {
            showAlert('Error', 'Could not approve the soldier — check your connection and try again.');
          } finally {
            await load();
          }
        },
      },
    ]);
  };

  // Used both to reject a pending registration and to let the Adjutant
  // delete any already-approved soldier's account from the roster.
  const handleDeleteSoldier = (soldier: Soldier) => {
    if (user?.role !== 'adjutant') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const title = soldier.isApproved ? 'Delete Soldier' : 'Delete Registration';
    const message = soldier.isApproved
      ? `Permanently delete ${soldier.rank} ${soldier.name} (${soldier.serviceNumber})? This removes their account and cannot be undone.`
      : `Delete the registration for ${soldier.rank} ${soldier.name}? This cannot be undone.`;
    showAlert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setSoldiers(prev => prev.filter(s => s.id !== soldier.id));
          try {
            await deleteSoldier(soldier.id);
            await deleteUser(soldier.userId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {
            showAlert('Error', 'Could not delete the record — check your connection and try again.');
          } finally {
            await load();
          }
        },
      },
    ]);
  };

  const ptColor = (status: string) => {
    if (status === 'fit') return colors.success;
    if (status === 'unfit') return colors.destructive;
    return colors.muted;
  };

  const ptTextColor = (status: string) => {
    if (status === 'fit') return colors.success;
    if (status === 'unfit') return colors.destructive;
    return colors.mutedForeground;
  };

  const renderItem = ({ item }: { item: Soldier }) => {
    const bmi = calcBMI(item.weight, item.height);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/soldier/${item.id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.cardMiddle}>
          <Text style={[styles.name, { color: colors.foreground }]}>{item.rank} {item.name}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.serviceNumber} · {item.company} Coy</Text>
          <View style={styles.tagsRow}>
            <View style={[styles.tag, { backgroundColor: ptColor(item.ptStatus) + '15' }]}>
              <Text style={[styles.tagText, { color: ptTextColor(item.ptStatus) }]}>{item.ptStatus.toUpperCase()}</Text>
            </View>
            {item.isOverweight && (
              <View style={[styles.tag, { backgroundColor: colors.warning + '15' }]}>
                <MaterialCommunityIcons name="alert" size={10} color={colors.warning} />
                <Text style={[styles.tagText, { color: colors.warning }]}>OVERWEIGHT</Text>
              </View>
            )}
            {!item.isApproved && (
              <View style={[styles.tag, { backgroundColor: colors.accent + '15' }]}>
                <Text style={[styles.tagText, { color: colors.accent }]}>PENDING</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.bmiLabel, { color: colors.mutedForeground }]}>BMI</Text>
          <Text style={[styles.bmiValue, { color: bmi > 25 ? colors.warning : colors.success }]}>{bmi}</Text>
          {user?.role === 'adjutant' && !item.isApproved ? (
            <View style={styles.pendingActions}>
              <TouchableOpacity style={[styles.approveBtn, { backgroundColor: colors.success }]} onPress={() => handleApprove(item)}>
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.approveBtn, { backgroundColor: colors.destructive }]} onPress={() => handleDeleteSoldier(item)}>
                <Text style={styles.approveBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ) : user?.role === 'adjutant' ? (
            <View style={styles.approvedActions}>
              <TouchableOpacity onPress={() => handleDeleteSoldier(item)} hitSlop={8}>
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </TouchableOpacity>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </View>
          ) : (
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
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
        <Text style={[styles.title, { color: colors.foreground }]}>Soldiers</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{filtered.length} of {soldiers.length} shown</Text>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search name, service no, rank..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {user?.role !== 'coy_comd' && (
          <FlatList
            horizontal showsHorizontalScrollIndicator={false}
            data={COMPANIES}
            keyExtractor={i => i}
            contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterChip, { backgroundColor: companyFilter === item ? colors.primary : colors.card, borderColor: companyFilter === item ? colors.primary : colors.border }]}
                onPress={() => { Haptics.selectionAsync(); setCompanyFilter(item as Company | 'ALL'); }}
              >
                <Text style={[styles.filterChipText, { color: companyFilter === item ? '#FFF' : colors.mutedForeground }]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={i => i}
          contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, { backgroundColor: statusFilter === item ? colors.accent : colors.card, borderColor: statusFilter === item ? colors.accent : colors.border }]}
              onPress={() => { Haptics.selectionAsync(); setStatusFilter(item); }}
            >
              <Text style={[styles.filterChipText, { color: statusFilter === item ? '#000' : colors.mutedForeground }]}>{STATUS_LABELS[item] ?? item.toUpperCase()}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-off" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No soldiers found</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 4 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  cardLeft: {},
  cardMiddle: { flex: 1, gap: 3 },
  cardRight: { alignItems: 'center', gap: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  name: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  meta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  bmiLabel: { fontSize: 9, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  bmiValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  pendingActions: { gap: 4 },
  approvedActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  approveBtn: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, minWidth: 58, alignItems: 'center' },
  approveBtnText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
});
