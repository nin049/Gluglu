import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Image, Share,
} from 'react-native';

const RISK = {
  safe:    { label: 'Sans risque détecté', barColor: '#4A7C59', bg: '#EEF4EE', textColor: '#1C2B1D' },
  low:     { label: 'Risque faible',       barColor: '#C49A00', bg: '#FBF5E6', textColor: '#7A5C00' },
  medium:  { label: 'Risque modéré',       barColor: '#D4631A', bg: '#FBF0E6', textColor: '#8B3A00' },
  high:    { label: 'Risque élevé',        barColor: '#C62828', bg: '#FBE9E9', textColor: '#7B1111' },
  unknown: { label: 'Indéterminé',         barColor: '#8E8E93', bg: '#F2F2F7', textColor: '#3A3A3C' },
};

const RISK_COLORS = {
  safe: '#4A7C59', low: '#C49A00', medium: '#D4631A', high: '#C62828', unknown: '#8E8E93',
};

function scoreToColor(score) {
  if (score <= 30) return '#4A7C59';
  if (score <= 60) return '#D4631A';
  return '#C62828';
}

export default function ProductScreen({ route, navigation }) {
  const { result } = route.params;
  const { product, analysis, family_analysis, group_analysis } = result;
  const memberAnalysis = group_analysis || family_analysis || [];
  const risk = RISK[analysis.risk_level] || RISK.unknown;
  const score = analysis.risk_score ?? 0;
  const barColor = scoreToColor(score);

  const handleShare = async () => {
    const riskLabel = risk.label;
    try {
      await Share.share({
        message: `GluGlu - Analyse gluten\n\n${product.name}${product.brand ? ` (${product.brand})` : ''}\n\nScore de risque : ${score}/100 — ${riskLabel}\n\n${analysis.explanation}\n\nAnalysé avec GluGlu`,
      });
    } catch {}
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" />

      {/* Photo produit */}
      {product.image ? (
        <Image
          source={{ uri: product.image }}
          style={styles.productImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Text style={styles.placeholderText}>Aucune photo disponible</Text>
        </View>
      )}

      {/* Score principal */}
      <View style={[styles.scoreCard, { backgroundColor: risk.bg }]}>
        <Text style={[styles.scoreNumber, { color: risk.textColor }]}>{score}</Text>
        <Text style={[styles.scoreLabel, { color: risk.textColor }]}>{risk.label}</Text>

        {/* Barre colorée verte→orange→rouge */}
        <View style={styles.scoreBarBg}>
          <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: barColor }]} />
          {/* Marqueurs */}
          <View style={[styles.barMarker, { left: '30%' }]} />
          <View style={[styles.barMarker, { left: '60%' }]} />
        </View>

        <View style={styles.barLegend}>
          <Text style={[styles.barLegendText, { color: '#4A7C59' }]}>Sûr</Text>
          <Text style={[styles.barLegendText, { color: '#D4631A' }]}>Modéré</Text>
          <Text style={[styles.barLegendText, { color: '#C62828' }]}>Élevé</Text>
        </View>
      </View>

      {/* Infos produit */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Produit</Text>
        <Text style={styles.productName}>{product.name}</Text>
        {product.brand ? <Text style={styles.productBrand}>{product.brand}</Text> : null}
        <Text style={styles.productBarcode}>{product.barcode}</Text>
      </View>

      <View style={styles.separator} />

      {/* Analyse IA */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Analyse</Text>
        <Text style={styles.bodyText}>{analysis.explanation}</Text>

        {analysis.suspect_ingredients?.length > 0 && (
          <View style={styles.suspectContainer}>
            <Text style={styles.suspectTitle}>Ingrédients suspects</Text>
            {analysis.suspect_ingredients.map((ing, i) => (
              <View key={i} style={styles.suspectRow}>
                <View style={styles.suspectDot} />
                <Text style={styles.suspectText}>{ing}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {product.ingredients ? (
        <>
          <View style={styles.separator} />
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Ingrédients</Text>
            <Text style={styles.bodyText}>{product.ingredients}</Text>
          </View>
        </>
      ) : null}

      {product.allergens ? (
        <>
          <View style={styles.separator} />
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Allergènes déclarés</Text>
            <Text style={styles.bodyText}>{product.allergens}</Text>
          </View>
        </>
      ) : null}

      <View style={styles.separator} />

      {/* Analyse groupe */}
      {memberAnalysis.length > 0 && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Analyse du groupe</Text>
            {memberAnalysis.map((member) => (
              <View key={member.member_id || member.user_id} style={styles.familyRow}>
                <View style={[styles.familyAvatar, { backgroundColor: RISK_COLORS[member.risk_level] + '22' }]}>
                  <Text style={[styles.familyAvatarText, { color: RISK_COLORS[member.risk_level] }]}>
                    {(member.member_name || member.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.familyName}>{member.member_name || member.name}</Text>
                <View style={[styles.familyBadge, { backgroundColor: RISK_COLORS[member.risk_level] + '22' }]}>
                  <Text style={[styles.familyBadgeText, { color: RISK_COLORS[member.risk_level] }]}>
                    {RISK[member.risk_level]?.label || '—'}
                  </Text>
                </View>
                <Text style={[styles.familyScore, { color: RISK_COLORS[member.risk_level] }]}>
                  {member.risk_score}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.separator} />
        </>
      )}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Cet outil est un assistant d'analyse et ne constitue pas un avis médical certifié.
        </Text>
      </View>

      <TouchableOpacity style={styles.newScanBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Text style={styles.newScanText}>Scanner un autre produit</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
        <Text style={styles.shareText}>Partager ce résultat</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { paddingBottom: 48 },

  productImage: {
    width: '100%', height: 220,
    backgroundColor: '#F2F2F7',
  },
  productImagePlaceholder: {
    width: '100%', height: 120,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center', alignItems: 'center',
  },
  placeholderText: { fontSize: 12, color: '#BDBDBD' },

  scoreCard: {
    margin: 20, borderRadius: 16, padding: 28, alignItems: 'center',
  },
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
  barLegend: {
    flexDirection: 'row', justifyContent: 'space-between',
    width: '100%', marginTop: 6,
  },
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

  disclaimer: { marginHorizontal: 24, marginVertical: 20, padding: 14, backgroundColor: '#F2F2F7', borderRadius: 10 },
  disclaimerText: { fontSize: 12, color: '#8E8E93', lineHeight: 18 },

  newScanBtn: {
    marginHorizontal: 24, backgroundColor: '#1C2B1D',
    borderRadius: 10, paddingVertical: 16, alignItems: 'center',
  },
  newScanText: { color: '#FAFAF8', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },

  shareBtn: { marginHorizontal: 24, marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  shareText: { color: '#8E8E93', fontSize: 14, letterSpacing: 0.2 },

  familyRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10,
  },
  familyAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  familyAvatarText: { fontSize: 15, fontWeight: '700' },
  familyName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1C1C1E' },
  familyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  familyBadgeText: { fontSize: 11, fontWeight: '600' },
  familyScore: { fontSize: 16, fontWeight: '700', width: 32, textAlign: 'right', letterSpacing: -0.5 },
});


