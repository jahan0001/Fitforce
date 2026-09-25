import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, RefreshControl, TextInput, Modal, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { showAlert } from '@/lib/alert';
import { getReports, addReport, markReportRead, getUsers, genId } from '@/lib/storage';
import { uploadDocument, fileDownloadUrl } from '@/lib/upload';
import type { Report, User } from '@/lib/types';

const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ROLE_LABELS: Record<string, string> = {
  co: 'CO', '2ic': '2IC', coy_comd: 'Coy Comd', adjutant: 'Adjutant', clerk: 'Clerk', soldier: 'Soldier',
};
const REPORT_RECIPIENT_ROLES = ['co', '2ic', 'coy_comd', 'adjutant'];

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [reports, setReports] = useState<Report[]>([]);
  const [recipients, setRecipients] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [recipientPicker, setRecipientPicker] = useState(false);
  const [recipient, setRecipient] = useState<User | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; url: string; mimeType: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [all, users] = await Promise.all([getReports(), getUsers()]);
    const mine = all.filter(r => r.fromId === user.id || r.toId === user.id || r.toRole === user.role || r.fromRole === user.role);
    setReports(mine);
    setRecipients(users.filter(u => REPORT_RECIPIENT_ROLES.includes(u.role) && u.id !== user.id));
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [...DOCUMENT_MIME_TYPES, 'application/octet-stream'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setIsUploading(true);
    try {
      const uploaded = await uploadDocument({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, file: (asset as any).file });
      setAttachment(uploaded);
    } catch (e) {
      showAlert('Error', 'Could not upload the file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if (!recipient) { showAlert('Error', 'Please select a recipient.'); return; }
    if (!title.trim() || !content.trim()) { showAlert('Error', 'Please fill in title and content.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addReport({
      id: genId(), fromId: user!.id, fromName: user!.name, fromRole: user!.role,
      toId: recipient.id, toRole: recipient.role,
      title: title.trim(), content: content.trim(),
      attachmentLabel: attachment?.name,
      attachmentUrl: attachment?.url,
      attachmentMimeType: attachment?.mimeType,
      read: false, createdAt: new Date().toISOString(),
    });
    setComposeVisible(false);
    setRecipient(null);
    setTitle('');
    setContent('');
    setAttachment(null);
    await load();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert('Sent', 'Report has been sent.');
  };

  const openAttachment = (report: Report) => {
    if (!report.attachmentUrl) return;
    Linking.openURL(fileDownloadUrl(report.attachmentUrl));
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' });

  const renderItem = ({ item }: { item: Report }) => {
    const isOwn = item.fromId === user?.id;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: item.read || isOwn ? colors.border : colors.accent }]}
        onPress={async () => { await markReportRead(item.id); setSelectedReport(item); await load(); }}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
          {!item.read && !isOwn && <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />}
        </View>
        <Text style={[styles.cardFrom, { color: colors.mutedForeground }]}>
          {isOwn ? `To: ${ROLE_LABELS[item.toRole] ?? item.toRole}` : `From: ${item.fromName} · ${ROLE_LABELS[item.fromRole] ?? item.fromRole}`} · {formatDate(item.createdAt)}
        </Text>
        <Text style={[styles.cardPreview, { color: colors.mutedForeground }]} numberOfLines={2}>{item.content}</Text>
        {item.attachmentLabel && (
          <TouchableOpacity
            style={[styles.attachRow, { backgroundColor: colors.muted }]}
            onPress={item.attachmentUrl ? () => openAttachment(item) : undefined}
            disabled={!item.attachmentUrl}
          >
            <Feather name={item.attachmentUrl ? 'download' : 'paperclip'} size={12} color={colors.mutedForeground} />
            <Text style={[styles.attachText, { color: colors.mutedForeground }]}>{item.attachmentLabel}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const paddingTop = 16;
  const paddingBottom = isWeb ? 34 : insets.bottom + 90;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Reports</Text>
        {user?.role === 'clerk' && (
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={() => setComposeVisible(true)}>
            <Feather name="plus" size={16} color="#FFF" />
            <Text style={styles.sendBtnText}>New Report</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={reports}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="file-text" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No reports yet</Text>
          </View>
        }
      />

      <Modal visible={composeVisible} transparent animationType="slide" onRequestClose={() => setComposeVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20, maxHeight: '88%' }]}>
            <View style={styles.modalHandle} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Report</Text>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Send To</Text>
              <TouchableOpacity style={[styles.recipientBtn, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setRecipientPicker(true)}>
                <Text style={[styles.recipientText, recipient ? { color: colors.foreground } : { color: colors.mutedForeground }]}>
                  {recipient ? `${recipient.name} · ${ROLE_LABELS[recipient.role] ?? recipient.role}` : 'Select recipient...'}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Title</Text>
              <TextInput style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]} value={title} onChangeText={setTitle} placeholder="Report title..." placeholderTextColor={colors.mutedForeground} />
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Content</Text>
              <TextInput style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, height: 120, textAlignVertical: 'top' }]} value={content} onChangeText={setContent} placeholder="Report content..." placeholderTextColor={colors.mutedForeground} multiline />
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Attach a PDF or Word document (optional)</Text>
              <TouchableOpacity
                style={[styles.attachPickBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={handlePickFile}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.attachPickText, { color: colors.mutedForeground }]}>Uploading...</Text>
                  </>
                ) : attachment ? (
                  <>
                    <Feather name="file-text" size={16} color={colors.primary} />
                    <Text style={[styles.attachPickText, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>{attachment.name}</Text>
                    <TouchableOpacity onPress={() => setAttachment(null)} hitSlop={8}>
                      <Feather name="x" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Feather name="paperclip" size={16} color={colors.mutedForeground} />
                    <Text style={[styles.attachPickText, { color: colors.mutedForeground }]}>Tap to choose a file</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSend}>
                <Feather name="send" size={18} color="#FFF" />
                <Text style={styles.submitBtnText}>Send Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setComposeVisible(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Recipient picker */}
      <Modal visible={recipientPicker} transparent animationType="slide" onRequestClose={() => setRecipientPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setRecipientPicker(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16, maxHeight: '75%' }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Recipient</Text>
            <FlatList
              data={recipients}
              keyExtractor={i => i.id}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.contactRow, { borderBottomColor: colors.border }]}
                  onPress={() => { setRecipient(item); setRecipientPicker(false); Haptics.selectionAsync(); }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contactName, { color: colors.foreground }]}>{item.name}</Text>
                    <Text style={[styles.contactRole, { color: colors.mutedForeground }]}>
                      {ROLE_LABELS[item.role] ?? item.role}{item.company ? ` · ${item.company} Coy` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ color: colors.mutedForeground, textAlign: 'center', paddingVertical: 20 }}>No recipients available</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!selectedReport} transparent animationType="slide" onRequestClose={() => setSelectedReport(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20, maxHeight: '85%' }]}>
            <View style={styles.modalHandle} />
            <ScrollView>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{selectedReport?.title}</Text>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>From: {selectedReport?.fromName} · {formatDate(selectedReport?.createdAt ?? '')}</Text>
              <Text style={[styles.reportBody, { color: colors.foreground }]}>{selectedReport?.content}</Text>
              {selectedReport?.attachmentLabel && (
                <TouchableOpacity
                  style={[styles.attachRow, { backgroundColor: colors.muted, marginTop: 12 }]}
                  onPress={selectedReport.attachmentUrl ? () => openAttachment(selectedReport) : undefined}
                  disabled={!selectedReport.attachmentUrl}
                >
                  <Feather name={selectedReport.attachmentUrl ? 'download' : 'paperclip'} size={14} color={colors.mutedForeground} />
                  <Text style={[styles.attachText, { color: colors.mutedForeground }]}>{selectedReport.attachmentLabel}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border, marginTop: 12 }]} onPress={() => setSelectedReport(null)}>
              <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  sendBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  card: { borderRadius: 12, borderWidth: 1.5, padding: 14, gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  cardFrom: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  cardPreview: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, alignSelf: 'flex-start' },
  attachText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  modalLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  reportBody: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22, marginBottom: 8, marginTop: 8 },
  attachPickBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  attachPickText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  recipientBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  recipientText: { fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  contactName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  contactRole: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 13, marginBottom: 8 },
  submitBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  cancelBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
