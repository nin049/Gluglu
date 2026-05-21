import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  const handleRegister = async () => {
    if (!name.trim() || !username.trim() || !email.trim() || !password || !confirm)
      return Alert.alert(t.common.error, t.auth.errorEmptyFields);
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim()))
      return Alert.alert(t.common.error, t.auth.errorUsernameFormat);
    if (password !== confirm)
      return Alert.alert(t.common.error, t.auth.errorPasswordMismatch);
    if (password.length < 8)
      return Alert.alert(t.common.error, t.auth.errorPasswordLength);

    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, username.trim().toLowerCase());
    } catch (err) {
      Alert.alert(t.common.error, err.response?.data?.error || t.auth.errorRegister);
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, props) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, focused === key && styles.inputFocused]}
        placeholderTextColor="#BDBDBD"
        onFocus={() => setFocused(key)}
        onBlur={() => setFocused(null)}
        {...props}
      />
    </View>
  );

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
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>{t.auth.registerTitle}</Text>

          {field('name', t.auth.firstName, {
            value: name, onChangeText: setName, placeholder: t.auth.firstNamePlaceholder,
          })}
          {field('username', t.auth.username, {
            value: username, onChangeText: setUsername,
            placeholder: t.auth.usernamePlaceholder, autoCapitalize: 'none', autoCorrect: false,
          })}
          {field('email', t.auth.email, {
            value: email, onChangeText: setEmail,
            placeholder: t.auth.emailPlaceholder,
            keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false,
          })}
          {field('password', t.auth.password, {
            value: password, onChangeText: setPassword,
            placeholder: t.auth.passwordMinPlaceholder, secureTextEntry: true,
          })}
          {field('confirm', t.auth.confirmPassword, {
            value: confirm, onChangeText: setConfirm,
            placeholder: t.auth.passwordPlaceholder, secureTextEntry: true,
          })}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FAFAF8" />
              : <Text style={styles.btnText}>{t.auth.createAccount}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>{t.auth.alreadyAccount}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 60 },

  header: { alignItems: 'center', marginBottom: 44 },
  logoMark: { width: 36, height: 36, backgroundColor: '#1C2B1D', borderRadius: 4, marginBottom: 20 },
  brand: { fontSize: 22, fontWeight: '700', letterSpacing: 6, color: '#1C1C1E' },

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

  backBtn: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
  backBtnText: { color: '#8E8E93', fontSize: 14 },
});
