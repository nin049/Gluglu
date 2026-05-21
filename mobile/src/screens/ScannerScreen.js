import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { productsAPI } from '../api';
import { useLanguage } from '../context/LanguageContext';

export default function ScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState(null);
  const [done, setDone] = useState(false);
  const isProcessing = useRef(false);

  useFocusEffect(
    useCallback(() => {
      isProcessing.current = false;
      setLoading(false);
      setDone(false);
      setHint(null);
    }, [])
  );

  const currentHint = hint !== null ? hint : t.scanner.hint;

  const handleBarCodeScanned = useCallback(async ({ data: barcode }) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    setLoading(true);
    setHint(t.scanner.analyzing);

    try {
      const { data } = await productsAPI.scan(barcode);
      setDone(true);
      navigation.navigate('Product', { result: data });
    } catch (err) {
      const msg = err.response?.data?.error || t.scanner.notFound;
      Alert.alert(t.scanner.notFound, msg, [
        {
          text: t.common.retry, onPress: () => {
            isProcessing.current = false;
            setLoading(false);
            setDone(false);
            setHint(null);
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [navigation, t]);

  const reset = () => {
    isProcessing.current = false;
    setLoading(false);
    setDone(false);
    setHint(null);
  };

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator color="#1C2B1D" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: '#FAFAF8' }]}>
        <View style={styles.permBox}>
          <Text style={styles.permTitle}>{t.scanner.permissionTitle}</Text>
          <Text style={styles.permSub}>{t.scanner.permissionMessage}</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>{t.scanner.permissionButton}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        autofocus="on"
        zoom={0}
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
      />

      <View style={styles.overlay}>
        <View style={styles.topDim} />
        <View style={styles.middleRow}>
          <View style={styles.sideDim} />
          <View style={styles.scanWindow}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            {loading && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator color="#FAFAF8" />
              </View>
            )}
          </View>
          <View style={styles.sideDim} />
        </View>
        <View style={styles.bottomDim}>
          <Text style={styles.hint}>{currentHint}</Text>
          {done && !loading && (
            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetText}>{t.scanner.scanAnother}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const SCAN_W = 280;
const SCAN_H = 160;
const CORNER = 20;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  permBox: { paddingHorizontal: 36, alignItems: 'center' },
  permTitle: { fontSize: 20, fontWeight: '600', color: '#1C1C1E', marginBottom: 12, letterSpacing: -0.3 },
  permSub: { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  permBtn: { backgroundColor: '#1C2B1D', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32 },
  permBtnText: { color: '#FAFAF8', fontSize: 15, fontWeight: '600' },

  overlay: { ...StyleSheet.absoluteFillObject },
  topDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  middleRow: { flexDirection: 'row', height: SCAN_H },
  sideDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  scanWindow: { width: SCAN_W, height: SCAN_H, overflow: 'hidden' },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  bottomDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 32 },

  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#FAFAF8', borderWidth: 2 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },

  hint: { color: 'rgba(255,255,255,0.75)', fontSize: 13, letterSpacing: 0.3 },
  resetBtn: { marginTop: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  resetText: { color: '#FAFAF8', fontSize: 14 },
});
