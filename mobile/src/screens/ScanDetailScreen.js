import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Share,
} from 'react-native';

const RISK = {
  safe:    { label: 'Sans risque détecté', barColor: '#4A7C59', bg: '#EEF4EE', textColor: '#1C2B1D' },
  low:     { label: 'Risque faible',       barColor: '#C49A00', bg: '#FBF5E6', textColor: '#7A5C00' },
  medium:  { label: 'Risque modéré',       barColor: '#D4631A', bg: '#FBF0E6', textColor: '#8B3A00' },
  high:    { label: 'Risque élevé',        barColor: '#C62828', bg: '#FBE9E9', textColor: '#7B1111' },
  unknown: { label: 'Indéterminé',         barColor: '#8E8E93', bg: '#F2F2F7', textColor: '#3A3A3C' },
};

function scoreToColor(score) {
  if (score <= 30) return '#4A7C59';
  if (score <= 60) return '#D4631A';
  return '#C62828';
}

export default function ScanDetailScreen({ route, navigation }) {
  const { scan } = route.params;

  const riskLevel = scan.risk_level || 'unknown';
  const risk = RISK[riskLevel] || RISK.unknown;
  const score = scan.risk_score ?? 0;
  const barColor = scoreToColor(score);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `GluGlu - Analyse gluten\n\n${scan.product_name}${scan.brand ? ` (${scan.brand})` : ''}\n\nScore de risque : ${score}/100 — ${risk.label}\n\n${scan.ai_explanation || ''}\n\nAnalysé avec GluGlu`,
      });
    } catch {}
  };

  const suspectIngredients = (() => {
    try {
      const parsed = JSON.parse(scan.suspect_ingredients || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Retour</Text>
      </TouchableOpacity>

      {scan.image_url ? (
        <Image source={{ uri: scan.image_url }} style={styles.productImage} resizeMode="contain" />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Text style={styles.placeholderText}>Aucune photo disponible</Text>
        </View>
      )}

      <View style={[styles.scoreCard, { backgroundColor: risk.bg }]}>
        <Text style={[styles.scoreNumber, { color: risk.textColor }]}>{score}</Text>
        <Text style={[styles.scoreLabel, { color: risk.textColor }]}>{risk.label}</Text>

        <View style={styles.scoreBarBg}>
          <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: barColor }]} />
          <View style={[styles.barMarker, { left: '30%' }]} />
          <View style={[styles.barMarker, { left: '60%' }]} />
        </View>

        <View style={styles.barLegend}>
          <Text style={[styles.barLegendText, { color: '#4A7C59' }]}>Sûr</Text>
          <Text style={[styles.barLegendText, { color: '#D4631A' }]}>Modéré</Text>
          <Text style={[styles.barLegendText, { color: '#C62828' }]}>Élevé</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Produit</Text>
        <Text style={styles.productName}>{scan.product_name}</Text>
        {scan.brand ? <Text style={styles.productBrand}>{scan.brand}</Text> : null}
        <Text style={styles.productBarcode}>{scan.barcode}</Text>
      </View>

      <View style={styles.separator} />

      {scan.ai_explanation ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Analyse</Text>
            <Text style={styles.bodyText}>{scan.ai_explanation}</Text>
            {suspectIngredients.length > 0 && (
              <View style={styles.suspectContainer}>
                <Text style={styles.suspectTitle}>Ingrédients suspects</Text>
                {suspectIngredients.map((ing, i) => (
                  <View key={i} style={styles.suspectRow}>
                    <View style={styles.suspectDot} />
                    <Text style={styles.suspectText}>{ing}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={styles.separator} />
        </>
      ) : null}

      {scan.ingredients ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Ingrédients</Text>
            <Text style={styles.bodyText}>{scan.ingredients}</Text>
          </View>
          <View style={styles.separator} />
        </>
      ) : null}

      {scan.allergens ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Allergènes déclarés</Text>
            <Text style={styles.bodyText}>{scan.allergens}</Text>
          </View>
          <View style={styles.separator} />
        </>
      ) : null}

      <View style={styles.dateSection}>
        <Text style={styles.dateText}>
          Scanné le {new Date(scan.scanned_at).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareText}>Partager ce résultat</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { paddingBottom: 48 },

  backBtn: { padding: 20, paddingBottom: 0 },
  backText: { fontSize: 14, color: '#1C2B1D', fontWeight: '600', letterSpacing: 0.3 },

  productImage: { width: '100%', height: 220, backgroundColor: '#F2F2F7' },
  productImagePlaceholder: {
    width: '100%', height: 100,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center', alignItems: 'center',
  },
  placeholderText: { fontSize: 12, color: '#BDBDBD' },

  scoreCard: { margin: 20, borderRadius: 16, padding: 28, alignItems: 'center' },
  scoreNumber: { fontSize: 64, fontWeight: '700', letterSpacing: -2 },
  scoreLabel: { fontSize: 16, fontWeight: '500', marginTop: 4, letterSpacing: 0.2 },
  scoreBarBg: {
    width: '100%', height: 6, backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3, marginTop: 20, overflow: 'hidden',
  },
  scoreBarFill: { height: 6, borderRadius: 3 },
  barMarker: {
    position: 'absolute', top: 0, bottom: 0,
    width: 1, backgroundColor: 'rgba(255,255,255,0.6)',
  },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6 },
  barLegendText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },

  section: { paddingHorizontal: 24, paddingVertical: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: '#8E8E93', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  productName: { fontSize: 20, fontWeight: '600', color: '#1C1C1E', letterSpacing: -0.3 },
  productBrand: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
  productBarcode: { fontSize: 12, color: '#BDBDBD', marginTop: 4, letterSpacing: 0.5 },

  bodyText: { fontSize: 15, color: '#3A3A3C', lineHeight: 23 },

  suspectContainer: { marginTop: 16 },
  suspectTitle: { fontSize: 12, fontWeight: '600', color: '#8B3A00', letterSpacing: 0.5, marginBottom: 8 },
  suspectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  suspectDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C62828', marginRight: 10 },
  suspectText: { fontSize: 14, color: '#3A3A3C' },

  separator: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 24 },

  dateSection: { paddingHorizontal: 24, paddingTop: 20 },
  dateText: { fontSize: 12, color: '#BDBDBD', letterSpacing: 0.3 },
  shareBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  shareText: { color: '#8E8E93', fontSize: 14 },
});
