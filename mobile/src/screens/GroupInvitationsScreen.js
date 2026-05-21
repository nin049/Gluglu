import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { groupsAPI } from '../api/index';
import { Ionicons } from '@expo/vector-icons';

const LEVEL_LABELS = { strict: 'Cœliaque strict', sensitive: 'Sensible', avoiding: 'Évitement' };
const LEVEL_COLORS = { strict: '#C62828', sensitive: '#D4631A', avoiding: '#4A7C59' };

export default function GroupInvitationsScreen({ navigation }) {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await groupsAPI.getPendingInvitations();
      setInvitations(data.invitations || []);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les invitations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const handleAccept = async (invitationId) => {
    setProcessing(invitationId);
    try {
      await groupsAPI.acceptInvitation(invitationId);
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      Alert.alert('Vous avez rejoint le groupe !');
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || 'Impossible d\'accepter');
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (invitationId) => {
    setProcessing(invitationId);
    try {
      await groupsAPI.declineInvitation(invitationId);
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    } catch {
      Alert.alert('Erreur', 'Impossible de refuser');
    } finally {
      setProcessing(null);
    }
  };

  const renderInvitation = ({ item }) => {
    const busy = processing === item.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.groupIcon}>
            <Text style={styles.groupIconText}>{item.group_name[0]?.toUpperCase()}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.groupName}>{item.group_name}</Text>
            <Text style={styles.invitedBy}>Invité par {item.owner_name}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.declineBtn, busy && { opacity: 0.5 }]}
            onPress={() => handleDecline(item.id)}
            disabled={busy}
          >
            <Text style={styles.declineBtnText}>Refuser</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptBtn, busy && { opacity: 0.5 }]}
            onPress={() => handleAccept(item.id)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.acceptBtnText}>Rejoindre</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#4A7C59" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={invitations}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderInvitation}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="mail-outline" size={52} color="#BDBDBD" />
            <Text style={styles.emptyTitle}>Aucune invitation</Text>
            <Text style={styles.emptySub}>Vous n'avez pas d'invitation en attente.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 48 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  groupIcon: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: '#EEF4EE', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  groupIconText: { fontSize: 22, fontWeight: '700', color: '#4A7C59' },
  cardInfo: { flex: 1 },
  groupName: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  invitedBy: { fontSize: 13, color: '#8E8E93', marginTop: 3 },

  actions: { flexDirection: 'row', gap: 12 },
  declineBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    backgroundColor: '#F2F2F7', borderRadius: 12,
  },
  declineBtnText: { color: '#3A3A3C', fontSize: 14, fontWeight: '600' },
  acceptBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    backgroundColor: '#4A7C59', borderRadius: 12,
  },
  acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1C1C1E' },
  emptySub: { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 20 },
});
