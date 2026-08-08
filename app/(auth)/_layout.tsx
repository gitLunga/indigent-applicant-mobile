import React from 'react';
import { Stack } from 'expo-router';

/** Signing in and registering. No header — each screen carries its own brand. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
