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
import { loginDriver, ensureSession } from '../services/auth';
import AppBackButton from '../components/AppBackButton';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [driverLoading, setDriverLoading] = useState(false);
  const [passengerLoading, setPassengerLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDriverLogin() {
    if (!phone.trim() || !password.trim()) {
      setError('Please enter your phone number and password.');
      return;
    }
    setError('');
    setDriverLoading(true);
    try {
      await loginDriver(phone.trim(), password);
      router.replace('/');
    } catch (e: any) {
      setError(e.message ?? 'Login failed. Check your credentials.');
    } finally {
      setDriverLoading(false);
    }
  }

  async function handlePassengerContinue() {
    setError('');
    setPassengerLoading(true);
    try {
      await ensureSession();
      router.replace('/');
    } catch (e: any) {
      setError('Could not connect. You can still use offline mode.');
      router.replace('/');
    } finally {
      setPassengerLoading(false);
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
            <Text style={styles.brandIcon}>🚨</Text>
            <Text style={styles.brandName}>EvacAssist</Text>
            <Text style={styles.brandTagline}>Emergency Routing System</Text>
          </View>

          {/* Driver login card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Driver Login</Text>
            <Text style={styles.cardSub}>Enter your credentials to access driver mode</Text>

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
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!passwordVisible}
              autoComplete="password"
              textContentType="password"
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
                  onPress={() => setPasswordVisible(v => !v)}
                />
              }
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              mode="contained"
              onPress={handleDriverLogin}
              loading={driverLoading}
              disabled={driverLoading || passengerLoading}
              icon="steering"
              style={styles.driverBtn}
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabel}
            >
              {driverLoading ? 'Signing in…' : 'Login as Driver'}
            </Button>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Passenger shortcut */}
          <View style={styles.passengerCard}>
            <Text style={styles.passengerTitle}>Need Evacuation?</Text>
            <Text style={styles.passengerSub}>
              No account needed. Tap below to request a ride immediately.
            </Text>
            <Button
              mode="contained"
              onPress={handlePassengerContinue}
              loading={passengerLoading}
              disabled={driverLoading || passengerLoading}
              icon="car-emergency"
              style={styles.passengerBtn}
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabel}
            >
              {passengerLoading ? 'Connecting…' : 'I Need a Ride — Find Rides'}
            </Button>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D1B2A' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 20 },

  brand: { alignItems: 'center', marginBottom: 8 },
  brandIcon: { fontSize: 48 },
  brandName: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: 0.5, marginTop: 8 },
  brandTagline: { color: '#546E7A', fontSize: 13, marginTop: 4 },

  card: {
    backgroundColor: '#0F2336',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1A2E3F',
    gap: 12,
  },
  cardTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  cardSub: { color: '#78909C', fontSize: 13, marginBottom: 4 },

  input: { backgroundColor: '#0D1B2A' },

  errorText: {
    color: '#EF5350',
    fontSize: 13,
    marginTop: -4,
  },

  driverBtn: {
    borderRadius: 10,
    backgroundColor: '#C62828',
    marginTop: 4,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1A2E3F' },
  dividerText: { color: '#546E7A', fontSize: 12, fontWeight: '600' },

  passengerCard: {
    backgroundColor: '#0F2336',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1A3A5C',
    gap: 10,
    alignItems: 'center',
  },
  passengerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  passengerSub: { color: '#78909C', fontSize: 13, textAlign: 'center' },
  passengerBtn: {
    borderRadius: 10,
    backgroundColor: '#1565C0',
    width: '100%',
  },

  btnContent: { paddingVertical: 6 },
  btnLabel: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});
