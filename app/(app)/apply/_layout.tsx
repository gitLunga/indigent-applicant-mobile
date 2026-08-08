import React from 'react';
import { Stack } from 'expo-router';
import { DraftProvider } from '../../../src/services/draft';
import { colors, type, weight } from '../../../src/theme';

/**
 * The wizard.
 *
 * DraftProvider wraps the whole group so the answers survive moving between
 * screens and the native back gesture. Loading the draft once, here, is also why
 * step two can rely on the cell number step one saved.
 */
export default function ApplyLayout() {
  return (
    <DraftProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.navy900 },
          headerTintColor: colors.white,
          headerTitleStyle: { fontSize: type.h3, fontWeight: weight.semibold },
          contentStyle: { backgroundColor: colors.canvas },
          title: 'Apply for support',
        }}
      />
    </DraftProvider>
  );
}
