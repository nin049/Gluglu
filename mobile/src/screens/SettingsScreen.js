import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n';

export default function SettingsScreen() {
  const { language, changeLanguage, t } = useLanguage();
  const [saved, setSaved] = useState(false);

  const handleSelect = async (id) => {
    await changeLanguage(id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" />

      <Text style={styles.pageTitle}>{t.settings.title}</Text>

      <Text style={styles.sectionLabel}>{t.settings.languageTitle}</Text>
      <Text style={styles.sectionSub}>{t.settings.languageSub}</Text>

      {SUPPORTED_LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.id}
          style={[styles.langCard, language === lang.id && styles.langCardActive]}
          onPress={() => handleSelect(lang.id)}
          activeOpacity={0.8}
        >
          <View style={styles.langLeft}>
            <View style={[styles.radio, language === lang.id && styles.radioActive]}>
              {language === lang.id && <View style={styles.radioDot} />}
            </View>
          </View>
          <View style={styles.langBody}>
            <Text style={[styles.langLabel, language === lang.id && styles.langLabelActive]}>
              {lang.nativeLabel}
            </Text>
            <Text style={styles.langDesc}>{t.settings.langDesc[lang.id]}</Text>
          </View>
          {language === lang.id && (
            <Text style={styles.checkMark}>✓</Text>
          )}
        </TouchableOpacity>
      ))}

      {saved && (
        <View style={styles.savedBadge}>
          <Text style={styles.savedText}>✓ {t.settings.saved}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { paddingBottom: 60 },

  pageTitle: {
    fontSize: 28, fontWeight: '700', color: '#1C1C1E',
    letterSpacing: -0.5, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24,
  },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#8E8E93',
    letterSpacing: 1.5, textTransform: 'uppercase',
    paddingHorizontal: 24, marginBottom: 6,
  },
  sectionSub: {
    fontSize: 13, color: '#8E8E93', paddingHorizontal: 24,
    marginBottom: 16, lineHeight: 18,
  },

  langCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 24, marginBottom: 10,
    backgroundColor: '#F2F2F7', borderRadius: 14,
    padding: 16, borderWidth: 1.5, borderColor: 'transparent',
  },
  langCardActive: { borderColor: '#1C2B1D', backgroundColor: '#EEF4EE' },

  langLeft: { marginRight: 12 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#BDBDBD',
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: '#1C2B1D' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1C2B1D' },

  langBody: { flex: 1 },
  langLabel: { fontSize: 15, fontWeight: '600', color: '#3A3A3C', marginBottom: 2 },
  langLabelActive: { color: '#1C2B1D' },
  langDesc: { fontSize: 12, color: '#8E8E93', lineHeight: 16 },

  checkMark: { fontSize: 16, color: '#1C2B1D', fontWeight: '700', marginLeft: 8 },

  savedBadge: {
    marginHorizontal: 24, marginTop: 16,
    backgroundColor: '#EEF4EE', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16,
    alignItems: 'center',
  },
  savedText: { fontSize: 14, fontWeight: '600', color: '#2E6B44' },
});
