import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export function AppHeader() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  // On web: account for 67px Replit preview bar overlay
  // On native: account for device status bar (insets.top)
  const topPad = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.primary, paddingTop: topPad }]}>
      <View style={styles.inner}>
        <View style={[styles.logoWrap, { borderColor: colors.accent }]}>
          <Image
            source={require('@/assets/images/fitforce-logo.jpg')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Fit Force</Text>
          <Text style={styles.subtitle}>Soldier Fitness Assessment System</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    height: 68,
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 19,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.3,
  },
});
