import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator,
  Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { showAlert } from '@/lib/alert';
import { getUsers, addUser, addSoldier, addIPFTResult, addNotification, genId, calcAge } from '@/lib/storage';
import type { UserRole, SoldierRank, Company, BloodGroup } from '@/lib/types';

const RANKS: SoldierRank[] = ['Snk', 'LCpl', 'Cpl', 'Sgt', 'WO', 'SWO'];
const COMPANIES: Company[] = ['A', 'B', 'C', 'D'];
const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MED_CATS = ['Category A', 'Category B', 'Category C'];
const PREVIOUS_RESULT_OPTIONS = ['Not Applicable (First Time)', 'Pass', 'Fail'];
const BIANNUAL_OPTIONS = ['1st Biannual', '2nd Biannual'];

type Colors = ReturnType<typeof useColors>;

/**
 * These field components live OUTSIDE the screen component on purpose.
 * When they were defined inside RegisterScreen, every keystroke triggered a
 * re-render that recreated them as brand-new component types, so React
 * unmounted and remounted the underlying TextInput on every character —
 * dropping keyboard focus after each letter/word. Hoisting them keeps their
 * identity stable across renders so focus is preserved while typing.
 */
function SelectField({
  colors, label, value, placeholder, onPress, icon,
}: { colors: Colors; label: string; value: string; placeholder: string; onPress: () => void; icon: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TouchableOpacity style={[styles.selectBtn, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={onPress} activeOpacity={0.8}>
        <MaterialCommunityIcons name={icon as any} size={18} color={value ? colors.primary : colors.mutedForeground} />
        <Text style={[styles.selectText, !value && { color: colors.mutedForeground }, !!value && { color: colors.foreground }]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
}

function InputField({
  colors, label, value, onChange, placeholder, keyboardType, secure, showToggle, icon, multiline, showPassword, onToggleShowPassword,
}: {
  colors: Colors; label: string; value: string; onChange: (v: string) => void; placeholder: string;
  keyboardType?: any; secure?: boolean; showToggle?: boolean; icon: string; multiline?: boolean;
  showPassword?: boolean; onToggleShowPassword?: () => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.textInput, { color: colors.foreground, flex: 1 }]}
          value={value} onChangeText={onChange} placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType ?? 'default'}
          secureTextEntry={secure && !showPassword}
          multiline={multiline}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggleShowPassword}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function SimpleModal({
  colors, insetsBottom, visible, title, options, onSelect, onClose,
}: { colors: Colors; insetsBottom: number; visible: boolean; title: string; options: string[]; onSelect: (v: string) => void; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insetsBottom + 16 }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
          {options.map(opt => (
            <TouchableOpacity key={opt} style={[styles.optionRow, { borderBottomColor: colors.border }]}
              onPress={() => { onSelect(opt); onClose(); Haptics.selectionAsync(); }}>
              <Text style={[styles.optionText, { color: colors.foreground }]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const [name, setName] = useState('');
  const [rank, setRank] = useState<SoldierRank | ''>('');
  const [company, setCompany] = useState<Company | ''>('');
  const [serviceNumber, setServiceNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | ''>('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [dob, setDob] = useState('');
  const [medCat, setMedCat] = useState('Category A');
  const [previousResult, setPreviousResult] = useState(PREVIOUS_RESULT_OPTIONS[0]);
  const [biannual, setBiannual] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Picker states
  const [rankModal, setRankModal] = useState(false);
  const [companyModal, setCompanyModal] = useState(false);
  const [bloodModal, setBloodModal] = useState(false);
  const [medModal, setMedModal] = useState(false);
  const [previousResultModal, setPreviousResultModal] = useState(false);
  const [biannualModal, setBiannualModal] = useState(false);

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!name.trim()) errs.push('Full name is required.');
    if (!rank) errs.push('Rank is required.');
    if (!company) errs.push('Company is required.');
    if (!serviceNumber.trim()) errs.push('Service number is required.');
    if (!email.trim() || !email.includes('@')) errs.push('Valid email is required.');
    if (!password || password.length < 6) errs.push('Password must be at least 6 characters.');
    if (password !== confirmPassword) errs.push('Passwords do not match.');
    if (!bloodGroup) errs.push('Blood group is required.');
    if (!height || isNaN(Number(height))) errs.push('Valid height (cm) is required.');
    if (!weight || isNaN(Number(weight))) errs.push('Valid weight (kg) is required.');
    if (!address.trim()) errs.push('Address is required.');
    if (!dob.trim()) {
      errs.push('Date of birth is required.');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dob.trim()) || isNaN(new Date(dob.trim()).getTime())) {
      errs.push('Enter a valid date of birth (YYYY-MM-DD).');
    } else {
      const computedAge = calcAge(dob.trim());
      if (computedAge < 16 || computedAge > 60) errs.push('Date of birth gives an unlikely age — please check it.');
    }
    if (previousResult !== PREVIOUS_RESULT_OPTIONS[0] && !biannual) {
      errs.push('Select which biannual period the previous IPFT result is from.');
    }
    return errs;
  };

  const handleRegister = async () => {
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const existingUsers = await getUsers();
      const emailTaken = existingUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (emailTaken) {
        setErrors(['This email is already registered.']);
        setIsSaving(false);
        return;
      }
      const svcTaken = existingUsers.find(u => u.ba === serviceNumber.trim().toUpperCase());
      if (svcTaken) {
        setErrors(['This service number is already registered.']);
        setIsSaving(false);
        return;
      }

      const userId = genId();
      const soldierId = genId();
      const svcNum = serviceNumber.trim().toUpperCase();
      const age = calcAge(dob.trim());

      await addUser({
        id: userId,
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role: 'soldier' as UserRole,
        name: name.trim(),
        rank: rank,
        ba: svcNum,
        company: company as Company,
        phone: phone.trim() || undefined,
        address: address.trim(),
        bloodGroup: bloodGroup as BloodGroup,
        height: Number(height),
        weight: Number(weight),
        age: Number(age),
        medicalCategory: medCat,
        serviceNumber: svcNum,
        isApproved: false,
      });

      await addSoldier({
        id: soldierId,
        userId,
        serviceNumber: svcNum,
        name: name.trim(),
        rank: rank as SoldierRank,
        company: company as Company,
        email: email.trim().toLowerCase(),
        bloodGroup: bloodGroup as BloodGroup,
        height: Number(height),
        weight: Number(weight),
        age: Number(age),
        medicalCategory: medCat,
        phone: phone.trim() || '',
        address: address.trim(),
        isApproved: false,
        isOverweight: false,
        ptStatus: 'pending',
      });

      // Keep any previous unit's IPFT result on record, so it shows in this
      // soldier's history — it does not affect their pending status here,
      // since the new unit still needs to test them itself.
      if (previousResult !== PREVIOUS_RESULT_OPTIONS[0]) {
        const status = previousResult.toLowerCase() as 'pass' | 'fail';
        await addIPFTResult({
          id: genId(), soldierId, soldierName: name.trim(), soldierRank: rank as SoldierRank,
          serviceNumber: svcNum, company: company as Company,
          date: new Date().toISOString().slice(0, 10),
          items: [{ name: 'Previous Unit IPFT (Self-Reported)', target: 'N/A', achieved: previousResult, status }],
          overallStatus: status,
          recordedBy: userId, recordedByName: `${name.trim()} (self-reported at registration)`,
          biannual: biannual.startsWith('1st') ? '1st' : '2nd',
          selfReported: true,
        });
      }

      // Send approval notification to Adjutant
      await addNotification({
        id: genId(),
        targetRole: 'adjutant',
        title: 'New Soldier Registration',
        body: `${rank} ${name.trim()} (${svcNum}) from ${company} Company has registered and requires approval.`,
        type: 'general',
        read: false,
        createdAt: new Date().toISOString(),
      });

      setIsSaving(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert(
        'Registration Submitted',
        'Your registration has been submitted. Please wait for Adjutant approval before signing in.',
        [{ text: 'Go to Sign In', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (e) {
      setIsSaving(false);
      setErrors(['Registration failed. Please try again.']);
    }
  };

  const paddingTop = isWeb ? (67 + insets.top) : insets.top + 16;

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop, paddingBottom: isWeb ? 34 : insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled">

      {/* Logo header */}
      <View style={styles.logoRow}>
        <View style={[styles.logoCircle, { borderColor: colors.accent }]}>
          <Image source={require('@/assets/images/fitforce-logo.jpg')} style={styles.logoImg} resizeMode="cover" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appName, { color: colors.foreground }]}>Fit Force</Text>
          <Text style={[styles.appSub, { color: colors.mutedForeground }]}>Soldier Fitness Assessment System</Text>
        </View>
      </View>

      <Text style={[styles.screenTitle, { color: colors.foreground }]}>Soldier Registration</Text>
      <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>Your account will be activated after Adjutant approval.</Text>

      {errors.length > 0 && (
        <View style={[styles.errorBox, { backgroundColor: colors.destructive + '12', borderColor: colors.destructive }]}>
          {errors.map((e, i) => <Text key={i} style={[styles.errorText, { color: colors.destructive }]}>• {e}</Text>)}
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Personal Information</Text>

        <InputField colors={colors} label="Full Name *" value={name} onChange={setName} placeholder="e.g. Kamal Hossain" icon="account-outline" />
        <SelectField colors={colors} label="Rank *" value={rank} placeholder="Select rank" onPress={() => setRankModal(true)} icon="chevron-down-circle-outline" />
        <SelectField colors={colors} label="Company *" value={company ? `${company} Company` : ''} placeholder="Select company" onPress={() => setCompanyModal(true)} icon="flag-outline" />
        <InputField colors={colors} label="Service Number *" value={serviceNumber} onChange={setServiceNumber}
          placeholder="e.g. BD-11010" icon="identifier" keyboardType="default" />
        <InputField colors={colors} label="Date of Birth *" value={dob} onChange={setDob} placeholder="e.g. 2001-05-14 (YYYY-MM-DD)" icon="cake-variant-outline" />
        <SelectField colors={colors} label="Blood Group *" value={bloodGroup} placeholder="Select blood group" onPress={() => setBloodModal(true)} icon="water-outline" />
        <SelectField colors={colors} label="Medical Category *" value={medCat} placeholder="Select category" onPress={() => setMedModal(true)} icon="medical-bag" />
        <InputField colors={colors} label="Phone" value={phone} onChange={setPhone} placeholder="e.g. 01711-123456" icon="phone-outline" keyboardType="phone-pad" />
        <InputField colors={colors} label="Address *" value={address} onChange={setAddress} placeholder="e.g. House 12, Road 5, Dhaka" icon="map-marker-outline" multiline />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Previous IPFT Record</Text>
        <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>If you have a result from a previous unit, add it here — it will show on your profile history. Otherwise leave as "Not Applicable".</Text>
        <SelectField colors={colors} label="Previous IPFT Result" value={previousResult} placeholder="Select result" onPress={() => setPreviousResultModal(true)} icon="clipboard-text-outline" />
        {previousResult !== PREVIOUS_RESULT_OPTIONS[0] && (
          <SelectField colors={colors} label="Biannual Period *" value={biannual} placeholder="Select biannual period" onPress={() => setBiannualModal(true)} icon="calendar-range" />
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Physical Metrics</Text>
        <InputField colors={colors} label="Height (cm) *" value={height} onChange={setHeight} placeholder="e.g. 170" icon="human-male-height" keyboardType="numeric" />
        <InputField colors={colors} label="Weight (kg) *" value={weight} onChange={setWeight} placeholder="e.g. 68" icon="weight-kilogram" keyboardType="numeric" />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Account Credentials</Text>
        <InputField colors={colors} label="Email *" value={email} onChange={setEmail} placeholder="e.g. kamal@gmail.com" icon="email-outline" keyboardType="email-address" />
        <InputField colors={colors} label="Password *" value={password} onChange={setPassword} placeholder="Min. 6 characters" icon="lock-outline" secure showToggle showPassword={showPassword} onToggleShowPassword={() => setShowPassword(v => !v)} />
        <InputField colors={colors} label="Confirm Password *" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter password" icon="lock-check-outline" secure showToggle showPassword={showPassword} onToggleShowPassword={() => setShowPassword(v => !v)} />
      </View>

      <TouchableOpacity
        style={[styles.registerBtn, { backgroundColor: colors.primary }, isSaving && { opacity: 0.7 }]}
        onPress={handleRegister} disabled={isSaving} activeOpacity={0.85}>
        {isSaving ? <ActivityIndicator color="#FFF" /> : (
          <>
            <MaterialCommunityIcons name="account-plus" size={20} color="#FFF" />
            <Text style={styles.registerBtnText}>SUBMIT REGISTRATION</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
        <Text style={[styles.loginLinkText, { color: colors.mutedForeground }]}>
          Already have an account? <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Sign In</Text>
        </Text>
      </TouchableOpacity>

      <SimpleModal colors={colors} insetsBottom={insets.bottom} visible={rankModal} title="Select Rank" options={RANKS} onSelect={v => setRank(v as SoldierRank)} onClose={() => setRankModal(false)} />
      <SimpleModal colors={colors} insetsBottom={insets.bottom} visible={companyModal} title="Select Company" options={COMPANIES.map(c => `${c} Company`)} onSelect={v => setCompany(v[0] as Company)} onClose={() => setCompanyModal(false)} />
      <SimpleModal colors={colors} insetsBottom={insets.bottom} visible={bloodModal} title="Select Blood Group" options={BLOOD_GROUPS} onSelect={v => setBloodGroup(v as BloodGroup)} onClose={() => setBloodModal(false)} />
      <SimpleModal colors={colors} insetsBottom={insets.bottom} visible={medModal} title="Medical Category" options={MED_CATS} onSelect={v => setMedCat(v)} onClose={() => setMedModal(false)} />
      <SimpleModal colors={colors} insetsBottom={insets.bottom} visible={previousResultModal} title="Previous IPFT Result" options={PREVIOUS_RESULT_OPTIONS}
        onSelect={v => { setPreviousResult(v); if (v === PREVIOUS_RESULT_OPTIONS[0]) setBiannual(''); }} onClose={() => setPreviousResultModal(false)} />
      <SimpleModal colors={colors} insetsBottom={insets.bottom} visible={biannualModal} title="Biannual Period" options={BIANNUAL_OPTIONS} onSelect={v => setBiannual(v)} onClose={() => setBiannualModal(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, overflow: 'hidden' },
  logoImg: { width: '100%', height: '100%' },
  appName: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  appSub: { fontSize: 12, fontFamily: 'Inter_400Regular', letterSpacing: 0.3, marginTop: 2 },
  screenTitle: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  screenSubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginTop: -6 },
  errorBox: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 4 },
  errorText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  cardTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  cardHint: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16, marginTop: -6 },
  fieldWrap: { gap: 5 },
  fieldLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  textInput: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  selectBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  selectText: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  registerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 12, paddingVertical: 16, marginTop: 4 },
  registerBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFF', letterSpacing: 1.5 },
  loginLink: { alignItems: 'center', paddingVertical: 8 },
  loginLinkText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 10, textAlign: 'center' },
  optionRow: { paddingVertical: 14, borderBottomWidth: 1 },
  optionText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
