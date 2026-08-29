import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, RefreshControl, TextInput, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { showAlert } from '@/lib/alert';
import { getMessages, addMessage, markMessageRead, getUsers, genId } from '@/lib/storage';
import type { Message, User } from '@/lib/types';

const ROLE_LABELS: Record<string, string> = {
  co: 'CO', '2ic': '2IC', coy_comd: 'Coy Comd', adjutant: 'Adjutant', clerk: 'Clerk', soldier: 'Soldier',
};

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [recipientPicker, setRecipientPicker] = useState(false);
  const [recipient, setRecipient] = useState<User | null>(null);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    const [all, users] = await Promise.all([getMessages(), getUsers()]);
    const mine = all.filter(m => m.fromId === user.id || m.toId === user.id);
    setMessages(mine);
    setContacts(users.filter(u => u.role !== 'soldier' && u.id !== user.id));
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const resetCompose = () => {
    setRecipient(null);
    setSubject('');
    setContent('');
  };

  const handleSend = async () => {
    if (!recipient) { showAlert('Error', 'Please select a recipient.'); return; }
    if (!subject.trim() || !content.trim()) { showAlert('Error', 'Please fill in subject and message.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addMessage({
      id: genId(), fromId: user!.id, fromName: user!.name, fromRole: user!.role,
      toId: recipient.id, toRole: recipient.role,
      subject: subject.trim(), content: content.trim(),
      read: false, createdAt: new Date().toISOString(),
    });
    setComposeVisible(false);
    resetCompose();
    await load();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const renderItem = ({ item }: { item: Message }) => {
    const isFrom = item.fromId === user?.id;
    return (
      <TouchableOpacity
        style={[styles.msgCard, { backgroundColor: colors.card, borderColor: item.read || isFrom ? colors.border : colors.primary }]}
        onPress={async () => { if (!isFrom) await markMessageRead(item.id); setSelectedMsg(item); await load(); }}
        activeOpacity={0.75}
      >
        <View style={styles.msgHeader}>
          <View style={styles.msgMeta}>
            {!item.read && !isFrom && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            <Text style={[styles.msgSubject, { color: colors.foreground }]} numberOfLines={1}>{item.subject}</Text>
          </View>
          <Text style={[styles.msgDate, { color: colors.mutedForeground }]}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={[styles.msgFrom, { color: colors.mutedForeground }]}>
          {isFrom ? `To: ${item.fromName === item.toId ? '' : ''}${ROLE_LABELS[item.toRole] ?? item.toRole}` : `From: ${item.fromName} · ${ROLE_LABELS[item.fromRole] ?? item.fromRole}`}
        </Text>
        <Text style={[styles.msgPreview, { color: colors.mutedForeground }]} numberOfLines={2}>{item.content}</Text>
      </TouchableOpacity>
    );
  };

  const paddingTop = 16;
  const paddingBottom = isWeb ? 34 : insets.bottom + 90;

  if (user?.role === 'soldier') return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
        <TouchableOpacity style={[styles.composeBtn, { backgroundColor: colors.primary }]} onPress={() => { resetCompose(); setComposeVisible(true); }}>
          <Feather name="edit-3" size={16} color="#FFF" />
          <Text style={styles.composeBtnText}>New Message</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-square" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No messages yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>Start a conversation with anyone on staff.</Text>
          </View>
        }
      />

      {/* Compose modal */}
      <Modal visible={composeVisible} transparent animationType="slide" onRequestClose={() => setComposeVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20, maxHeight: '88%' }]}>
            <View style={styles.modalHandle} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Message</Text>

              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>To</Text>
              <TouchableOpacity style={[styles.recipientBtn, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setRecipientPicker(true)}>
                <Text style={[styles.recipientText, recipient ? { color: colors.foreground } : { color: colors.mutedForeground }]}>
                  {recipient ? `${recipient.name} · ${ROLE_LABELS[recipient.role] ?? recipient.role}` : 'Select recipient...'}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>

              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Subject</Text>
              <TextInput style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                value={subject} onChangeText={setSubject} placeholder="Subject..." placeholderTextColor={colors.mutedForeground} />

              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Message</Text>
              <TextInput style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, height: 110, textAlignVertical: 'top' }]}
                value={content} onChangeText={setContent} placeholder="Write your message..." placeholderTextColor={colors.mutedForeground} multiline />

              <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={handleSend}>
                <Feather name="send" size={18} color="#FFF" />
                <Text style={styles.sendBtnText}>Send</Text>
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
              data={contacts}
              keyExtractor={i => i.id}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.contactRow, { borderBottomColor: colors.border }]}
                  onPress={() => { setRecipient(item); setRecipientPicker(false); Haptics.selectionAsync(); }}>
                  <View style={[styles.contactAvatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.contactAvatarText, { color: colors.primary }]}>{item.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contactName, { color: colors.foreground }]}>{item.name}</Text>
                    <Text style={[styles.contactRole, { color: colors.mutedForeground }]}>
                      {ROLE_LABELS[item.role] ?? item.role}{item.company ? ` · ${item.company} Coy` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ color: colors.mutedForeground, textAlign: 'center', paddingVertical: 20 }}>No contacts available</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Message detail modal */}
      <Modal visible={!!selectedMsg} transparent animationType="slide" onRequestClose={() => setSelectedMsg(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20, maxHeight: '80%' }]}>
            <View style={styles.modalHandle} />
            <ScrollView>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{selectedMsg?.subject}</Text>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>From: {selectedMsg?.fromName} · {formatDate(selectedMsg?.createdAt ?? '')}</Text>
              <Text style={[styles.modalBody, { color: colors.foreground }]}>{selectedMsg?.content}</Text>
            </ScrollView>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border, marginTop: 12 }]} onPress={() => setSelectedMsg(null)}>
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
  composeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  composeBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  msgCard: { borderRadius: 12, borderWidth: 1.5, padding: 14, gap: 4 },
  msgHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  msgSubject: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  msgDate: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  msgFrom: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  msgPreview: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  emptySubtext: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 16 },
  modalLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  modalBody: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22, marginBottom: 16 },
  recipientBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  recipientText: { fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  contactAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  contactAvatarText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  contactName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  contactRole: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 13, marginBottom: 8, marginTop: 4 },
  sendBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  cancelBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
