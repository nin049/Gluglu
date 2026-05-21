import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { useLanguage } from '../context/LanguageContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const { t } = useLanguage();
  const [selected, setSelected] = useState(user?.intolerance_level || 'sensitive');
  const [username, setUsername] = useState(user?.username || '');
  const [saving, setSaving] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);

  const LEVELS = [
    {
      id: 'strict',
      label: t.profile.levels.strict.label,
      description: t.profile.levels.strict.description,
    },
    {
      id: 'sensitive',
      label: t.profile.levels.sensitive.label,
      description: t.profile.levels.sensitive.description,
    },
    {
      id: 'avoiding',
      label: t.profile.levels.avoiding.label,
      description: t.profile.levels.avoiding.description,
    },
  ];

  const hasChanges = selected !== user?.intolerance_level || username.trim().toLowerCase() !== (user?.username || '');

  const initials = (user?.name || '?').charAt(0).toUpperCase();

  const handleSave = async () => {
    if (!hasChanges) return;
    if (username.trim() && !/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      return Alert.alert(t.common.error, t.auth.errorUsernameFormat);
    }
    setSaving(true);
    try {
      const payload = { intolerance_level: selected };
      if (username.trim()) payload.username = username.trim().toLowerCase();
      const { data } = await authAPI.updateProfile(payload);
      await updateUser(data.user);
      setEditingUsername(false);
      Alert.alert(t.profile.title, t.profile.saveSuccess);
    } catch (err) {
      Alert.alert(t.common.error, err?.response?.data?.error || t.profile.errorUpdate);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Avatar + user info */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        {user?.username ? (
          <TouchableOpacity onPress={() => setEditingUsername(true)} activeOpacity={0.7}>
            {editingUsername ? (
              <TextInput
                style={styles.usernameInput}
                value={username}
                onChangeText={setUsername}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t.profile.pseudoPlaceholder}
                placeholderTextColor="#BDBDBD"
                onBlur={() => setEditingUsername(false)}
              />
            ) : (
              <Text style={styles.userPseudo}>@{user.username}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setEditingUsername(true)} activeOpacity={0.7}>
            {editingUsername ? (
              <TextInput
                style={styles.usernameInput}
                value={username}
                onChangeText={setUsername}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t.profile.pseudoPlaceholder}
                placeholderTextColor="#BDBDBD"
                onBlur={() => setEditingUsername(false)}
              />
            ) : (
              <Text style={styles.userPseudoEmpty}>{t.profile.addPseudo}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />

      {/* Intolerance level */}
      <Text style={styles.sectionLabel}>{t.profile.intoleranceTitle.toUpperCase()}</Text>
      <Text style={styles.sectionSub}>{t.profile.intoleranceSub}</Text>

      {LEVELS.map((level) => (
        <TouchableOpacity
          key={level.id}
          style={[styles.levelCard, selected === level.id && styles.levelCardActive]}
          onPress={() => setSelected(level.id)}
          activeOpacity={0.8}
        >
          <View style={styles.levelLeft}>
            <View style={[styles.radio, selected === level.id && styles.radioActive]}>
              {selected === level.id && <View style={styles.radioDot} />}
            </View>
          </View>
          <View style={styles.levelBody}>
            <Text style={[styles.levelLabel, selected === level.id && styles.levelLabelActive]}>
              {level.label}
            </Text>
            <Text style={styles.levelDesc}>{level.description}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!hasChanges || saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#FAFAF8" />
        ) : (
          <Text style={styles.saveBtnText}>{t.common.save}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>{t.profile.logout}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { paddingBottom: 60 },

  avatarSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 24 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#4A7C59',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatarInitials: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  userName: { fontSize: 22, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.3, marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#8E8E93', marginBottom: 6 },
  userPseudo: { fontSize: 14, color: '#4A7C59', fontWeight: '500' },
  userPseudoEmpty: { fontSize: 14, color: '#4A7C59', fontStyle: 'italic' },
  usernameInput: {
    fontSize: 14, color: '#1C1C1E', textAlign: 'center',
    borderBottomWidth: 1, borderBottomColor: '#4A7C59', paddingBottom: 2, minWidth: 120,
  },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 24, marginBottom: 24 },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#8E8E93',
    letterSpacing: 1.5, paddingHorizontal: 24, marginBottom: 6,
  },
  sectionSub: { fontSize: 13, color: '#8E8E93', paddingHorizontal: 24, marginBottom: 16, lineHeight: 18 },

  levelCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: 24, marginBottom: 10,
    backgroundColor: '#F2F2F7', borderRadius: 14,
    padding: 16, borderWidth: 1.5, borderColor: 'transparent',
  },
  levelCardActive: { borderColor: '#1C2B1D', backgroundColor: '#EEF4EE' },
  levelLeft: { marginRight: 14, paddingTop: 1 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#BDBDBD',
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: '#1C2B1D' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1C2B1D' },
  levelBody: { flex: 1 },
  levelLabel: { fontSize: 15, fontWeight: '600', color: '#3A3A3C', marginBottom: 3 },
  levelLabelActive: { color: '#1C2B1D' },
  levelDesc: { fontSize: 13, color: '#8E8E93', lineHeight: 18 },

  saveBtn: {
    marginHorizontal: 24, marginTop: 24,
    backgroundColor: '#1C2B1D', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#FAFAF8', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },

  logoutBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  logoutText: { fontSize: 15, color: '#C62828', fontWeight: '500' },
});
