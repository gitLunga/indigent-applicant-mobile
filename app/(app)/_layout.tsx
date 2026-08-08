import React from 'react';
import { Stack } from 'expo-router';
import { colors, type, weight } from '../../src/theme';

/**
 * Everything behind a session.
 *
 * A plain stack rather than tabs. The applicant's job here is linear — apply,
 * then wait, then respond if asked — and a tab bar would give equal weight to
 * five destinations when only one matters at a time.
 */
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy900 },
        headerTintColor: colors.white,
        headerTitleStyle: { fontSize: type.h3, fontWeight: weight.semibold },
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: 'My application' }} />
      <Stack.Screen name="applications" options={{ title: 'My applications' }} />
      <Stack.Screen name="application/[id]" options={{ title: 'Application' }} />
      <Stack.Screen name="profile" options={{ title: 'My profile' }} />
      <Stack.Screen name="my-information" options={{ title: 'Your information' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="change-password" options={{ title: 'Change your password', headerBackVisible: false }} />
      <Stack.Screen name="apply" options={{ headerShown: false }} />
    </Stack>
  );
}
