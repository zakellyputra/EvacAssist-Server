import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { API_URL } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppBackButton from '../components/AppBackButton';

const AUTH_KEY = 'evacassist:auth';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [vehicle, setVehicle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup() {
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setError('Name, phone number, and password are required.');
      return;
    }
    if (password.trim().length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          password: password.trim(),
          role: 'driver',
          vehicle: vehicle.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Registration failed: ${body || response.statusText}`);
      }

      const data = await response.json();
      await AsyncStorage.setItem(
        AUTH_KEY,
        JSON.stringify({ accessToken: data.access_token, refreshToken: data.refresh_token })
      );
      router.replace('/driver');
    } catch (e: any) {
      setError(e.message ?? 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor="#0D1B2A" barStyle="light-content" />
      <AppBackButton floating fallbackHref="/" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Branding */}
          <View style={styles.brand}>
            <Text style={styles.brandIcon}>🚗</Text>
            <Text style={styles.brandName}>Driver Sign Up</Text>
            <Text style={styles.brandTagline}>Register to start helping evacuees</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <TextInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              autoComplete="name"
              textContentType="name"
              style={styles.input}
              outlineColor="#1A2E3F"
              activeOutlineColor="#C62828"
              textColor="#E0E0E0"
              theme={{ colors: { onSurfaceVariant: '#78909C', background: '#0D1B2A' } }}
              left={<TextInput.Icon icon="account" color="#78909C" />}
            />

            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              style={styles.input}
              outlineColor="#1A2E3F"
              activeOutlineColor="#C62828"
              textColor="#E0E0E0"
              theme={{ colors: { onSurfaceVariant: '#78909C', background: '#0D1B2A' } }}
              left={<TextInput.Icon icon="phone" color="#78909C" />}
            />

            <TextInput
              label="Vehicle Description (optional)"
              value={vehicle}
              onChangeText={setVehicle}
              mode="outlined"
              placeholder="e.g. Blue Toyota Camry, pickup truck"
              style={styles.input}
              outlineColor="#1A2E3F"
              activeOutlineColor="#C62828"
              textColor="#E0E0E0"
              theme={{ colors: { onSurfaceVariant: '#78909C', background: '#0D1B2A' } }}
              left={<TextInput.Icon icon="car" color="#78909C" />}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!passwordVisible}
              autoComplete="password-new"
              textContentType="newPassword"
              style={styles.input}
              outlineColor="#1A2E3F"
              activeOutlineColor="#C62828"
              textColor="#E0E0E0"
              theme={{ colors: { onSurfaceVariant: '#78909C', background: '#0D1B2A' } }}
              left={<TextInput.Icon icon="lock" color="#78909C" />}
              right={
                <TextInput.Icon
                  icon={passwordVisible ? 'eye-off' : 'eye'}
                  color="#78909C"
                  onPress={() => setPasswordVisible((v) => !v)}
                />
              }
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              mode="contained"
              onPress={handleSignup}
              loading={loading}
              disabled={loading}
              icon="account-plus"
              style={styles.signupBtn}
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabel}
            >
              {loading ? 'Creating account…' : 'Create Driver Account'}
            </Button>
          </View>

          {/* Back to login */}
          <Button
            mode="text"
            onPress={() => router.replace('/')}
            style={styles.backBtn}
            labelStyle={styles.backLabel}
          >
            Already have an account? Log in
          </Button>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D1B2A' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 16 },

  brand: { alignItems: 'center', marginBottom: 8 },
  brandIcon: { fontSize: 48 },
  brandName: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: 0.5, marginTop: 8 },
  brandTagline: { color: '#546E7A', fontSize: 13, marginTop: 4 },

  card: {
    backgroundColor: '#0F2336',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1A2E3F',
    gap: 12,
  },

  input: { backgroundColor: '#0D1B2A' },

  errorText: { color: '#EF5350', fontSize: 13 },

  signupBtn: {
    borderRadius: 10,
    backgroundColor: '#C62828',
    marginTop: 4,
  },
  btnContent: { paddingVertical: 6 },
  btnLabel: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  backBtn: { alignSelf: 'center' },
  backLabel: { color: '#78909C', fontSize: 13 },
});
