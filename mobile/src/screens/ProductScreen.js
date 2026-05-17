import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const RISK_CONFIG = {
  safe:    { color: '#2E7D32', bg: '#E8F5E9', emoji: '✅', label: 'Sans risque' },
  low:     { color: '#F57F17', bg: '#FFF8E1', emoji: '⚠️', label: 'Risque faible' },
  medium:  { color: '#E65100', bg: '#FFF3E0', emoji: '⚠️', label: 'Risque modéré' },
  high:    { color: '#C62828', bg: '#FFEBEE', emoji: '🚫', label: 'Risque élevé' },
  unknown: { color: '#546E7A', bg: '#ECEFF1', emoji: '❓', label: 'Inconnu' },
};

export default function ProductScreen({ route, navigation }) {
  const { result } = route.params;
  const { product, analysis } = result;
  const config = RISK_CONFIG[analysis.risk_level] || RISK_CONFIG.unknown;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Badge risque */}
      <View style={[styles.riskBadge, { backgroundColor: config.bg }]}>
        <Text style={styles.riskEmoji}>{config.emoji}</Text>
        <Text style={[styles.riskLabel, { color: config.color }]}>{config.label}</Text>
        <Text style={[styles.riskScore, { color: config.color }]}>
          Score : {analysis.risk_score}/100
        </Text>
      </View>

      {/* Score bar */}
      <View style={styles.scoreBarContainer}>
        <View style={[styles.scoreBar, { width: `${analysis.risk_score}%`, backgroundColor: config.color }]} />
      </View>

      {/* Info produit */}
      <View style={styles.card}>
        <Text style={styles.productName}>{product.name}</Text>
        {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
        <Text style={styles.barcode}>Code-barres : {product.barcode}</Text>
      </View>

      {/* Explication IA */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🤖 Analyse IA</Text>
        <Text style={styles.explanation}>{analysis.explanation}</Text>
        {analysis.suspect_ingredients?.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>⚠️ Ingrédients suspects</Text>
            {analysis.suspect_ingredients.map((ing, i) => (
              <Text key={i} style={styles.suspectItem}>• {ing}</Text>
            ))}
          </>
        )}
      </View>

      {/* Ingrédients */}
      {product.ingredients ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📋 Ingrédients</Text>
          <Text style={styles.ingredientText}>{product.ingredients}</Text>
        </View>
      ) : null}

      {/* Allergènes */}
      {product.allergens ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🏷️ Allergènes déclarés</Text>
          <Text style={styles.ingredientText}>{product.allergens}</Text>
        </View>
      ) : null}

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚕️ Cette application est un assistant d'analyse et non un outil médical certifié. En cas de doute, consulte un professionnel de santé.
        </Text>
      </View>

      <TouchableOpacity style={styles.newScanBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.newScanText}>📷 Scanner un autre produit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FBF9' },
  content: { padding: 16, paddingBottom: 40 },
  riskBadge: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 8 },
  riskEmoji: { fontSize: 48 },
  riskLabel: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  riskScore: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  scoreBarContainer: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 16 },
  scoreBar: { height: 8, borderRadius: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  productName: { fontSize: 20, fontWeight: '700', color: '#222' },
  brand: { fontSize: 14, color: '#666', marginTop: 4 },
  barcode: { fontSize: 12, color: '#999', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 8 },
  explanation: { fontSize: 15, color: '#444', lineHeight: 22 },
  suspectItem: { fontSize: 14, color: '#C62828', marginTop: 2 },
  ingredientText: { fontSize: 13, color: '#555', lineHeight: 20 },
  disclaimer: { backgroundColor: '#FFF9C4', borderRadius: 10, padding: 12, marginBottom: 16 },
  disclaimerText: { fontSize: 12, color: '#666', lineHeight: 18 },
  newScanBtn: { backgroundColor: '#2E7D32', borderRadius: 12, padding: 16, alignItems: 'center' },
  newScanText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
