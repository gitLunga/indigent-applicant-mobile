import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '../../src/components/Icon';
import { Alert, EmptyState, Panel, Skeleton } from '../../src/components/ui';
import api, { friendlyError } from '../../src/services/api';
import { useApplication } from '../../src/services/application';
import { colors, font, radius, space, tracking, type } from '../../src/theme';

/**
 * Messages from the municipality about this household's application.
 *
 * Grouped by day rather than listed flat. The common case is a burst of
 * messages when an application changes stage, and "Today / Yesterday / 14 March"
 * answers "is this new?" without anybody having to read timestamps and subtract.
 */

type Notification = {
  id: string;
  title: string;
  body?: string | null;
  readAt?: string | null;
  createdAt: string;
};

/** "Today", "Yesterday", or the date — the way people actually refer to days. */
function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}

const timeZA = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

export default function Notifications() {
  const { refresh: refreshShell } = useApplication();

  const [rows, setRows] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setRows(res.data.data ?? []);

      // Marked read on open, which is what an inbox does. A POST, not a PATCH —
      // and a failure here is harmless, so it is deliberately not awaited.
      // The shell is refreshed after, so the drawer's unread badge clears too.
      api.post('/notifications/read-all').then(() => refreshShell()).catch(() => {});
    } catch (err) {
      setError(friendlyError(err, 'We could not load your messages.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshShell]);

  useEffect(() => { load(); }, [load]);

  /** Day heading -> that day's messages, in the order the server sent them. */
  const groups = useMemo(() => {
    const map = new Map<string, Notification[]>();
    for (const row of rows) {
      const key = dayLabel(row.createdAt);
      const list = map.get(key);
      if (list) list.push(row);
      else map.set(key, [row]);
    }
    return [...map.entries()];
  }, [rows]);

  if (loading) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.content}>
        <Panel><Skeleton height={18} width="40%" /><Skeleton height={14} width="85%" /></Panel>
        <Panel><Skeleton height={18} width="55%" /><Skeleton height={14} width="70%" /></Panel>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={colors.brand}
        />
      )}
    >
      {error ? <Alert tone="error">{error}</Alert> : null}

      {rows.length === 0 ? (
        <EmptyState
          icon="bell"
          title="No messages yet"
          body="The municipality will message you here as your application moves through each stage. You will get an SMS too."
        />
      ) : (
        groups.map(([day, items]) => (
          <View key={day}>
            <Text style={s.day}>{day}</Text>

            {items.map((n) => {
              const unread = !n.readAt;
              return (
                <View key={n.id} style={[s.row, unread && s.unread]}>
                  <View style={[s.mark, unread && s.markUnread]}>
                    <Icon
                      name="bell"
                      size={16}
                      color={unread ? colors.brand : colors.slate400}
                      strokeWidth={1.9}
                    />
                  </View>

                  <View style={s.body}>
                    <View style={s.titleRow}>
                      <Text style={s.title}>{n.title}</Text>
                      {unread ? <View style={s.dot} /> : null}
                    </View>
                    {n.body ? <Text style={s.text}>{n.body}</Text> : null}
                    <Text style={s.when}>{timeZA(n.createdAt)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: space.base, paddingBottom: space.xxl * 2 },

  day: {
    fontSize: type.overline, fontFamily: font.bold, color: colors.inkMute,
    textTransform: 'uppercase', letterSpacing: tracking.overline,
    marginTop: space.md, marginBottom: space.sm,
  },

  row: {
    flexDirection: 'row', gap: space.md,
    padding: space.base, marginBottom: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: colors.brand },
  mark: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.slate100,
    alignItems: 'center', justifyContent: 'center',
  },
  markUnread: { backgroundColor: colors.brandSoft },

  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1, fontSize: type.body, fontFamily: font.bold, color: colors.ink, lineHeight: 22 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  text: {
    fontFamily: font.regular, fontSize: type.label, color: colors.inkSoft,
    lineHeight: 21, marginTop: space.xs,
  },
  when: { fontFamily: font.medium, fontSize: type.small, color: colors.inkMute, marginTop: space.sm },
});
