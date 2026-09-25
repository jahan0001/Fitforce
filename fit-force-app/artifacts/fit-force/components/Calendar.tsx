import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toISODate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

interface CalendarProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  colors: {
    foreground: string;
    mutedForeground: string;
    primary: string;
    border: string;
    card: string;
    muted: string;
  };
}

export function Calendar({ value, onChange, minDate, colors }: CalendarProps) {
  const initial = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const min = minDate ? new Date(minDate + 'T00:00:00') : null;

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const goPrevMonth = () => {
    Haptics.selectionAsync();
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else { setViewMonth(viewMonth - 1); }
  };
  const goNextMonth = () => {
    Haptics.selectionAsync();
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else { setViewMonth(viewMonth + 1); }
  };

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goPrevMonth} style={styles.navBtn} hitSlop={8}>
          <Feather name="chevron-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: colors.foreground }]}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={goNextMonth} style={styles.navBtn} hitSlop={8}>
          <Feather name="chevron-right" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((w, i) => (
          <Text key={i} style={[styles.weekdayLabel, { color: colors.mutedForeground }]}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={styles.cell} />;
          const iso = toISODate(viewYear, viewMonth, day);
          const isSelected = iso === value;
          const cellDate = new Date(viewYear, viewMonth, day);
          const isDisabled = min ? cellDate < min : false;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.cell, styles.dayCell, isSelected && { backgroundColor: colors.primary }]}
              disabled={isDisabled}
              onPress={() => { Haptics.selectionAsync(); onChange(iso); }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dayText,
                { color: isSelected ? '#FFF' : isDisabled ? colors.mutedForeground : colors.foreground },
                isDisabled && { opacity: 0.35 },
              ]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 12, padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  navBtn: { padding: 4 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCell: { borderRadius: 8 },
  dayText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
