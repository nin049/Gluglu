import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, StatusBar, Image, Animated,
  TextInput,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scansAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const RISK_COLORS = {
  safe: '#4A7C59', low: '#C49A00', medium: '#D4631A', high: '#C62828', unknown: '#8E8E93',
};
const RISK_LABELS = {
  safe: 'Sans risque', low: 'Faible', medium: 'Modéré', high: 'Élevé', unknown: 'Inconnu',
};

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'safe', label: 'Sûr' },
  { id: 'low', label: 'Faible' },
  { id: 'medium', label: 'Modéré' },
  { id: 'high', label: 'Élevé' },
];

const CACHE_KEY = 'history_cache';

export default function HistoryScreen({ navigation }) {
  const { logout } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isOffline, setIsOffline] = useState(false);
  const swipeableRefs = useRef({});

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await scansAPI.getHistory(50, 0);
      setScans(data.scans);
      setIsOffline(false);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data.scans));
    } catch {
      // Mode hors-ligne : charger depuis le cache
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          setScans(JSON.parse(cached));
          setIsOffline(true);
        } else {
          Alert.alert('Erreur', 'Impossible de charger l\'historique.');
        }
      } catch {
        Alert.alert('Erreur', 'Impossible de charger l\'historique.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, []);

  // Stats calculées depuis tous les scans
  const stats = useMemo(() => {
    const total = scans.length;
    if (total === 0) return null;
    const safe = scans.filter(s => s.risk_level === 'safe').length;
    const high = scans.filter(s => s.risk_level === 'high').length;
    return {
      total,
      safePct: Math.round((safe / total) * 100),
      highPct: Math.round((high / total) * 100),
    };
  }, [scans]);

  // Filtrage + recherche
  const filtered = useMemo(() => {
    let result = scans;
    if (activeFilter !== 'all') result = result.filter(s => s.risk_level === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        (s.product_name || '').toLowerCase().includes(q) ||
        (s.brand || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [scans, activeFilter, search]);

  const handleDelete = (id) => {
    Alert.alert('Supprimer ce scan ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel', onPress: () => swipeableRefs.current[id]?.close() },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await scansAPI.deleteScan(id);
            setScans((prev) => prev.filter((s) => s.id !== id));
          } catch {
            Alert.alert('Erreur', 'Impossible de supprimer ce scan.');
            swipeableRefs.current[id]?.close();
          }
        },
      },
    ]);
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

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

  const renderItem = ({ item, index }) => (
    <Swipeable
      ref={(ref) => { swipeableRefs.current[item.id] = ref; }}
      renderRightActions={(_, dragX) => renderRightActions(item.id, dragX)}
      rightThreshold={40}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.card, index === 0 && { borderTopWidth: 1, borderTopColor: '#F0F0F0' }]}
        onPress={() => navigation.navigate('ScanDetail', { scan: item })}
        activeOpacity={0.7}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.thumbnail} resizeMode="contain" />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <View style={[styles.riskDot, { backgroundColor: RISK_COLORS[item.risk_level] || '#999' }]} />
          </View>
        )}

        <View style={styles.cardBody}>
          <Text style={styles.cardProduct} numberOfLines={1}>{item.product_name || 'Produit inconnu'}</Text>
          {item.brand ? <Text style={styles.cardBrand} numberOfLines={1}>{item.brand}</Text> : null}
          <Text style={styles.cardDate}>{formatDate(item.scanned_at)}</Text>
        </View>

        <View style={styles.cardRight}>
          <Text style={[styles.cardScore, { color: RISK_COLORS[item.risk_level] || '#999' }]}>
            {item.risk_score ?? '—'}
          </Text>
          <Text style={styles.cardRiskLabel}>{RISK_LABELS[item.risk_level] || '—'}</Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.brand}>GLUGLU</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 0 }}>
          <Text style={styles.profileText}>Profil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Historique</Text>
        {isOffline && <Text style={styles.offlineBadge}>Hors-ligne</Text>}
      </View>

      {/* Statistiques */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Scans</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#4A7C59' }]}>{stats.safePct}%</Text>
            <Text style={styles.statLabel}>Sûrs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#C62828' }]}>{stats.highPct}%</Text>
            <Text style={styles.statLabel}>Élevés</Text>
          </View>
        </View>
      )}

      {/* Barre de recherche */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit..."
          placeholderTextColor="#BDBDBD"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filtres */}
      <View style={styles.filtersRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, activeFilter === f.id && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.id)}
          >
            <Text style={[styles.filterChipText, activeFilter === f.id && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#1C2B1D" /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{scans.length === 0 ? 'Aucun scan' : 'Aucun résultat'}</Text>
          <Text style={styles.emptySub}>
            {scans.length === 0
              ? 'Vos analyses de produits apparaîtront ici.'
              : 'Essayez un autre filtre ou une autre recherche.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadHistory(); }}
              tintColor="#1C2B1D"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 8,
  },
  brand: { fontSize: 14, fontWeight: '700', letterSpacing: 4, color: '#1C1C1E' },
  profileText: { fontSize: 13, color: '#1C2B1D', fontWeight: '500' },

  titleRow: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.5 },
  offlineBadge: { fontSize: 11, color: '#C49A00', fontWeight: '600', backgroundColor: '#FBF5E6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 16, gap: 10 },
  statCard: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 12, padding: 12, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: '#8E8E93', marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase' },

  searchRow: { paddingHorizontal: 24, paddingBottom: 10 },
  searchInput: {
    backgroundColor: '#F2F2F7', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 15, color: '#1C1C1E',
  },

  filtersRow: { flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 12, gap: 6 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: 'transparent',
  },
  filterChipActive: { backgroundColor: '#EEF4EE', borderColor: '#1C2B1D' },
  filterChipText: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  filterChipTextActive: { color: '#1C2B1D', fontWeight: '600' },

  list: {},
  card: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAF8',
  },
  thumbnail: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#F2F2F7', marginRight: 14 },
  thumbnailPlaceholder: {
    width: 44, height: 44, borderRadius: 8, backgroundColor: '#F2F2F7',
    marginRight: 14, justifyContent: 'center', alignItems: 'center',
  },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  cardBody: { flex: 1, marginRight: 12 },
  cardProduct: { fontSize: 15, fontWeight: '500', color: '#1C1C1E' },
  cardBrand: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  cardDate: { fontSize: 11, color: '#BDBDBD', marginTop: 4 },
  cardRight: { alignItems: 'flex-end' },
  cardScore: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  cardRiskLabel: { fontSize: 10, color: '#8E8E93', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },

  deleteAction: { backgroundColor: '#C62828', justifyContent: 'center', alignItems: 'flex-end' },
  deleteActionBtn: { paddingHorizontal: 24, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', height: '100%' },
  deleteActionText: { color: '#FAFAF8', fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 20 },
});

