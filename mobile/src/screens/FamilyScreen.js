import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Alert, ActivityIndicator, StatusBar, Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { familyAPI } from '../api';

const LEVELS = [
  { id: 'strict', label: 'Cœliaque strict', short: 'Strict' },
  { id: 'sensitive', label: 'Sensibilité', short: 'Sensible' },
  { id: 'avoiding', label: 'Évitement', short: 'Évitement' },
];

const LEVEL_COLORS = {
  strict: '#C62828',
  sensitive: '#D4631A',
  avoiding: '#4A7C59',
};

export default function FamilyScreen({ navigation }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('sensitive');
  const [saving, setSaving] = useState(false);
  const swipeableRefs = useRef({});

  const load = useCallback(async () => {
    try {
      const { data } = await familyAPI.getFamily();
      setMembers(data.members);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les membres.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Prénom requis', 'Entrez le prénom du membre.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await familyAPI.addMember({ name: name.trim(), intolerance_level: selectedLevel });
      setMembers((prev) => [...prev, data.member]);
      setName('');
      setSelectedLevel('sensitive');
      setShowForm(false);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ajouter ce membre.');
    } finally {
      setSaving(false);
    }
  };

  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { data } = await familyAPI.invite(inviteEmail.trim());
      Alert.alert('✅ Invitation envoyée', data.message);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || 'Impossible d\'envoyer l\'invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Supprimer ce membre ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel', onPress: () => swipeableRefs.current[id]?.close() },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await familyAPI.deleteMember(id);
            setMembers((prev) => prev.filter((m) => m.id !== id));
          } catch {
            Alert.alert('Erreur', 'Impossible de supprimer ce membre.');
            swipeableRefs.current[id]?.close();
          }
        },
      },
    ]);
  };

  const renderRightActions = (id, dragX) => {
    const opacity = dragX.interpolate({ inputRange: [-80, -20], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <Animated.View style={[styles.deleteAction, { opacity }]}>
        <TouchableOpacity style={styles.deleteActionBtn} onPress={() => handleDelete(id)}>
          <Text style={styles.deleteActionText}>Supprimer</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" />

      <Text style={styles.pageTitle}>Ma famille</Text>
      <Text style={styles.pageSub}>
        Chaque membre a son propre niveau d'intolérance. L'analyse s'adapte automatiquement à chacun.
      </Text>

      {/* Boutons d'action en haut */}
      <View style={styles.topActions}>
        <TouchableOpacity
          style={styles.inviteBtn}
          onPress={() => navigation.navigate('Invitations')}
          activeOpacity={0.8}
        >
          <Text style={styles.inviteBtnText}>📬 Invitations reçues</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#1C2B1D" style={{ marginTop: 40 }} />
      ) : (
        <>
          {members.length === 0 && !showForm && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Aucun membre</Text>
              <Text style={styles.emptySub}>Ajoutez les membres de votre famille pour voir leur analyse lors de chaque scan.</Text>
            </View>
          )}

          {members.map((member) => (
            <Swipeable
              key={member.id}
              ref={(ref) => { swipeableRefs.current[member.id] = ref; }}
              renderRightActions={(_, dragX) => renderRightActions(member.id, dragX)}
              rightThreshold={40}
              overshootRight={false}
            >
              <View style={styles.memberCard}>
                <View style={[styles.avatar, { backgroundColor: LEVEL_COLORS[member.intolerance_level] + '22' }]}>
                  <Text style={[styles.avatarText, { color: LEVEL_COLORS[member.intolerance_level] }]}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberBody}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={[styles.memberLevel, { color: LEVEL_COLORS[member.intolerance_level] }]}>
                    {LEVELS.find(l => l.id === member.intolerance_level)?.label}
                  </Text>
                </View>
              </View>
            </Swipeable>
          ))}

          {showForm ? (
            <View style={styles.formBox}>
              <Text style={styles.formTitle}>Nouveau membre</Text>

              <TextInput
                style={styles.input}
                placeholder="Prénom"
                placeholderTextColor="#BDBDBD"
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={50}
              />

              <Text style={styles.formLabel}>Niveau d'intolérance</Text>
              {LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.id}
                  style={[styles.levelOption, selectedLevel === level.id && styles.levelOptionActive]}
                  onPress={() => setSelectedLevel(level.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radio, selectedLevel === level.id && styles.radioActive]}>
                    {selectedLevel === level.id && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.levelLabel, selectedLevel === level.id && styles.levelLabelActive]}>
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowForm(false); setName(''); }}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addBtn, saving && { opacity: 0.6 }]} onPress={handleAdd} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FAFAF8" /> : <Text style={styles.addBtnText}>Ajouter</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : showInviteForm ? (
            <View style={styles.formBox}>
              <Text style={styles.formTitle}>Inviter par email</Text>
              <Text style={styles.formSub}>Invitez un utilisateur GluGlu à rejoindre votre groupe famille.</Text>
              <TextInput
                style={styles.input}
                placeholder="Email GluGlu"
                placeholderTextColor="#BDBDBD"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                autoFocus
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowInviteForm(false); setInviteEmail(''); }}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addBtn, inviting && { opacity: 0.6 }]} onPress={handleInvite} disabled={inviting}>
                  {inviting ? <ActivityIndicator color="#FAFAF8" /> : <Text style={styles.addBtnText}>Inviter</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.newBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
                <Text style={styles.newBtnText}>+ Ajouter un membre</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.newBtnSecondary} onPress={() => setShowInviteForm(true)} activeOpacity={0.85}>
                <Text style={styles.newBtnSecondaryText}>✉️ Inviter un ami</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { paddingBottom: 60 },

  pageTitle: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.5, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 6 },
  pageSub: { fontSize: 14, color: '#8E8E93', paddingHorizontal: 24, marginBottom: 24, lineHeight: 20 },

  emptyBox: { marginHorizontal: 24, marginTop: 16, padding: 24, backgroundColor: '#F2F2F7', borderRadius: 14, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#8E8E93', textAlign: 'center', lineHeight: 18 },

  memberCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAF8',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 18, fontWeight: '700' },
  memberBody: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  memberLevel: { fontSize: 12, marginTop: 2, fontWeight: '500' },

  deleteAction: { backgroundColor: '#C62828', justifyContent: 'center', alignItems: 'flex-end' },
  deleteActionBtn: { paddingHorizontal: 24, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', height: '100%' },
  deleteActionText: { color: '#FAFAF8', fontSize: 13, fontWeight: '600' },

  newBtn: {
    marginHorizontal: 24, marginTop: 20,
    borderWidth: 1.5, borderColor: '#1C2B1D', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  newBtnText: { color: '#1C2B1D', fontSize: 15, fontWeight: '600' },

  formBox: { marginHorizontal: 24, marginTop: 20, backgroundColor: '#F2F2F7', borderRadius: 16, padding: 20 },
  formTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginBottom: 16 },

  input: {
    backgroundColor: '#FAFAF8', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: '#1C1C1E', marginBottom: 20,
  },

  formLabel: { fontSize: 11, fontWeight: '600', color: '#8E8E93', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  levelOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, marginBottom: 6,
    borderWidth: 1.5, borderColor: 'transparent',
    backgroundColor: '#FAFAF8',
  },
  levelOptionActive: { borderColor: '#1C2B1D', backgroundColor: '#EEF4EE' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#BDBDBD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  radioActive: { borderColor: '#1C2B1D' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1C2B1D' },
  levelLabel: { fontSize: 14, color: '#3A3A3C', fontWeight: '500' },
  levelLabelActive: { color: '#1C2B1D', fontWeight: '600' },

  formActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#E5E5EA', borderRadius: 10 },
  cancelBtnText: { color: '#3A3A3C', fontSize: 15, fontWeight: '500' },
  addBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#1C2B1D', borderRadius: 10 },
  addBtnText: { color: '#FAFAF8', fontSize: 15, fontWeight: '600' },

  topActions: { paddingHorizontal: 24, marginBottom: 8 },
  inviteBtn: {
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: '#EEF4EE', alignSelf: 'flex-start',
  },
  inviteBtnText: { color: '#1C2B1D', fontSize: 13, fontWeight: '600' },

  btnRow: { gap: 10, marginHorizontal: 24, marginTop: 20 },
  newBtnSecondary: {
    borderWidth: 1.5, borderColor: '#4A7C59', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  newBtnSecondaryText: { color: '#4A7C59', fontSize: 15, fontWeight: '600' },
  formSub: { fontSize: 13, color: '#8E8E93', marginBottom: 14, lineHeight: 18 },
});
