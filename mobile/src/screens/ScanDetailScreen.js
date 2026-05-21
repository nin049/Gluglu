import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Share,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';

const RISK_BASE = {
  safe:    { bg: '#EEF4EE', textColor: '#1C2B1D' },
  low:     { bg: '#FBF5E6', textColor: '#7A5C00' },
  medium:  { bg: '#FBF0E6', textColor: '#8B3A00' },
  high:    { bg: '#FBE9E9', textColor: '#7B1111' },
  unknown: { bg: '#F2F2F7', textColor: '#3A3A3C' },
};

function scoreToColor(score) {
  if (score <= 30) return '#4A7C59';
  if (score <= 60) return '#D4631A';
  return '#C62828';
}

export default function ScanDetailScreen({ route, navigation }) {
  const { scan } = route.params;
  const { t } = useLanguage();

  const riskLevel = scan.risk_level || 'unknown';
  const riskBase = RISK_BASE[riskLevel] || RISK_BASE.unknown;
  const riskLabel = t.product.risk[riskLevel] || t.product.risk.unknown;
  const score = scan.risk_score ?? 0;
  const barColor = scoreToColor(score);

  const handleShare = async () => {
    try {
      await Share.share({
        message: t.product.shareMessage(scan.product_name, scan.brand, score, riskLabel, scan.ai_explanation || ''),
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

      {scan.image_url ? (
        <Image source={{ uri: scan.image_url }} style={styles.productImage} resizeMode="contain" />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Text style={styles.placeholderText}>{t.common.noPhoto}</Text>
        </View>
      )}

      <View style={[styles.scoreCard, { backgroundColor: riskBase.bg }]}>
        <Text style={[styles.scoreNumber, { color: riskBase.textColor }]}>{score}</Text>
        <Text style={[styles.scoreLabel, { color: riskBase.textColor }]}>{riskLabel}</Text>

        <View style={styles.scoreBarBg}>
          <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: barColor }]} />
          <View style={[styles.barMarker, { left: '30%' }]} />
          <View style={[styles.barMarker, { left: '60%' }]} />
        </View>

        <View style={styles.barLegend}>
          <Text style={[styles.barLegendText, { color: '#4A7C59' }]}>{t.product.scaleSafe}</Text>
          <Text style={[styles.barLegendText, { color: '#D4631A' }]}>{t.product.scaleMedium}</Text>
          <Text style={[styles.barLegendText, { color: '#C62828' }]}>{t.product.scaleHigh}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.product.sectionProduct}</Text>
        <Text style={styles.productName}>{scan.product_name}</Text>
        {scan.brand ? <Text style={styles.productBrand}>{scan.brand}</Text> : null}
        <Text style={styles.productBarcode}>{scan.barcode}</Text>
      </View>

      <View style={styles.separator} />

      {scan.ai_explanation ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.product.sectionAnalysis}</Text>
            <Text style={styles.bodyText}>{scan.ai_explanation}</Text>
            {suspectIngredients.length > 0 && (
              <View style={styles.suspectContainer}>
                <Text style={styles.suspectTitle}>{t.product.suspectIngredients}</Text>
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
            <Text style={styles.sectionLabel}>{t.product.sectionIngredients}</Text>
            <Text style={styles.bodyText}>{scan.ingredients}</Text>
          </View>
          <View style={styles.separator} />
        </>
      ) : null}

      {scan.allergens ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.product.sectionAllergens}</Text>
            <Text style={styles.bodyText}>{scan.allergens}</Text>
          </View>
          <View style={styles.separator} />
        </>
      ) : null}

      <View style={styles.dateSection}>
        <Text style={styles.dateText}>
          {t.history.scannedOn} {new Date(scan.scanned_at).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareText}>{t.product.share}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { paddingBottom: 48 },

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
