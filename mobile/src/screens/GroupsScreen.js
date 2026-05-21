import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, TextInput,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { groupsAPI } from '../api/index';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const LEVEL_LABELS = { strict: 'Cœliaque', sensitive: 'Sensible', avoiding: 'Évitement' };
const LEVEL_COLORS = { strict: '#C62828', sensitive: '#D4631A', avoiding: '#4A7C59' };

export default function GroupsScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(user?.active_group_id || null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [groupsRes, invRes] = await Promise.all([
        groupsAPI.getGroups(),
        groupsAPI.getPendingInvitations(),
      ]);
      setGroups(groupsRes.data.groups || []);
      setActiveGroupId(groupsRes.data.active_group_id);
      setPendingCount(invRes.data.invitations?.length || 0);
    } catch {
      Alert.alert(t.common.error, 'Impossible de charger les groupes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  const handleCreate = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      const { data } = await groupsAPI.createGroup(newGroupName.trim());
      setGroups((prev) => [data.group, ...prev]);
      setActiveGroupId(data.group.id);
      await updateUser({ active_group_id: data.group.id });
      setNewGroupName('');
      setShowCreate(false);
    } catch (err) {
      Alert.alert(t.common.error, err?.response?.data?.error || 'Impossible de créer le groupe');
    } finally {
      setCreating(false);
    }
  };

  const handleSetActive = async (groupId) => {
    if (groupId === activeGroupId) return;
    try {
      await groupsAPI.setActive(groupId);
      setActiveGroupId(groupId);
      await updateUser({ active_group_id: groupId });
    } catch {
      Alert.alert(t.common.error, 'Impossible de changer le groupe actif');
    }
  };

  const renderGroup = ({ item }) => {
    const isActive = item.id === activeGroupId;
    const isOwner = item.owner_id === user?.id;
    return (
      <TouchableOpacity
        style={[styles.card, isActive && styles.cardActive]}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id, groupName: item.name })}
        activeOpacity={0.85}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.groupIcon, isActive && styles.groupIconActive]}>
            <Text style={styles.groupIconText}>{item.name[0]?.toUpperCase()}</Text>
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardName, isActive && styles.cardNameActive]}>{item.name}</Text>
              {isOwner && <Text style={styles.ownerBadge}>{t.groups.creatorBadge}</Text>}
            </View>
            <Text style={styles.cardSub}>
              {item.member_count} membre{item.member_count > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          {isActive ? (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{t.groups.activeBadge}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.setActiveBtn}
              onPress={() => handleSetActive(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.setActiveBtnText}>{t.groups.activate}</Text>
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brand}>GLUGLU</Text>
      </View>
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>{t.groups.title}</Text>
        {pendingCount > 0 && (
          <TouchableOpacity
            style={styles.inviteBadge}
            onPress={() => navigation.navigate('GroupInvitations')}
            activeOpacity={0.8}
          >
            <Ionicons name="mail" size={12} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.inviteBadgeText}>{pendingCount} invitation{pendingCount > 1 ? 's' : ''}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.pageSub}>{t.groups.subtitle}</Text>

      {loading ? (
        <ActivityIndicator color="#1C2B1D" style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderGroup}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={52} color="#BDBDBD" />
              <Text style={styles.emptyTitle}>{t.groups.emptyTitle}</Text>
              <Text style={styles.emptySub}>{t.groups.emptyMsg}</Text>
            </View>
          }
        />
      )}

      {/* Bouton créer */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={20} color="#FAFAF8" style={{ marginRight: 8 }} />
        <Text style={styles.fabText}>{t.groups.create}</Text>
      </TouchableOpacity>

      {/* Modal création */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t.groups.newGroup}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t.groups.groupNamePlaceholder}
              placeholderTextColor="#BDBDBD"
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowCreate(false); setNewGroupName(''); }}
              >
                <Text style={styles.modalCancelText}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateBtn, creating && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalCreateText}>{t.common.add}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  header: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 4 },
  brand: { fontSize: 14, fontWeight: '700', letterSpacing: 4, color: '#1C1C1E' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.5 },
  pageSub: { fontSize: 13, color: '#8E8E93', paddingHorizontal: 24, marginBottom: 20, lineHeight: 18 },

  inviteBadge: {
    backgroundColor: '#C62828', borderRadius: 12,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  inviteBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 2, borderColor: 'transparent',
  },
  cardActive: { borderColor: '#4A7C59', backgroundColor: '#F0F8F2' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  groupIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  groupIconActive: { backgroundColor: '#4A7C59' },
  groupIconText: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  cardNameActive: { color: '#1C2B1D' },
  ownerBadge: { fontSize: 10, fontWeight: '700', color: '#4A7C59', backgroundColor: '#EEF4EE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cardSub: { fontSize: 13, color: '#8E8E93', marginTop: 3 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeBadge: { backgroundColor: '#4A7C59', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  setActiveBtn: { borderWidth: 1, borderColor: '#4A7C59', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  setActiveBtnText: { color: '#4A7C59', fontSize: 11, fontWeight: '600' },
  chevron: { fontSize: 20, color: '#BDBDBD' },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1C1C1E' },
  emptySub: { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 20 },

  fab: {
    position: 'absolute', bottom: 24, left: 24, right: 24,
    backgroundColor: '#1C2B1D', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
    shadowColor: '#1C2B1D', shadowOpacity: 0.3,
    shadowRadius: 12, elevation: 6,
  },
  fabText: { color: '#FAFAF8', fontSize: 15, fontWeight: '600' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalBox: {
    backgroundColor: '#FAFAF8', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', marginBottom: 20 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#E5E5EA', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#1C1C1E', backgroundColor: '#fff', marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 12 },
  modalCancelText: { fontSize: 15, fontWeight: '500', color: '#3A3A3C' },
  modalCreateBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#1C2B1D', borderRadius: 12 },
  modalCreateText: { fontSize: 15, fontWeight: '600', color: '#FAFAF8' },
});
