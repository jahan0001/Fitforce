import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface BarDatum {
  label: string;
  value: number;
  color: string;
  sublabel?: string;
}

interface BarChartProps {
  data: BarDatum[];
  maxValue?: number;
  height?: number;
  unit?: string;
  labelColor: string;
  subColor: string;
  trackColor: string;
}

export function BarChart({ data, maxValue, height = 120, unit = '', labelColor, subColor, trackColor }: BarChartProps) {
  const max = maxValue ?? Math.max(1, ...data.map(d => d.value));
  return (
    <View style={styles.wrap}>
      {data.map((d, i) => {
        const pct = d.value > 0 ? Math.max(4, Math.round((d.value / max) * 100)) : 0;
        return (
          <View key={i} style={styles.col}>
            <Text style={[styles.value, { color: d.color }]} numberOfLines={1}>{d.value}{unit}</Text>
            <View style={[styles.track, { height, backgroundColor: trackColor }]}>
              <View style={[styles.bar, { height: `${pct}%`, backgroundColor: d.color }]} />
            </View>
            <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>{d.label}</Text>
            {d.sublabel ? <Text style={[styles.sublabel, { color: subColor }]} numberOfLines={1}>{d.sublabel}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', gap: 8 },
  col: { alignItems: 'center', flex: 1, gap: 6 },
  value: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  track: { width: '68%', maxWidth: 36, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 8 },
  label: { fontSize: 10, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  sublabel: { fontSize: 9, fontFamily: 'Inter_400Regular' },
});
