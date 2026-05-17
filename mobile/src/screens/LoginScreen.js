import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  const handleLogin = async () => {
    if (!email.trim() || !password)
      return Alert.alert('Champs manquants', 'Veuillez remplir tous les champs.');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.error || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <View style={styles.logoMark} />
          <Text style={styles.brand}>GLUGLU</Text>
          <Text style={styles.tagline}>Détection du risque gluten</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Connexion</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Adresse e-mail</Text>
            <TextInput
              style={[styles.input, focused === 'email' && styles.inputFocused]}
              value={email}
              onChangeText={setEmail}
              placeholder="exemple@domaine.com"
              placeholderTextColor="#BDBDBD"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={[styles.input, focused === 'password' && styles.inputFocused]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#BDBDBD"
              secureTextEntry
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FAFAF8" />
              : <Text style={styles.btnText}>Se connecter</Text>
            }
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Créer un compte</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 60 },

  header: { alignItems: 'center', marginBottom: 52 },
  logoMark: { width: 36, height: 36, backgroundColor: '#1C2B1D', borderRadius: 4, marginBottom: 20 },
  brand: { fontSize: 22, fontWeight: '700', letterSpacing: 6, color: '#1C1C1E' },
  tagline: { fontSize: 12, color: '#8E8E93', letterSpacing: 1, marginTop: 8, textTransform: 'uppercase' },

  form: {},
  formTitle: { fontSize: 26, fontWeight: '600', color: '#1C1C1E', marginBottom: 32, letterSpacing: -0.5 },

  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '600', color: '#8E8E93', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#1C1C1E', backgroundColor: '#FFFFFF',
  },
  inputFocused: { borderColor: '#1C2B1D' },

  btn: {
    backgroundColor: '#1C2B1D', borderRadius: 10,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#FAFAF8', fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E5EA' },
  dividerText: { color: '#BDBDBD', fontSize: 12, marginHorizontal: 12 },

  secondaryBtn: {
    borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10,
    paddingVertical: 16, alignItems: 'center',
  },
  secondaryBtnText: { color: '#1C1C1E', fontSize: 15, fontWeight: '500' },
});

