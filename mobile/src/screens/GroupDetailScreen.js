import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { groupsAPI, authAPI } from '../api/index';
import { useAuth } from '../context/AuthContext';

const LEVEL_LABELS = { strict: 'Cœliaque strict', sensitive: 'Sensible', avoiding: 'Évitement' };
const LEVEL_COLORS = { strict: '#C62828', sensitive: '#D4631A', avoiding: '#4A7C59' };

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { user, updateUser } = useAuth();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await groupsAPI.getGroup(groupId);
      setGroup(data.group);
      setMembers(data.members);
      navigation.setOptions({ title: data.group.name });
    } catch {
      Alert.alert('Erreur', 'Impossible de charger le groupe');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, []);

  const handleUsernameChange = (text) => {
    setInviteUsername(text);
    setSuggestions([]);
    clearTimeout(searchTimeout.current);
    if (text.trim().length < 2) {
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const { data } = await authAPI.searchUsers(text.trim());
        const memberIds = members.map((m) => m.id);
        setSuggestions((data.users || []).filter((u) => !memberIds.includes(u.id)));
      } catch (err) {
        console.log('Search error:', err?.response?.data || err?.message);
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelectSuggestion = (u) => {
    setInviteUsername(u.username || u.name);
    setSuggestions([]);
  };

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    setInviting(true);
    try {
      const { data } = await groupsAPI.invite(groupId, inviteUsername.trim());
      Alert.alert('Invitation envoyée', data.message);
      setInviteUsername('');
      setSuggestions([]);
      setShowInvite(false);
      load();
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || 'Impossible d\'envoyer l\'invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = (memberId, memberName) => {
    const isMe = memberId === user?.id;
    Alert.alert(
      isMe ? 'Quitter le groupe ?' : `Retirer ${memberName} ?`,
      isMe ? 'Vous perdrez accès à ce groupe.' : 'Cette personne sera retirée du groupe.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: isMe ? 'Quitter' : 'Retirer', style: 'destructive',
          onPress: async () => {
            try {
              await groupsAPI.removeMember(groupId, memberId);
              if (isMe) {
                if (user?.active_group_id === groupId) {
                  await updateUser({ active_group_id: null });
                }
                navigation.goBack();
              } else {
                setMembers((prev) => prev.filter((m) => m.id !== memberId));
              }
            } catch (err) {
              Alert.alert('Erreur', err?.response?.data?.error || 'Impossible de retirer ce membre');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert('Supprimer le groupe ?', 'Tous les membres seront retirés. Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await groupsAPI.deleteGroup(groupId);
            if (user?.active_group_id === groupId) {
              await updateUser({ active_group_id: null });
            }
            navigation.goBack();
          } catch {
            Alert.alert('Erreur', 'Impossible de supprimer le groupe');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4A7C59" size="large" />
      </View>
    );
  }

  const isOwner = group?.owner_id === user?.id;
  const accepted = members.filter((m) => m.status === 'accepted');
  const pending = members.filter((m) => m.status === 'pending');

  const renderMember = ({ item }) => {
    const isMe = item.id === user?.id;
    const canRemove = isOwner || isMe;
    return (
      <View style={[styles.memberRow, item.status === 'pending' && styles.memberRowPending]}>
        <View style={[styles.avatar, { backgroundColor: LEVEL_COLORS[item.intolerance_level] + '22' }]}>
          <Text style={[styles.avatarText, { color: LEVEL_COLORS[item.intolerance_level] }]}>
            {item.name[0]?.toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{item.name}</Text>
            {item.username && <Text style={styles.memberUsername}>@{item.username}</Text>}
            {isMe && <Text style={styles.meBadge}>Moi</Text>}
          </View>
          <Text style={[styles.memberLevel, { color: LEVEL_COLORS[item.intolerance_level] }]}>
            {LEVEL_LABELS[item.intolerance_level]}
          </Text>
          {item.status === 'pending' && <Text style={styles.pendingLabel}>En attente d'acceptation</Text>}
        </View>
        {canRemove && !isMe ? (
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => handleRemoveMember(item.id, item.name)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={14} color="#C62828" />
          </TouchableOpacity>
        ) : isMe && !isOwner ? (
          <TouchableOpacity style={styles.leaveBtn} onPress={() => handleRemoveMember(item.id, item.name)}>
            <Text style={styles.leaveBtnText}>Quitter</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={[...accepted, ...pending]}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{accepted.length}</Text>
                <Text style={styles.statLabel}>membres</Text>
              </View>
              {pending.length > 0 && (
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: '#D4631A' }]}>{pending.length}</Text>
                  <Text style={styles.statLabel}>en attente</Text>
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>Membres</Text>
          </View>
        }
        renderItem={renderMember}
        ListFooterComponent={
          <View>
            {/* Inviter */}
            <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowInvite(true)} activeOpacity={0.85}>
              <Ionicons name="person-add-outline" size={18} color="#4A7C59" style={{ marginRight: 8 }} />
              <Text style={styles.inviteBtnText}>Inviter par pseudo</Text>
            </TouchableOpacity>

            {/* Supprimer groupe (owner) */}
            {isOwner && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteGroup} activeOpacity={0.7}>
                <Text style={styles.deleteBtnText}>Supprimer le groupe</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Modal invitation */}
      <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => { setShowInvite(false); setSuggestions([]); }}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Inviter un membre</Text>
            <Text style={styles.modalSub}>Tapez le pseudo de l'utilisateur GluGlu à inviter.</Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="at" size={18} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                style={styles.modalInput}
                placeholder="pseudo_utilisateur"
                placeholderTextColor="#BDBDBD"
                value={inviteUsername}
                onChangeText={handleUsernameChange}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searching && <ActivityIndicator size="small" color="#8E8E93" style={{ marginRight: 10 }} />}
            </View>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {suggestions.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.suggestionRow}
                    onPress={() => handleSelectSuggestion(u)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.suggAvatar, { backgroundColor: LEVEL_COLORS[u.intolerance_level] + '22' }]}>
                      <Text style={[styles.suggAvatarText, { color: LEVEL_COLORS[u.intolerance_level] }]}>
                        {u.name[0]?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggName}>{u.name}</Text>
                      <Text style={styles.suggUsername}>@{u.username}</Text>
                    </View>
                    <Text style={[styles.suggLevel, { color: LEVEL_COLORS[u.intolerance_level] }]}>
                      {LEVEL_LABELS[u.intolerance_level]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowInvite(false); setInviteUsername(''); setSuggestions([]); }}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalInviteBtn, (inviting || !inviteUsername.trim()) && { opacity: 0.5 }]} onPress={handleInvite} disabled={inviting || !inviteUsername.trim()}>
                {inviting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalInviteText}>Inviter</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 48 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: '700', color: '#1C2B1D' },
  statLabel: { fontSize: 11, color: '#8E8E93', marginTop: 2, fontWeight: '500' },

  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },

  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  memberRowPending: { opacity: 0.7 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  memberName: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  memberUsername: { fontSize: 12, color: '#8E8E93' },
  meBadge: { fontSize: 10, fontWeight: '700', color: '#4A7C59', backgroundColor: '#EEF4EE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  memberLevel: { fontSize: 12, marginTop: 3, fontWeight: '500' },
  pendingLabel: { fontSize: 11, color: '#D4631A', marginTop: 2, fontStyle: 'italic' },
  removeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center' },
  removeBtnText: { color: '#C62828', fontSize: 13, fontWeight: '700' },
  leaveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#C62828' },
  leaveBtnText: { color: '#C62828', fontSize: 12, fontWeight: '600' },

  inviteBtn: {
    marginTop: 20, borderWidth: 1.5, borderColor: '#4A7C59', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
  },
  inviteBtnText: { color: '#4A7C59', fontSize: 15, fontWeight: '600' },

  deleteBtn: { marginTop: 40, alignItems: 'center', paddingVertical: 12 },
  deleteBtnText: { color: '#C62828', fontSize: 14, fontWeight: '500' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalBox: { backgroundColor: '#FAFAF8', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', marginBottom: 8 },
  modalSub: { fontSize: 13, color: '#8E8E93', marginBottom: 16, lineHeight: 18 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E5EA', borderRadius: 12,
    backgroundColor: '#fff', marginBottom: 8,
  },
  inputIcon: { marginLeft: 14 },
  modalInput: {
    flex: 1, paddingHorizontal: 10, paddingVertical: 14,
    fontSize: 16, color: '#1C1C1E',
  },
  suggestionsBox: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E5EA',
    marginBottom: 16, overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  suggAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  suggAvatarText: { fontSize: 15, fontWeight: '700' },
  suggName: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  suggUsername: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  suggLevel: { fontSize: 11, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 12 },
  modalCancelText: { fontSize: 15, fontWeight: '500', color: '#3A3A3C' },
  modalInviteBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#4A7C59', borderRadius: 12 },
  modalInviteText: { fontSize: 15, fontWeight: '600', color: '#FAFAF8' },
});
