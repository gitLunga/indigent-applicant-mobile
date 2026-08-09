import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Icon from '../../src/components/Icon';
import {
  Alert, Badge, Button, EmptyState, Hint, Panel, Screen, Skeleton,
} from '../../src/components/ui';
import { useApplication } from '../../src/services/application';
import { dateZA, STATUS_LABEL } from '../../src/lib/application';
import { colors, font, radius, space, statusTone, tracking, type } from '../../src/theme';

/**
 * Every application this household has made, newest first.
 *
 * Reads from the shared context rather than fetching its own copy — the same
 * list feeds the dashboard and the drawer's status block, and three fetches of
 * one endpoint is three chances for the screens to disagree.
 */
export default function Applications() {
  const router = useRouter();
  const { applications, loading, error, refresh } = useApplication();

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (loading) {
    return (
      <Screen>
        <Panel><Skeleton height={20} width="45%" /><Skeleton height={14} width="70%" /></Panel>
        <Panel><Skeleton height={20} width="45%" /><Skeleton height={14} width="70%" /></Panel>
      </Screen>
    );
  }

  return (
    <Screen>
      {error ? <Alert tone="error">{error}</Alert> : null}

      {applications.length === 0 ? (
        <EmptyState
          icon="applications"
          title="No applications yet"
          body="When you apply for indigent support, it will appear here so you can follow its progress."
          action={(
            <Button
              title="Start my application"
              icon="arrow-right"
              iconAfter
              onPress={() => router.push('/(app)/apply/particulars')}
            />
          )}
        />
      ) : (
        applications.map((a) => {
          const draft = a.status === 'DRAFT';

          return (
            <Pressable
              key={a.id}
              onPress={() => router.push(
                draft ? '/(app)/apply/particulars' : `/(app)/application/${a.id}`,
              )}
              accessibilityRole="button"
              style={({ pressed }) => [s.row, pressed && s.pressed]}
            >
              <View style={s.rowHead}>
                <Text style={s.reference}>{a.reference || 'Not sent yet'}</Text>
                <Badge tone={statusTone(a.status)}>{STATUS_LABEL[a.status] ?? a.status}</Badge>
              </View>

              <View style={s.metaRow}>
                <Icon name="calendar" size={14} color={colors.slate400} />
                <Text style={s.meta}>
                  {a.submittedAt ? `Sent ${dateZA(a.submittedAt)}` : 'Not sent yet'}
                  {a.reviewedAt ? ` · decided ${dateZA(a.reviewedAt)}` : ''}
                </Text>
              </View>

              <View style={s.foot}>
                <Text style={s.action}>
                  {draft ? 'Carry on with this application' : 'See the details'}
                </Text>
                <Icon name="chevron-right" size={17} color={colors.brand} />
              </View>
            </Pressable>
          );
        })
      )}

      <Hint>You can only have one application being decided at a time.</Hint>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: {
    padding: space.base, marginBottom: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg,
  },
  pressed: { opacity: 0.7 },
  rowHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: space.sm, marginBottom: space.sm,
  },
  reference: {
    flex: 1, fontSize: type.body, fontFamily: font.bold, color: colors.ink,
    letterSpacing: tracking.heading,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flex: 1, fontFamily: font.regular, fontSize: type.hint, color: colors.inkMute },
  foot: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  action: { flex: 1, fontSize: type.hint, fontFamily: font.semibold, color: colors.brand },
});
