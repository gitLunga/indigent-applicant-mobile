import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Alert, Loading, Panel, Screen } from '../../src/components/ui';
import api, { friendlyError } from '../../src/services/api';
import { dateZA } from '../../src/lib/application';
import { colors, space, type, weight } from '../../src/theme';

/** Messages from the municipality about this household's application. */
export default function Notifications() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setRows(res.data.data ?? []);
      // Marked read on open, which is what an inbox does. A POST, not a PATCH —
      // and a failure here is harmless, so it is deliberately not awaited.
      api.post('/notifications/read-all').catch(() => {});
    } catch (err) {
      setError(friendlyError(err, 'We could not load your messages.'));
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
        <Panel><Text style={s.empty}>Nothing yet. The municipality will message you as your application moves.</Text></Panel>
      ) : (
        rows.map((n) => (
          <View key={n.id} style={[s.row, !n.readAt && s.unread]}>
            <Text style={s.title}>{n.title}</Text>
            {n.body ? <Text style={s.body}>{n.body}</Text> : null}
            <Text style={s.when}>{dateZA(n.createdAt)}</Text>
          </View>
        ))
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  empty: { fontSize: type.body, color: colors.inkMute, lineHeight: 24 },
  row: {
    padding: space.base, marginBottom: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, borderRadius: 10,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: colors.brand },
  title: { fontSize: type.body, fontWeight: weight.semibold, color: colors.ink },
  body: { fontSize: type.label, color: colors.inkSoft, lineHeight: 21, marginTop: space.xs },
  when: { fontSize: type.small, color: colors.inkMute, marginTop: space.sm },
});
