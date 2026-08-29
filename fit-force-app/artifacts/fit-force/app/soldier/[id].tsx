import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { getSoldierById, getIPFTResultsBySoldier, calcBMI } from '@/lib/storage';
import type { Soldier, IPFTResult } from '@/lib/types';

export default function SoldierDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isWeb = Platform.OS === 'web';

  const [soldier, setSoldier] = useState<Soldier | null>(null);
  const [results, setResults] = useState<IPFTResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const [s, r] = await Promise.all([getSoldierById(id), getIPFTResultsBySoldier(id)]);
      setSoldier(s);
      setResults(r);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!soldier) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.mutedForeground }}>Soldier not found</Text></View>;

  const bmi = calcBMI(soldier.weight, soldier.height);
  const bmiStatus = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  const bmiColor = bmi < 25 ? colors.success : bmi < 30 ? colors.warning : colors.destructive;
  const ptColor = soldier.ptStatus === 'fit' ? colors.success : soldier.ptStatus === 'unfit' ? colors.destructive : colors.muted;

  const paddingTop = (isWeb ? 67 : 0) + insets.top + 16;
  const paddingBottom = isWeb ? 34 : insets.bottom + 20;

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={20} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
      </TouchableOpacity>

      <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>{soldier.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</Text>
        </View>
        <Text style={styles.heroName}>{soldier.rank} {soldier.name}</Text>
        <Text style={styles.heroService}>{soldier.serviceNumber}</Text>
        <View style={styles.heroBadgesRow}>
          <View style={[styles.heroBadge, { backgroundColor: ptColor }]}>
            <Text style={styles.heroBadgeText}>{soldier.ptStatus.toUpperCase()}</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{soldier.company} Company</Text>
          </View>
          {soldier.isOverweight && (
            <View style={[styles.heroBadge, { backgroundColor: colors.warning }]}>
              <MaterialCommunityIcons name="alert" size={10} color="#FFF" />
              <Text style={styles.heroBadgeText}>OVERWEIGHT</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.bmiCard, { backgroundColor: colors.card, borderColor: bmiColor }]}>
        <View>
          <Text style={[styles.bmiLabel, { color: colors.foreground }]}>BMI</Text>
          <Text style={[styles.bmiStatus, { color: bmiColor }]}>{bmiStatus}</Text>
        </View>
        <Text style={[styles.bmiBig, { color: bmiColor }]}>{bmi}</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Personal Details</Text>
        {[
          { icon: 'email-outline', label: 'Email', value: soldier.email },
          { icon: 'phone-outline', label: 'Phone', value: soldier.phone },
          { icon: 'water', label: 'Blood Group', value: soldier.bloodGroup },
          { icon: 'medical-bag', label: 'Medical Category', value: soldier.medicalCategory },
          { icon: 'cake-variant', label: 'Age', value: `${soldier.age} years` },
          { icon: 'human-male-height', label: 'Height', value: `${soldier.height} cm` },
          { icon: 'weight-kilogram', label: 'Weight', value: `${soldier.weight} kg` },
          ...(soldier.address ? [{ icon: 'map-marker-outline', label: 'Address', value: soldier.address }] : []),
        ].map(({ icon, label, value }) => (
          <View key={label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoLeft}>
              <MaterialCommunityIcons name={icon as any} size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.historyTitle, { color: colors.foreground }]}>IPFT History ({results.length} records)</Text>
      {results.length === 0 ? (
        <View style={[styles.emptyHistory, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="clipboard" size={32} color={colors.border} />
          <Text style={[styles.emptyHistoryText, { color: colors.mutedForeground }]}>No IPFT results recorded</Text>
        </View>
      ) : (
        results.map(result => (
          <View key={result.id} style={[styles.resultCard, { backgroundColor: result.overallStatus === 'pass' ? colors.success + '08' : colors.destructive + '08', borderColor: result.overallStatus === 'pass' ? colors.success : colors.destructive }]}>
            <View style={styles.resultHeader}>
              <Text style={[styles.resultDate, { color: colors.foreground }]}>{result.date}</Text>
              <View style={styles.resultBadgeRow}>
                {result.biannual && (
                  <View style={[styles.biannualBadge, { borderColor: colors.border }]}>
                    <Text style={[styles.biannualBadgeText, { color: colors.mutedForeground }]}>{result.biannual} Biannual</Text>
                  </View>
                )}
                <View style={[styles.resultBadge, { backgroundColor: result.overallStatus === 'pass' ? colors.success : colors.destructive }]}>
                  <Text style={styles.resultBadgeText}>{result.overallStatus.toUpperCase()}</Text>
                </View>
              </View>
            </View>
            {result.selfReported && <Text style={[styles.selfReportedNote, { color: colors.mutedForeground }]}>Self-reported at registration (previous unit)</Text>}
            {result.bmi && <Text style={[styles.resultBmi, { color: colors.mutedForeground }]}>BMI: {result.bmi}</Text>}
            {result.items.map((item, i) => (
              <View key={i} style={styles.resultItem}>
                <MaterialCommunityIcons name={item.status === 'pass' ? 'check-circle' : 'close-circle'} size={16} color={item.status === 'pass' ? colors.success : colors.destructive} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultItemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.resultItemMeta, { color: colors.mutedForeground }]}>Achieved: {item.achieved} · Target: {item.target}</Text>
                </View>
              </View>
            ))}
            <Text style={[styles.resultBy, { color: colors.mutedForeground }]}>Recorded by {result.recordedByName}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  backText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  heroCard: { borderRadius: 20, padding: 28, alignItems: 'center', gap: 6 },
  heroAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroAvatarText: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#FFF' },
  heroName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFF', textAlign: 'center' },
  heroService: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' },
  heroBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, justifyContent: 'center' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#FFF', letterSpacing: 0.5 },
  bmiCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 16, borderWidth: 2 },
  bmiLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  bmiStatus: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 2 },
  bmiBig: { fontSize: 40, fontFamily: 'Inter_700Bold' },
  section: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', padding: 14, paddingBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  infoValue: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  historyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  emptyHistory: { borderRadius: 12, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8 },
  emptyHistoryText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  resultCard: { borderRadius: 12, borderWidth: 1.5, padding: 14, gap: 10 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultDate: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  resultBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  biannualBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  biannualBadgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  selfReportedNote: { fontSize: 11, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  resultBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  resultBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#FFF' },
  resultBmi: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  resultItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  resultItemName: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  resultItemMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  resultBy: { fontSize: 11, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
});
