import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { scansAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const RISK_COLORS = {
  safe: '#2E7D32', low: '#F57F17', medium: '#E65100', high: '#C62828', unknown: '#546E7A',
};
const RISK_EMOJI = {
  safe: '✅', low: '⚠️', medium: '⚠️', high: '🚫', unknown: '❓',
};

export default function HistoryScreen() {
  const { logout } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await scansAPI.getHistory(20, 0);
      setScans(data.scans);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger l\'historique');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, []);

  const handleDelete = (id) => {
    Alert.alert('Supprimer', 'Supprimer ce scan de l\'historique ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await scansAPI.deleteScan(id);
            setScans((prev) => prev.filter((s) => s.id !== id));
          } catch {
            Alert.alert('Erreur', 'Impossible de supprimer ce scan');
          }
        },
      },
    ]);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.riskEmoji}>{RISK_EMOJI[item.risk_level] || '❓'}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.product_name || 'Produit inconnu'}</Text>
          {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
          <Text style={styles.date}>{formatDate(item.scanned_at)}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: RISK_COLORS[item.risk_level] || '#999' }]}>
          <Text style={styles.scoreText}>{item.risk_score ?? '?'}</Text>
        </View>
      </View>
      {item.ai_explanation ? (
        <Text style={styles.explanation} numberOfLines={2}>{item.ai_explanation}</Text>
      ) : null}
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
        <Text style={styles.deleteText}>🗑 Supprimer</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes scans</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutBtn}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {scans.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📷</Text>
          <Text style={styles.emptyText}>Aucun scan pour l'instant</Text>
          <Text style={styles.emptySub}>Scanner un produit depuis l'onglet Scanner</Text>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadHistory(); }} tintColor="#2E7D32" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FBF9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 22, fontWeight: '800', color: '#2E7D32' },
  logoutBtn: { color: '#E53935', fontSize: 14, fontWeight: '600' },
  list: { padding: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  riskEmoji: { fontSize: 28, marginRight: 10 },
  cardInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', color: '#222' },
  brand: { fontSize: 12, color: '#888', marginTop: 1 },
  date: { fontSize: 11, color: '#bbb', marginTop: 2 },
  scoreBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  scoreText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  explanation: { fontSize: 13, color: '#555', marginTop: 8, lineHeight: 18 },
  deleteBtn: { marginTop: 10, alignSelf: 'flex-end' },
  deleteText: { fontSize: 12, color: '#E53935' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyEmoji: { fontSize: 50, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#333' },
  emptySub: { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center' },
});
