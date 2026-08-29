import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { showAlert } from '@/lib/alert';
import { getPTPlans } from '@/lib/storage';
import { API_BASE } from '@/lib/api';
import type { PTPlan, PTPlanDay } from '@/lib/types';

/**
 * The plan PDF is generated on the shared server (server/pdf.js) rather than
 * via expo-print, because expo-print's web implementation has no real
 * "generate a PDF file" capability — printToFileAsync just calls
 * window.print() on web, which always opens the browser's print dialog. A
 * server-generated PDF lets both web and native do a genuine one-tap
 * download with no dialog in between.
 */
async function downloadPlanPdf(plan: PTPlan): Promise<{ url: string; name: string }> {
  const res = await fetch(`${API_BASE}/generate-plan-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  });
  if (!res.ok) throw new Error('PDF generation failed');
  return res.json();
}

export default function PlanDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isWeb = Platform.OS === 'web';

  const [plan, setPlan] = useState<PTPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    (async () => {
      const plans = await getPTPlans();
      setPlan(plans.find(p => p.id === id) ?? null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!plan) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.mutedForeground }}>Plan not found</Text></View>;

  const handleExport = async () => {
    setIsExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { url, name } = await downloadPlanPdf(plan);
      const fileUrl = `${API_BASE}${url}?download=1`;
      if (isWeb) {
        // Plain browser download — no print dialog, no new tab.
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const localUri = FileSystem.cacheDirectory + name;
        const { uri } = await FileSystem.downloadAsync(fileUrl, localUri);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: plan.title });
        } else {
          showAlert('Downloaded', `PDF saved to: ${uri}`);
        }
      }
    } catch (e) {
      showAlert('Error', 'Could not download the PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const accent = plan.type === 'fit' ? colors.success : colors.warning;
  const paddingTop = (isWeb ? 67 : 0) + insets.top + 16;
  const paddingBottom = isWeb ? 34 : insets.bottom + 24;

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.primary }, isExporting && { opacity: 0.7 }]}
          onPress={handleExport} disabled={isExporting} activeOpacity={0.85}
        >
          {isExporting ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name="download" size={15} color="#FFF" />}
          <Text style={styles.exportBtnText}>{isExporting ? 'Preparing...' : 'Download PDF'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.heroCard, { backgroundColor: accent + '15', borderColor: accent }]}>
        <View style={[styles.typeTag, { backgroundColor: accent }]}>
          <Text style={styles.typeTagText}>{plan.type === 'fit' ? 'FIT PLAN' : 'REHABILITATION PLAN'}</Text>
        </View>
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>{plan.title}</Text>
        <Text style={[styles.heroDesc, { color: colors.mutedForeground }]}>{plan.description}</Text>
        <View style={styles.heroMetaRow}>
          <View style={styles.metaPill}>
            <Feather name="calendar" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Week {plan.weekNumber}</Text>
          </View>
          <View style={styles.metaPill}>
            <MaterialCommunityIcons name="dumbbell" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{plan.days.length} days</Text>
          </View>
          <View style={styles.metaPill}>
            <Feather name="user" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{plan.createdByName}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Weekly Schedule</Text>
      {plan.days.map((day: PTPlanDay, idx: number) => {
        const isExpanded = expandedDay === idx;
        return (
          <View key={idx} style={[styles.dayCard, { backgroundColor: colors.card, borderColor: isExpanded ? accent : colors.border }]}>
            <TouchableOpacity style={styles.dayHeader} onPress={() => setExpandedDay(isExpanded ? null : idx)} activeOpacity={0.75}>
              <View style={[styles.dayNumber, { backgroundColor: accent }]}>
                <Text style={styles.dayNumberText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dayName, { color: colors.foreground }]}>{day.day}</Text>
                <Text style={[styles.dayFocus, { color: accent }]}>{day.focus}</Text>
              </View>
              <View style={styles.exerciseCount}>
                <Text style={[styles.exerciseCountText, { color: colors.mutedForeground }]}>{day.exercises.length} exercises</Text>
              </View>
              <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            {isExpanded && (
              <View style={[styles.exerciseList, { borderTopColor: colors.border }]}>
                {day.exercises.map((ex, ei) => (
                  <View key={ei} style={[styles.exerciseItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.exerciseBullet, { backgroundColor: accent }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.exerciseName, { color: colors.foreground }]}>{ex.name}</Text>
                      <Text style={[styles.exerciseTarget, { color: colors.primary }]}>{ex.target}</Text>
                      {ex.notes && <Text style={[styles.exerciseNotes, { color: colors.mutedForeground }]}>{ex.notes}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  exportBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  backText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  heroCard: { borderRadius: 16, padding: 18, borderWidth: 1.5, gap: 8 },
  typeTag: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  typeTagText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#FFF', letterSpacing: 1 },
  heroTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  heroDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  heroMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  sectionLabel: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  dayCard: { borderRadius: 12, borderWidth: 1.5, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  dayNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayNumberText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#FFF' },
  dayName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  dayFocus: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 1 },
  exerciseCount: {},
  exerciseCountText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  exerciseList: { borderTopWidth: 1 },
  exerciseItem: { flexDirection: 'row', gap: 12, padding: 14, borderBottomWidth: 1, alignItems: 'flex-start' },
  exerciseBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  exerciseName: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  exerciseTarget: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  exerciseNotes: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2, fontStyle: 'italic' },
});
