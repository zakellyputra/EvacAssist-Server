import React from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';

export default function RootLayout() {
  return (
    <PaperProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'EvacAssist', headerShown: false }} />
        <Stack.Screen name="request" options={{ title: 'Request Evacuation' }} />
        {/* <Stack.Screen name="trip/[id]" options={{ title: 'Trip' }} /> */}
        {/* <Stack.Screen name="scan" options={{ title: 'Scan QR Code' }} /> */}
      </Stack>
    </PaperProvider>
  );
}