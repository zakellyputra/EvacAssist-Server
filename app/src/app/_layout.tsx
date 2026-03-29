import React from 'react';
import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#C62828',
    onPrimary: '#FFFFFF',
    primaryContainer: '#FFCDD2',
    onPrimaryContainer: '#7F0000',
    secondary: '#1565C0',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#BBDEFB',
    surface: '#FFFFFF',
    background: '#F0F2F5',
  },
};

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen
          name="request"
          options={{
            title: 'Request Evacuation',
            headerStyle: { backgroundColor: '#C62828' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          }}
        />
      </Stack>
    </PaperProvider>
  );
}
