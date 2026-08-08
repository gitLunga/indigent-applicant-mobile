import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/services/auth';
import { colors, type, weight } from '../src/theme';

/**
 * The navigation shell.
 *
 * Two groups: `(auth)` for signing in and registering, `(app)` for everything
 * behind a session. The gate below moves between them, which keeps every screen
 * free of "am I allowed to be here" checks — a check that is easy to forget on
 * exactly the screen where forgetting it matters.
 */

function Gate() {
  const { user, restoring } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (restoring) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
      return;
    }

    if (user && inAuthGroup) {
      /**
       * A password issued by staff and sent over SMS has to be replaced before
       * anything else works — the API refuses every other route until it is, so
       * there is no point rendering a screen whose every request will fail.
       */
      router.replace(user.mustChangePassword ? '/(app)/change-password' : '/(app)/dashboard');
    }
  }, [user, restoring, segments, router]);

  /**
   * Nothing is rendered until the keychain has been read.
   *
   * Reading it is asynchronous, so without this the sign-in screen flashes up
   * for a moment in front of somebody who is already signed in.
   */
  if (restoring) {
    return (
      <View style={styles.splash}>
        <View style={styles.mark}>
          <ActivityIndicator color={colors.white} />
        </View>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy900 },
        headerTintColor: colors.white,
        headerTitleStyle: { fontSize: type.h3, fontWeight: weight.semibold },
        contentStyle: { backgroundColor: colors.canvas },
        // The system back arrow and gesture are what people expect; a custom
        // header button that only sometimes appears is worse than neither.
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/*
        Light text, for the navy header beneath it.
        `backgroundColor` was removed from expo-status-bar in SDK 57 — the bar is
        translucent now and takes its ground from whatever is behind it, which is
        why the header supplies the navy rather than this.
      */}
      <StatusBar style="light" />
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.navy900, alignItems: 'center', justifyContent: 'center' },
  mark: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
});
