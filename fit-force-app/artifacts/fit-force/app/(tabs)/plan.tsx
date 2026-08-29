import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { getPTPlans, getSoldiers } from '@/lib/storage';
import type { PTPlan, Soldier } from '@/lib/types';

export default function PlanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [plans, setPlans] = useState<PTPlan[]>([]);
  const [mySoldier, setMySoldier] = useState<Soldier | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const allPlans = await getPTPlans();
    setPlans(allPlans);
    if (user?.role === 'soldier') {
      const all = await getSoldiers();
      setMySoldier(all.find(s => s.userId === user.id) ?? null);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const visiblePlans = user?.role === 'soldier' && mySoldier
    ? plans.filter(p => p.type === (mySoldier.ptStatus === 'unfit' ? 'unfit' : 'fit'))
    : plans;

  const renderPlan = ({ item }: { item: PTPlan }) => {
    const accent = item.type === 'fit' ? colors.success : colors.warning;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: accent }]}
        onPress={() => router.push(`/plan/${item.id}`)}
        activeOpacity={0.75}
      >
        <View style={[styles.typeTag, { backgroundColor: accent }]}>
          <Text style={styles.typeTagText}>{item.type === 'fit' ? 'FIT' : 'REHABILITATION'}</Text>
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
        <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>Week {item.weekNumber} · {item.days.length} days · by {item.createdByName}</Text>
        <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{item.description}</Text>
        <View style={styles.footer}>
          <View style={styles.daysRow}>
            {item.days.map((d, i) => (
              <View key={i} style={[styles.dayDot, { backgroundColor: accent + '30', borderColor: accent }]}>
                <Text style={[styles.dayDotText, { color: accent }]}>{d.day.slice(0, 2)}</Text>
              </View>
            ))}
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>
    );
  };

  const paddingTop = 16;
  const paddingBottom = isWeb ? 34 : insets.bottom + 90;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {user?.role === '2ic' ? 'All PT Plans' : 'My PT Plan'}
        </Text>
        {user?.role === '2ic' && (
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/plan/new')}>
            <Feather name="plus" size={18} color="#FFF" />
            <Text style={styles.createBtnText}>New Plan</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={visiblePlans}
        keyExtractor={i => i.id}
        renderItem={renderPlan}
        contentContainerStyle={[styles.list, { paddingBottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="calendar" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No PT plans available</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  createBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  card: { borderRadius: 14, borderWidth: 1.5, padding: 16, gap: 8 },
  typeTag: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  typeTagText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#FFF', letterSpacing: 1 },
  cardTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  cardMeta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  cardDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  daysRow: { flexDirection: 'row', gap: 4 },
  dayDot: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 3, borderWidth: 1 },
  dayDotText: { fontSize: 9, fontFamily: 'Inter_600SemiBold' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
});
