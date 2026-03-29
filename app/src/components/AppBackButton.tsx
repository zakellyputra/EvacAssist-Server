import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { Href, router } from 'expo-router';

interface Props {
  fallbackHref?: Href;
  floating?: boolean;
}

export default function AppBackButton({ fallbackHref = '/', floating = false }: Props) {
  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallbackHref);
  }

  return (
    <View style={floating ? styles.floatingWrap : styles.inlineWrap}>
      <Button
        mode="contained-tonal"
        icon="arrow-left"
        onPress={handleBack}
        style={styles.button}
        labelStyle={styles.label}
        compact
      >
        Back
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  inlineWrap: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  floatingWrap: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 20,
  },
  button: {
    borderRadius: 10,
    backgroundColor: 'rgba(13, 27, 42, 0.85)',
  },
  label: {
    color: '#E3F2FD',
    fontWeight: '700',
  },
});
