import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { showAlert } from '@/lib/alert';
import { addPTPlan, addNotification, genId } from '@/lib/storage';
import type { PTPlan, PTPlanDay, PTExercise } from '@/lib/types';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface ExerciseForm {
  name: string;
  target: string;
  notes: string;
}

interface DayForm {
  focus: string;
  exercises: ExerciseForm[];
}

export default function NewPlanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [title, setTitle] = useState('');
  const [type, setType] = useState<'fit' | 'unfit'>('fit');
  const [description, setDescription] = useState('');
  const [weekNumber, setWeekNumber] = useState('');
  const [days, setDays] = useState<DayForm[]>(
    DAYS.map(() => ({ focus: '', exercises: [{ name: '', target: '', notes: '' }] }))
  );
  const [isSaving, setIsSaving] = useState(false);

  const updateDay = (di: number, field: keyof DayForm, value: string) => {
    setDays(prev => prev.map((d, i) => i === di ? { ...d, [field]: value } : d));
  };

  const updateExercise = (di: number, ei: number, field: keyof ExerciseForm, value: string) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== di) return d;
      return { ...d, exercises: d.exercises.map((e, j) => j === ei ? { ...e, [field]: value } : e) };
    }));
  };

  const addExercise = (di: number) => {
    setDays(prev => prev.map((d, i) => i === di ? { ...d, exercises: [...d.exercises, { name: '', target: '', notes: '' }] } : d));
  };

  const removeExercise = (di: number, ei: number) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== di || d.exercises.length <= 1) return d;
      return { ...d, exercises: d.exercises.filter((_, j) => j !== ei) };
    }));
  };

  const handleSave = async () => {
    if (!title.trim()) { showAlert('Error', 'Plan title is required.'); return; }
    if (!weekNumber.trim() || isNaN(Number(weekNumber))) { showAlert('Error', 'Valid week number required.'); return; }
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const planDays: PTPlanDay[] = days.map((d, i) => ({
      day: DAYS[i],
      focus: d.focus.trim() || 'General Training',
      exercises: d.exercises.filter(e => e.name.trim()).map(e => ({
        name: e.name.trim(),
        target: e.target.trim() || 'Complete as required',
        notes: e.notes.trim() || undefined,
      } as PTExercise)),
    })).filter(d => d.exercises.length > 0);

    if (planDays.length === 0) { showAlert('Error', 'Add at least one exercise.'); setIsSaving(false); return; }

    const plan: PTPlan = {
      id: genId(), title: title.trim(), type, description: description.trim(),
      createdBy: user!.id, createdByName: user!.name,
      weekNumber: Number(weekNumber), days: planDays,
      createdAt: new Date().toISOString(),
    };
    await addPTPlan(plan);
    await addNotification({
      id: genId(), title: 'New PT Plan Published',
      body: `Week ${weekNumber} ${type === 'fit' ? 'Fit' : 'Rehabilitation'} PT Plan has been published.`,
      type: 'new_plan', read: false, createdAt: new Date().toISOString(),
    });
    setIsSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert('Success', 'PT Plan created and published!', [{ text: 'OK', onPress: () => router.back() }]);
  };

  const paddingTop = (isWeb ? 67 : 0) + insets.top + 16;
  const paddingBottom = isWeb ? 34 : insets.bottom + 24;

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
      keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="x" size={20} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Cancel</Text>
      </TouchableOpacity>

      <Text style={[styles.screenTitle, { color: colors.foreground }]}>Create PT Plan</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>PLAN TYPE</Text>
        <View style={styles.typeRow}>
          {(['fit', 'unfit'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.typeBtn, { backgroundColor: type === t ? (t === 'fit' ? colors.success : colors.warning) : colors.muted }]}
              onPress={() => setType(t)} activeOpacity={0.75}>
              <Text style={[styles.typeBtnText, { color: type === t ? '#FFF' : colors.mutedForeground }]}>
                {t === 'fit' ? 'FIT' : 'REHABILITATION'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TITLE</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
          value={title} onChangeText={setTitle} placeholder="e.g. Week 30 Fitness Plan" placeholderTextColor={colors.mutedForeground} />

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>WEEK NUMBER</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
          value={weekNumber} onChangeText={setWeekNumber} placeholder="e.g. 30" placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric" />

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DESCRIPTION</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, height: 80, textAlignVertical: 'top' }]}
          value={description} onChangeText={setDescription} placeholder="Brief description..." placeholderTextColor={colors.mutedForeground} multiline />
      </View>

      <Text style={[styles.daysTitle, { color: colors.foreground }]}>Daily Schedule</Text>

      {DAYS.map((dayName, di) => {
        const day = days[di];
        return (
          <View key={dayName} style={[styles.dayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.dayTitle, { color: colors.foreground }]}>{dayName}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
              value={day.focus} onChangeText={v => updateDay(di, 'focus', v)}
              placeholder="Focus (e.g. Cardio, Strength...)" placeholderTextColor={colors.mutedForeground}
            />
            {day.exercises.map((ex, ei) => (
              <View key={ei} style={[styles.exerciseBlock, { borderColor: colors.border }]}>
                <View style={styles.exerciseBlockHeader}>
                  <Text style={[styles.exerciseBlockTitle, { color: colors.mutedForeground }]}>Exercise {ei + 1}</Text>
                  {day.exercises.length > 1 && (
                    <TouchableOpacity onPress={() => removeExercise(di, ei)}>
                      <Feather name="minus-circle" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                  value={ex.name} onChangeText={v => updateExercise(di, ei, 'name', v)} placeholder="Exercise name" placeholderTextColor={colors.mutedForeground} />
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                  value={ex.target} onChangeText={v => updateExercise(di, ei, 'target', v)} placeholder="Target (e.g. 3 sets x 20 reps)" placeholderTextColor={colors.mutedForeground} />
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                  value={ex.notes} onChangeText={v => updateExercise(di, ei, 'notes', v)} placeholder="Notes (optional)" placeholderTextColor={colors.mutedForeground} />
              </View>
            ))}
            <TouchableOpacity style={[styles.addExBtn, { borderColor: colors.primary }]} onPress={() => addExercise(di)}>
              <Feather name="plus" size={14} color={colors.primary} />
              <Text style={[styles.addExText, { color: colors.primary }]}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, isSaving && { opacity: 0.7 }]}
        onPress={handleSave} disabled={isSaving} activeOpacity={0.85}>
        {isSaving ? <ActivityIndicator color="#FFF" /> : (
          <>
            <Feather name="check-circle" size={20} color="#FFF" />
            <Text style={styles.saveBtnText}>Publish PT Plan</Text>
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
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  typeBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular' },
  daysTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  dayCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  dayTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  exerciseBlock: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  exerciseBlockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exerciseBlockTitle: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  addExBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingVertical: 9, borderStyle: 'dashed' },
  addExText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 16 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#FFF' },
});
