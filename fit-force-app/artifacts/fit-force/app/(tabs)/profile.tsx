import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { calcBMI, getSoldiers, getUsers, updateSoldier, updateUser, addNotification, genId } from '@/lib/storage';
import type { Company } from '@/lib/types';

const ROLE_LABELS: Record<string, string> = {
  co: 'Commanding Officer', '2ic': 'Second in Command',
  coy_comd: 'Company Commander', adjutant: 'Adjutant',
  clerk: 'Clerk', soldier: 'Soldier',
};

const COMPANIES: Company[] = ['A', 'B', 'C', 'D'];

const EDITABLE_FIELD_LABELS: Record<string, string> = {
  email: 'email',
  phone: 'phone number',
  company: 'company',
  height: 'height',
  weight: 'weight',
  age: 'age',
  address: 'address',
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [editVisible, setEditVisible] = useState(false);
  const [companyModal, setCompanyModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState<Company | ''>('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void logout();
  };

  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/login');
    }
  }, [user]);

  if (!user) return null;

  const bmi = user.height && user.weight ? calcBMI(user.weight, user.height) : null;
  const bmiStatus = bmi ? (bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese') : null;
  const bmiColor = bmi ? (bmi < 25 ? colors.success : bmi < 30 ? colors.warning : colors.destructive) : colors.mutedForeground;

  const openEdit = () => {
    setEmail(user.email ?? '');
    setPhone(user.phone ?? '');
    setCompany(user.company ?? '');
    setHeight(user.height ? String(user.height) : '');
    setWeight(user.weight ? String(user.weight) : '');
    setAge(user.age ? String(user.age) : '');
    setAddress(user.address ?? '');
    setErrors([]);
    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    const errs: string[] = [];
    if (!email.trim() || !email.includes('@')) errs.push('Valid email is required.');
    if (!height || isNaN(Number(height))) errs.push('Valid height (cm) is required.');
    if (!weight || isNaN(Number(weight))) errs.push('Valid weight (kg) is required.');
    if (!age || isNaN(Number(age))) errs.push('Valid age is required.');
    if (!address.trim()) errs.push('Address is required.');

    const normalizedEmail = email.trim().toLowerCase();
    if (errs.length === 0 && normalizedEmail !== user.email.toLowerCase()) {
      const users = await getUsers();
      if (users.some(u => u.id !== user.id && u.email.toLowerCase() === normalizedEmail)) {
        errs.push('This email is already used by another account.');
      }
    }
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);

    const newValues: Record<string, any> = {
      email: normalizedEmail,
      phone: phone.trim() || undefined,
      company: company || undefined,
      height: Number(height),
      weight: Number(weight),
      age: Number(age),
      address: address.trim(),
    };

    const changedFields: string[] = [];
    (Object.keys(newValues) as (keyof typeof newValues)[]).forEach(key => {
      if ((user as any)[key] !== newValues[key]) changedFields.push(key);
    });

    if (changedFields.length === 0) { setEditVisible(false); return; }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await updateUser(user.id, newValues);

    if (user.role === 'soldier') {
      const soldiers = await getSoldiers();
      const soldier = soldiers.find(s => s.userId === user.id);
      if (soldier) {
        const isOverweight = calcBMI(newValues.weight, newValues.height) > 25;
        await updateSoldier(soldier.id, {
          email: newValues.email,
          phone: newValues.phone ?? '',
          company: newValues.company,
          height: newValues.height,
          weight: newValues.weight,
          age: newValues.age,
          address: newValues.address,
          isOverweight,
        });
      }
      const changedLabels = changedFields.map(f => EDITABLE_FIELD_LABELS[f] ?? f).join(', ');
      await addNotification({
        id: genId(), targetRole: 'clerk',
        title: 'Soldier Profile Updated',
        body: `${user.rank} ${user.name} updated their profile: ${changedLabels}.`,
        type: 'general', read: false, createdAt: new Date().toISOString(),
      });
    }

    await refreshUser();
    setIsSaving(false);
    setEditVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const InfoRow = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={styles.infoLeft}>
        <MaterialCommunityIcons name={icon as any} size={18} color={colors.mutedForeground} />
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={2}>{value}</Text>
    </View>
  );

  const paddingTop = 16;
  const paddingBottom = isWeb ? 24 : insets.bottom + 170;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
      >
      <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.profileRole}>{ROLE_LABELS[user.role] ?? user.role}</Text>
        <View style={styles.badgesRow}>
          {user.rank && <View style={styles.profileBadge}><Text style={styles.profileBadgeText}>{user.rank}</Text></View>}
          {user.ba && <View style={styles.profileBadge}><Text style={styles.profileBadgeText}>{user.ba}</Text></View>}
          {user.company && <View style={styles.profileBadge}><Text style={styles.profileBadgeText}>{user.company} Company</Text></View>}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.editBtn, { borderColor: colors.primary, backgroundColor: colors.card }]}
        onPress={openEdit}
        activeOpacity={0.8}
      >
        <Feather name="edit-2" size={18} color={colors.primary} />
        <Text style={[styles.editText, { color: colors.primary }]}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: colors.destructive, backgroundColor: colors.card }]}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>

      {bmi && (
        <View style={[styles.bmiCard, { backgroundColor: colors.card, borderColor: bmiColor }]}>
          <View style={styles.bmiLeft}>
            <Text style={[styles.bmiTitle, { color: colors.foreground }]}>Body Mass Index</Text>
            <Text style={[styles.bmiStatus, { color: bmiColor }]}>{bmiStatus}</Text>
          </View>
          <Text style={[styles.bmiBig, { color: bmiColor }]}>{bmi}</Text>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Personal Information</Text>
        <InfoRow label="Email" value={user.email} icon="email-outline" />
        {user.phone && <InfoRow label="Phone" value={user.phone} icon="phone-outline" />}
        {user.company && <InfoRow label="Company" value={`${user.company} Company`} icon="flag-outline" />}
        {user.age && <InfoRow label="Age" value={`${user.age} years`} icon="cake-variant" />}
        {user.address && <InfoRow label="Address" value={user.address} icon="map-marker-outline" />}
      </View>

      {(user.height || user.weight) && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Physical Metrics</Text>
          {user.height && <InfoRow label="Height" value={`${user.height} cm`} icon="human-male-height" />}
          {user.weight && <InfoRow label="Weight" value={`${user.weight} kg`} icon="weight-kilogram" />}
        </View>
      )}

      </ScrollView>

      {/* Edit profile modal */}
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20, maxHeight: '88%' }]}>
            <View style={styles.modalHandle} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Profile</Text>

              {errors.length > 0 && (
                <View style={[styles.errorBox, { backgroundColor: colors.destructive + '12', borderColor: colors.destructive }]}>
                  {errors.map((e, i) => <Text key={i} style={[styles.errorText, { color: colors.destructive }]}>• {e}</Text>)}
                </View>
              )}

              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Email</Text>
              <TextInput style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                value={email} onChangeText={setEmail} placeholder="e.g. name@gmail.com" placeholderTextColor={colors.mutedForeground} keyboardType="email-address" autoCapitalize="none" />

              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Phone</Text>
              <TextInput style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                value={phone} onChangeText={setPhone} placeholder="e.g. 01711-123456" placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" />

              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Company (Coy)</Text>
              <TouchableOpacity style={[styles.selectBtn, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setCompanyModal(true)}>
                <Text style={[styles.selectText, { color: company ? colors.foreground : colors.mutedForeground }]}>{company ? `${company} Company` : 'Select company'}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>

              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Height (cm)</Text>
              <TextInput style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                value={height} onChangeText={setHeight} placeholder="e.g. 170" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" />

              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Weight (kg)</Text>
              <TextInput style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                value={weight} onChangeText={setWeight} placeholder="e.g. 68" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" />

              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Age</Text>
              <TextInput style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                value={age} onChangeText={setAge} placeholder="e.g. 22" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" />

              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Address</Text>
              <TextInput style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, height: 70, textAlignVertical: 'top' }]}
                value={address} onChangeText={setAddress} placeholder="e.g. House 12, Road 5, Dhaka" placeholderTextColor={colors.mutedForeground} multiline />

              {user.role === 'soldier' && (
                <View style={[styles.noticeBox, { backgroundColor: colors.accent + '15', borderColor: colors.accent }]}>
                  <Feather name="info" size={14} color={colors.accent} />
                  <Text style={[styles.noticeText, { color: colors.accent }]}>The Clerk will be notified when you update your profile.</Text>
                </View>
              )}

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, isSaving && { opacity: 0.7 }]} onPress={handleSaveEdit} disabled={isSaving}>
                <Feather name="check" size={18} color="#FFF" />
                <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setEditVisible(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Company picker */}
      <Modal visible={companyModal} transparent animationType="slide" onRequestClose={() => setCompanyModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCompanyModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Company</Text>
            {COMPANIES.map(opt => (
              <TouchableOpacity key={opt} style={[styles.optionRow, { borderBottomColor: colors.border }]}
                onPress={() => { setCompany(opt); setCompanyModal(false); Haptics.selectionAsync(); }}>
                <Text style={[styles.optionText, { color: colors.foreground }]}>{opt} Company</Text>
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
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  headerCard: { borderRadius: 20, padding: 28, alignItems: 'center', gap: 6 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText: { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#FFF' },
  profileName: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#FFF', textAlign: 'center' },
  profileRole: { fontSize: 14, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)' },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'center' },
  profileBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  profileBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  bmiCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 18, borderWidth: 2 },
  bmiLeft: { gap: 4 },
  bmiTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  bmiStatus: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  bmiBig: { fontSize: 42, fontFamily: 'Inter_700Bold' },
  section: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', padding: 14, paddingBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  infoValue: { fontSize: 14, fontFamily: 'Inter_500Medium', flex: 1, textAlign: 'right' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, borderWidth: 1.5, marginTop: 14 },
  editText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, borderWidth: 1.5 },
  logoutText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 16, textAlign: 'center' },
  modalLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  selectText: { fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1 },
  optionRow: { paddingVertical: 14, borderBottomWidth: 1 },
  optionText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  errorBox: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 4, marginBottom: 12 },
  errorText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  noticeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, borderWidth: 1, padding: 10, marginBottom: 12 },
  noticeText: { fontSize: 12, fontFamily: 'Inter_500Medium', flex: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 13, marginBottom: 8, marginTop: 4 },
  saveBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  cancelBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
