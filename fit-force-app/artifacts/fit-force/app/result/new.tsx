import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Platform, ActivityIndicator, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { showAlert } from '@/lib/alert';
import { getSoldiers, addIPFTResult, updateSoldier, addNotification, calcBMI, genId } from '@/lib/storage';
import type { Soldier, IPFTResult, IPFTResultItem } from '@/lib/types';

/**
 * Pass/fail for every item is now a direct choice by the clerk instead of
 * something parsed out of free text (e.g. "8:20" for a run time). The old
 * version tried to parse the run fields as MM:SS and silently marked the
 * item FAIL whenever that parse didn't match, which is why runs always came
 * back failed regardless of what was typed. Recording it as an explicit tap
 * also matches how these items are actually graded on the ground — pass/fail
 * per obstacle/event, not a formula.
 */
const DEFAULT_ITEMS = [
  { name: '1.6km Run', target: '< 9 min' },
  { name: '3.2km Run', target: '< 24 min' },
  { name: 'Push-ups', target: '≥ 35 reps/2min' },
  { name: 'Sit-ups', target: '≥ 30 reps/2min' },
  { name: 'Pull-ups', target: '≥ 6 reps' },
  { name: 'Swimming', target: 'Complete the swimming test' },
  { name: 'Beam', target: 'Cross the beam' },
  { name: 'Knee Bending', target: 'Complete knee bending' },
  { name: 'Horizontal Rope', target: 'Cross the horizontal rope' },
  { name: "Fireman's Lift", target: "Complete fireman's carry" },
  { name: 'Wall', target: 'Clear the wall obstacle' },
];

type Grade = 'pass' | 'fail' | null;

export default function NewResultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [selectedSoldier, setSelectedSoldier] = useState<Soldier | null>(null);
  const [searchSoldier, setSearchSoldier] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [achieved, setAchieved] = useState<string[]>(DEFAULT_ITEMS.map(() => ''));
  const [grades, setGrades] = useState<Grade[]>(DEFAULT_ITEMS.map(() => null));
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const all = await getSoldiers();
    setSoldiers(all.filter(s => s.isApproved));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredSoldiers = searchSoldier.trim()
    ? soldiers.filter(s => s.name.toLowerCase().includes(searchSoldier.toLowerCase()) || s.serviceNumber.toLowerCase().includes(searchSoldier.toLowerCase()))
    : soldiers;

  const gradedCount = grades.filter(g => g !== null).length;
  const overallPass = gradedCount > 0 && grades.every(g => g === null || g === 'pass');

  const handleSave = async () => {
    if (!selectedSoldier) { showAlert('Error', 'Please select a soldier.'); return; }
    if (!date) { showAlert('Error', 'Please enter date.'); return; }
    if (gradedCount === 0) { showAlert('Error', 'Mark at least one item as Pass or Fail.'); return; }
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const items: IPFTResultItem[] = DEFAULT_ITEMS
      .map((di, i) => ({ di, i }))
      .filter(({ i }) => grades[i] !== null)
      .map(({ di, i }) => ({
        name: di.name,
        target: di.target,
        achieved: achieved[i].trim() || (grades[i] === 'pass' ? 'Pass' : 'Fail'),
        status: grades[i] as 'pass' | 'fail',
      }));
    const overallStatus: 'pass' | 'fail' = overallPass ? 'pass' : 'fail';
    const failedNames = items.filter(it => it.status === 'fail').map(it => it.name);
    const bmi = calcBMI(selectedSoldier.weight, selectedSoldier.height);
    const isOverweight = bmi > 25;

    const result: IPFTResult = {
      id: genId(), soldierId: selectedSoldier.id, soldierName: selectedSoldier.name,
      soldierRank: selectedSoldier.rank, serviceNumber: selectedSoldier.serviceNumber,
      company: selectedSoldier.company, date, items, overallStatus,
      recordedBy: user!.id, recordedByName: user!.name, bmi,
    };
    // Previous results for this soldier are never overwritten — addIPFTResult
    // adds this as a new record, so their full IPFT history stays on their profile.
    await addIPFTResult(result);
    await updateSoldier(selectedSoldier.id, {
      ptStatus: overallStatus === 'pass' ? 'fit' : 'unfit',
      isOverweight,
    });

    const planNote = overallStatus === 'pass'
      ? ' You have been declared FIT.'
      : ` You have been declared UNFIT and assigned the Unfit/Rehabilitation PT plan.${failedNames.length ? ` Weak in: ${failedNames.join(', ')}.` : ''}`;
    await addNotification({
      id: genId(), targetUserId: selectedSoldier.userId,
      title: `IPFT Result: ${overallStatus.toUpperCase()}`,
      body: `Your IPFT result on ${date} is ${overallStatus.toUpperCase()}.${planNote}${isOverweight ? ' You are classified as overweight (BMI: ' + bmi + ').' : ''}`,
      type: 'new_result', read: false, createdAt: new Date().toISOString(),
    });
    if (isOverweight) {
      await addNotification({
        id: genId(), targetCompany: selectedSoldier.company,
        title: 'Overweight Soldier Alert',
        body: `${selectedSoldier.rank} ${selectedSoldier.name} (${selectedSoldier.serviceNumber}) is overweight. BMI: ${bmi}.`,
        type: 'overweight', read: false, createdAt: new Date().toISOString(),
      });
    }

    setIsSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert('Saved', `IPFT result recorded. Status: ${overallStatus.toUpperCase()}`, [{ text: 'OK', onPress: () => router.back() }]);
  };

  const paddingTop = (isWeb ? 67 : 0) + insets.top + 16;
  const paddingBottom = isWeb ? 34 : insets.bottom + 24;

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
      keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={20} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
      </TouchableOpacity>

      <Text style={[styles.screenTitle, { color: colors.foreground }]}>Record IPFT Result</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>SOLDIER</Text>
        <TouchableOpacity style={[styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
          onPress={() => setShowPicker(true)} activeOpacity={0.75}>
          {selectedSoldier ? (
            <View style={styles.pickerSelected}>
              <View style={[styles.pickerAvatar, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.pickerAvatarText, { color: colors.primary }]}>{selectedSoldier.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={[styles.pickerName, { color: colors.foreground }]}>{selectedSoldier.rank} {selectedSoldier.name}</Text>
                <Text style={[styles.pickerMeta, { color: colors.mutedForeground }]}>{selectedSoldier.serviceNumber} · {selectedSoldier.company} Coy</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.pickerPlaceholder, { color: colors.mutedForeground }]}>Select soldier...</Text>
          )}
          <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {showPicker && (
        <View style={[styles.pickerDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput style={[styles.searchInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
            value={searchSoldier} onChangeText={setSearchSoldier} placeholder="Search..." placeholderTextColor={colors.mutedForeground} />
          <FlatList
            data={filteredSoldiers} keyExtractor={i => i.id} style={{ maxHeight: 200 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                onPress={() => { setSelectedSoldier(item); setShowPicker(false); setSearchSoldier(''); }} activeOpacity={0.75}>
                <Text style={[styles.pickerItemName, { color: colors.foreground }]}>{item.rank} {item.name}</Text>
                <Text style={[styles.pickerItemMeta, { color: colors.mutedForeground }]}>{item.serviceNumber} · {item.company}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DATE (YYYY-MM-DD)</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
          value={date} onChangeText={setDate} placeholder="2026-07-28" placeholderTextColor={colors.mutedForeground} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>IPFT Results</Text>
        <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>Mark each item Pass or Fail. Notes are optional.</Text>
        {DEFAULT_ITEMS.map((item, i) => {
          const grade = grades[i];
          return (
            <View key={item.name} style={[styles.resultRow, { borderColor: grade === 'pass' ? colors.success : grade === 'fail' ? colors.destructive : colors.border }]}>
              <View style={styles.resultRowHeader}>
                <Text style={[styles.resultName, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.resultTarget, { color: colors.mutedForeground }]}>Target: {item.target}</Text>
              </View>
              <View style={styles.gradeRow}>
                <TouchableOpacity
                  style={[styles.gradeBtn, { borderColor: colors.success, backgroundColor: grade === 'pass' ? colors.success : 'transparent' }]}
                  onPress={() => { const g = [...grades]; g[i] = 'pass'; setGrades(g); Haptics.selectionAsync(); }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="check-circle" size={16} color={grade === 'pass' ? '#FFF' : colors.success} />
                  <Text style={[styles.gradeBtnText, { color: grade === 'pass' ? '#FFF' : colors.success }]}>PASS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.gradeBtn, { borderColor: colors.destructive, backgroundColor: grade === 'fail' ? colors.destructive : 'transparent' }]}
                  onPress={() => { const g = [...grades]; g[i] = 'fail'; setGrades(g); Haptics.selectionAsync(); }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="close-circle" size={16} color={grade === 'fail' ? '#FFF' : colors.destructive} />
                  <Text style={[styles.gradeBtnText, { color: grade === 'fail' ? '#FFF' : colors.destructive }]}>FAIL</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.resultInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                value={achieved[i]} onChangeText={v => { const a = [...achieved]; a[i] = v; setAchieved(a); }}
                placeholder={item.name.includes('Run') ? 'Note (optional), e.g. 8:20' : 'Note (optional), e.g. 40 reps'}
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          );
        })}
      </View>

      {selectedSoldier && gradedCount > 0 && (
        <View style={[styles.previewCard, {
          backgroundColor: overallPass ? colors.success + '10' : colors.destructive + '10',
          borderColor: overallPass ? colors.success : colors.destructive,
        }]}>
          <Text style={[styles.previewTitle, { color: overallPass ? colors.success : colors.destructive }]}>
            Overall: {overallPass ? 'PASS' : 'FAIL'}
          </Text>
          <Text style={[styles.previewSub, { color: colors.mutedForeground }]}>{gradedCount} of {DEFAULT_ITEMS.length} items graded</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, isSaving && { opacity: 0.7 }]}
        onPress={handleSave} disabled={isSaving} activeOpacity={0.85}>
        {isSaving ? <ActivityIndicator color="#FFF" /> : (
          <>
            <Feather name="save" size={20} color="#FFF" />
            <Text style={styles.saveBtnText}>Save Result</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  screenTitle: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  fieldLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular' },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, padding: 12 },
  pickerSelected: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pickerAvatarText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  pickerName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  pickerMeta: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  pickerPlaceholder: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  pickerDropdown: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  searchInput: { borderWidth: 1, borderRadius: 0, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular' },
  pickerItem: { padding: 14, borderBottomWidth: 1 },
  pickerItemName: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  pickerItemMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  sectionHint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: -6 },
  resultRow: { borderRadius: 10, borderWidth: 1.5, padding: 12, gap: 8 },
  resultRowHeader: {},
  resultName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  resultTarget: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  gradeRow: { flexDirection: 'row', gap: 8 },
  gradeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: 8, paddingVertical: 9 },
  gradeBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  resultInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, fontFamily: 'Inter_400Regular' },
  previewCard: { borderRadius: 12, borderWidth: 2, padding: 16, alignItems: 'center', gap: 4 },
  previewTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  previewSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 16 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#FFF' },
});
