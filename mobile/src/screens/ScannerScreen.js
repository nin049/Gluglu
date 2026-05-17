import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { productsAPI } from '../api';

export default function ScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data: barcode }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const { data } = await productsAPI.scan(barcode);
      navigation.navigate('Product', { result: data });
    } catch (err) {
      const msg = err.response?.data?.error || 'Produit introuvable ou erreur réseau';
      Alert.alert('Erreur', msg, [
        { text: 'Réessayer', onPress: () => { setScanned(false); setLoading(false); } },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.noPermText}>📷 Accès à la caméra refusé</Text>
        <Text style={styles.noPermSub}>Autorise l'accès dans les réglages de ton téléphone</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.hint}>
            {loading ? '⏳ Analyse en cours...' : 'Pointe la caméra sur le code-barres'}
          </Text>
        </View>
      </CameraView>

      {scanned && !loading && (
        <TouchableOpacity style={styles.resetBtn} onPress={() => setScanned(false)}>
          <Text style={styles.resetText}>🔄 Scanner un autre produit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  noPermText: { fontSize: 18, fontWeight: '700', color: '#333', textAlign: 'center' },
  noPermSub: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanArea: {
    width: 260, height: 180, position: 'relative',
  },
  corner: {
    position: 'absolute', width: 30, height: 30,
    borderColor: '#4CAF50', borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint: { color: '#fff', marginTop: 24, fontSize: 14, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  resetBtn: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#2E7D32', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30 },
  resetText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
