import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { familyAPI } from '../api/index';

export default function InvitationsScreen({ navigation }) {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const load = async () => {
    try {
      const res = await familyAPI.getInvitations();
      setInvitations(res.data.invitations || []);
    } catch (_) {
      Alert.alert('Erreur', 'Impossible de charger les invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAccept = async (id) => {
    setActionId(id);
    try {
      await familyAPI.acceptInvitation(id);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
      Alert.alert('✅ Accepté', 'Vous avez rejoint le groupe famille !');
    } catch (_) {
      Alert.alert('Erreur', 'Impossible d\'accepter l\'invitation');
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (id) => {
    setActionId(id);
    try {
      await familyAPI.declineInvitation(id);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch (_) {
      Alert.alert('Erreur', 'Impossible de refuser l\'invitation');
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4A7C59" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invitations reçues</Text>

      {invitations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📬</Text>
          <Text style={styles.emptyText}>Aucune invitation en attente</Text>
        </View>
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.from_name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.from_name}</Text>
                <Text style={styles.email}>{item.from_email}</Text>
                <Text style={styles.sub}>vous invite à rejoindre son groupe famille</Text>
              </View>
              <View style={styles.actions}>
                {actionId === item.id ? (
                  <ActivityIndicator color="#4A7C59" />
                ) : (
                  <>
                    <TouchableOpacity style={styles.btnAccept} onPress={() => handleAccept(item.id)}>
                      <Text style={styles.btnAcceptText}>Accepter</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnDecline} onPress={() => handleDecline(item.id)}>
                      <Text style={styles.btnDeclineText}>Refuser</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F0', paddingTop: 24, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#1C2B1D', marginBottom: 20 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#6B7C6E' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#4A7C59',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  info: { marginBottom: 12 },
  name: { fontSize: 16, fontWeight: '600', color: '#1C2B1D' },
  email: { fontSize: 13, color: '#6B7C6E', marginTop: 2 },
  sub: { fontSize: 13, color: '#8A9A8D', marginTop: 4, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 10 },
  btnAccept: {
    flex: 1, backgroundColor: '#4A7C59', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  btnAcceptText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnDecline: {
    flex: 1, backgroundColor: '#F5F5F0', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#D0D8D2',
  },
  btnDeclineText: { color: '#6B7C6E', fontWeight: '600', fontSize: 14 },
});
