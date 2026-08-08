import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Alert, Badge, Loading, Panel, Screen, Hint } from '../../src/components/ui';
import api, { friendlyError } from '../../src/services/api';
import { dateZA, STATUS_LABEL } from '../../src/lib/application';
import { colors, space, statusTone, type, weight } from '../../src/theme';

/** Every application this household has made, newest first. */
export default function Applications() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/applications/mine');
      setRows(res.data.data ?? []);
    } catch (err) {
      setError(friendlyError(err, 'We could not load your applications.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  return (
    <Screen>
      {error ? <Alert tone="error">{error}</Alert> : null}

      {rows.length === 0 ? (
        <Panel><Text style={s.empty}>You have not made an application yet.</Text></Panel>
      ) : (
        rows.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => router.push(`/(app)/application/${a.id}`)}
            style={({ pressed }) => [s.row, pressed && s.pressed]}
          >
            <View style={s.rowHead}>
              <Text style={s.reference}>{a.reference || 'Not sent yet'}</Text>
              <Badge tone={statusTone(a.status)}>{STATUS_LABEL[a.status] ?? a.status}</Badge>
            </View>
            <Text style={s.meta}>
              {a.submittedAt ? `Sent ${dateZA(a.submittedAt)}` : `Started ${dateZA(a.createdAt)}`}
              {a.reviewedAt ? ` · decided ${dateZA(a.reviewedAt)}` : ''}
            </Text>
          </Pressable>
        ))
      )}

      <Hint>You can only have one application being decided at a time.</Hint>
    </Screen>
  );
}

const s = StyleSheet.create({
  empty: { fontSize: type.body, color: colors.inkMute },
  row: {
    padding: space.base, marginBottom: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, borderRadius: 10,
  },
  pressed: { opacity: 0.7 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  reference: { fontSize: type.body, fontWeight: weight.semibold, color: colors.ink },
  meta: { fontSize: type.hint, color: colors.inkMute, marginTop: space.xs },
});
