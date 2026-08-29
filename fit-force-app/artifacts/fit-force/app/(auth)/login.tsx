import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Platform, Modal, FlatList, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import type { UserRole } from '@/lib/types';

interface RoleOption {
  role: UserRole;
  label: string;
  email: string;
  password: string;
  description: string;
  icon: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  { role: 'co', label: 'Commanding Officer (CO)', email: 'co@gmail.com', password: 'co123', description: 'Lt Col — Battalion Commander', icon: 'shield-star' },
  { role: '2ic', label: 'Second in Command (2IC)', email: '2ic@gmail.com', password: '2ic123', description: 'Maj — Deputy Commander', icon: 'shield-half-full' },
  { role: 'coy_comd', label: 'Company Commander (Coy Comd)', email: '', password: '', description: 'Maj — A/B/C/D Company', icon: 'account-group' },
  { role: 'adjutant', label: 'Adjutant', email: 'adjt@gmail.com', password: 'adjt123', description: 'Capt — Administration Officer', icon: 'file-document' },
  { role: 'clerk', label: 'Clerk', email: 'clerk@gmail.com', password: 'clerk123', description: 'Cpl — Record Keeper', icon: 'clipboard-text' },
  { role: 'soldier', label: 'Soldier', email: '', password: 'soldier123', description: 'Snk/LCpl/Cpl/Sgt — Rank & File', icon: 'run' },
];

const COY_COMD_OPTIONS = [
  { label: 'A Coy Commander', email: 'acoycomd@gmail.com', password: 'coya123' },
  { label: 'B Coy Commander', email: 'bcoycomd@gmail.com', password: 'coyb123' },
  { label: 'C Coy Commander', email: 'ccoycomd@gmail.com', password: 'coyc123' },
  { label: 'D Coy Commander', email: 'dcoycomd@gmail.com', password: 'coyd123' },
];

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [coyModalVisible, setCoyModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (option: RoleOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRole(option);
    setRoleModalVisible(false);
    setError('');
    if (option.role === 'coy_comd') {
      setCoyModalVisible(true);
      setEmail('');
      setPassword('');
    } else if (option.role === 'soldier') {
      setEmail('');
      setPassword('soldier123');
    } else {
      setEmail(option.email);
      setPassword(option.password);
    }
  };

  const handleCoySelect = (coy: typeof COY_COMD_OPTIONS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEmail(coy.email);
    setPassword(coy.password);
    setCoyModalVisible(false);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }
    setIsLoading(true);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await login(email.trim().toLowerCase(), password.trim());
    setIsLoading(false);
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error ?? 'Login failed.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const paddingTop = isWeb ? 67 + insets.top + 12 : insets.top + 20;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop, paddingBottom: isWeb ? 34 : insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">

        {/* ── Logo Header ── */}
        <View style={styles.header}>
          <View style={[styles.logoCircle, { borderColor: colors.accent, shadowColor: colors.primary }]}>
            <Image
              source={require('@/assets/images/fitforce-logo.jpg')}
              style={styles.logoImg}
              resizeMode="cover"
            />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>FIT FORCE</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Soldier Fitness Assessment System</Text>
          <View style={[styles.divider, { backgroundColor: colors.accent }]} />
        </View>

        {/* ── Form ── */}
        <View style={[styles.form, { backgroundColor: colors.card }]}>
          {/* Role picker */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ROLE</Text>
          <TouchableOpacity style={[styles.roleSelector, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setRoleModalVisible(true)} activeOpacity={0.8}>
            <MaterialCommunityIcons name={(selectedRole?.icon ?? 'shield-outline') as any} size={20} color={selectedRole ? colors.accent : colors.mutedForeground} />
            <Text style={[styles.roleSelectorText, { color: selectedRole ? colors.foreground : colors.mutedForeground }]}>
              {selectedRole ? selectedRole.label : 'Select your role'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
          {selectedRole && <Text style={[styles.roleDesc, { color: colors.accent }]}>{selectedRole.description}</Text>}

          {/* Email */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>EMAIL</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={email} onChangeText={t => { setEmail(t); setError(''); }}
              placeholder="Enter email address" placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            />
          </View>

          {/* Password */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}>PASSWORD</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1, color: colors.foreground }]}
              value={password} onChangeText={t => { setPassword(t); setError(''); }}
              placeholder="Enter password" placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Error */}
          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + '18' }]}>
              <Ionicons name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }, isLoading && { opacity: 0.7 }]}
            onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
            {isLoading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#FFF" />
                <Text style={styles.loginBtnText}>SIGN IN</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Register Link ── */}
        <TouchableOpacity style={styles.registerLinkWrap} onPress={() => router.push('/(auth)/register')} activeOpacity={0.7}>
          <Text style={[styles.registerLinkText, { color: colors.mutedForeground }]}>
            New soldier?{'  '}
            <Text style={[styles.registerLinkBold, { color: colors.primary }]}>Register here</Text>
          </Text>
        </TouchableOpacity>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>Bangladesh Army — Fitness Monitoring System</Text>
      </ScrollView>

      {/* Role Modal */}
      <Modal visible={roleModalVisible} transparent animationType="slide" onRequestClose={() => setRoleModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setRoleModalVisible(false)} activeOpacity={1}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Role</Text>
            <FlatList
              data={ROLE_OPTIONS} keyExtractor={i => i.role}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.roleItem, { borderBottomColor: colors.border }]} onPress={() => handleRoleSelect(item)} activeOpacity={0.75}>
                  <View style={[styles.roleItemIcon, { backgroundColor: colors.muted }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleItemLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={[styles.roleItemDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
                  </View>
                  {selectedRole?.role === item.role && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Coy Modal */}
      <Modal visible={coyModalVisible} transparent animationType="slide" onRequestClose={() => setCoyModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setCoyModalVisible(false)} activeOpacity={1}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Company</Text>
            {COY_COMD_OPTIONS.map(coy => (
              <TouchableOpacity key={coy.email} style={[styles.roleItem, { borderBottomColor: colors.border }]} onPress={() => handleCoySelect(coy)} activeOpacity={0.75}>
                <View style={[styles.roleItemIcon, { backgroundColor: colors.muted }]}>
                  <MaterialCommunityIcons name="flag" size={22} color={colors.accent} />
                </View>
                <Text style={[styles.roleItemLabel, { color: colors.foreground }]}>{coy.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 3, overflow: 'hidden',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },
  logoImg: { width: '100%', height: '100%' },
  appName: { fontSize: 30, fontFamily: 'Inter_700Bold', letterSpacing: 6, marginBottom: 4 },
  tagline: { fontSize: 13, fontFamily: 'Inter_400Regular', letterSpacing: 1.5 },
  divider: { height: 2, width: 60, marginTop: 16, borderRadius: 1 },
  form: { borderRadius: 18, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.5, marginBottom: 8 },
  roleSelector: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  roleSelectorText: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  roleDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', paddingVertical: 13 },
  eyeBtn: { padding: 4 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, padding: 10, marginTop: 12 },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 15, marginTop: 20, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  loginBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFF', letterSpacing: 2 },
  registerLinkWrap: { alignItems: 'center', paddingVertical: 12 },
  registerLinkText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  registerLinkBold: { fontFamily: 'Inter_600SemiBold' },
  footer: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 8, marginBottom: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 12, maxHeight: '80%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 12, textAlign: 'center' },
  roleItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1 },
  roleItemIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  roleItemLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  roleItemDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
});
