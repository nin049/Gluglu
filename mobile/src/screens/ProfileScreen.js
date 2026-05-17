import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';

const LEVELS = [
  {
    id: 'strict',
    label: 'Cœliaque strict',
    description: 'Maladie cœliaque diagnostiquée. Les traces sont dangereuses.',
  },
  {
    id: 'sensitive',
    label: 'Sensibilité au gluten',
    description: 'Symptômes au gluten sans maladie cœliaque diagnostiquée.',
  },
  {
    id: 'avoiding',
    label: 'Évitement par choix',
    description: 'Je préfère éviter le gluten mais je suis tolérant.',
  },
];

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const [selected, setSelected] = useState(user?.intolerance_level || 'sensitive');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (selected === user?.intolerance_level) {
      navigation.goBack();
      return;
    }
    setSaving(true);
    try {
      const { data } = await authAPI.updateProfile({ intolerance_level: selected });
      await updateUser(data.user);
      Alert.alert('Profil mis à jour', 'Vos préférences ont été enregistrées.');
      navigation.goBack();
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.brand}>GLUGLU</Text>
      </View>

      <Text style={styles.pageTitle}>Profil</Text>

      {/* Infos utilisateur */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nom</Text>
          <Text style={styles.infoValue}>{user?.name}</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
      </View>

      {/* Niveau d'intolérance */}
      <Text style={styles.sectionLabel}>Mon niveau d'intolérance</Text>
      <Text style={styles.sectionSub}>
        Cette information guide l'analyse IA de chaque produit.
      </Text>

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
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#FAFAF8" />
        ) : (
          <Text style={styles.saveBtnText}>Enregistrer</Text>
        )}
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { paddingBottom: 60 },

  header: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 8 },
  brand: { fontSize: 14, fontWeight: '700', letterSpacing: 4, color: '#1C1C1E' },

  pageTitle: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.5, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },

  infoCard: {
    marginHorizontal: 24, marginBottom: 32,
    backgroundColor: '#F2F2F7', borderRadius: 14, overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  infoLabel: { fontSize: 15, color: '#3A3A3C' },
  infoValue: { fontSize: 15, color: '#8E8E93', maxWidth: '60%', textAlign: 'right' },
  separator: { height: 1, backgroundColor: '#E5E5EA', marginHorizontal: 16 },

  sectionLabel: { fontSize: 11, fontWeight: '600', color: '#8E8E93', letterSpacing: 1.5, textTransform: 'uppercase', paddingHorizontal: 24, marginBottom: 6 },
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
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FAFAF8', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 24, marginTop: 32, marginBottom: 8 },

  logoutBtn: { paddingVertical: 16, alignItems: 'center' },
  logoutText: { fontSize: 15, color: '#C62828', fontWeight: '500' },
});
