import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Badge, Button, Hint, Loading, Panel, SectionTitle } from '../../src/components/ui';
import api, { friendlyError } from '../../src/services/api';
import { useAuth } from '../../src/services/auth';
import { dateZA, STATUS_LABEL } from '../../src/lib/application';
import { colors, radius, space, statusTone, type, weight } from '../../src/theme';

/**
 * Where somebody lands, and what they came to find out.
 *
 * One question dominates every visit — "what is happening with my application?"
 * — so that answer is the whole top of the screen, in words rather than a status
 * code. Everything else is beneath it.
 */

type Application = {
  id: string;
  reference: string | null;
  status: string;
  currentStep?: number | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  expiresAt?: string | null;
  approvalStage?: string | null;
  documents?: { status: string; importance: string }[];
};

const STAGE_WORDS: Record<string, string> = {
  NOT_SUBMITTED: 'Not sent yet',
  VERIFICATION: 'A verification officer is checking your details',
  ASSESSMENT: 'An assessment officer is working out whether you qualify',
  SUPERVISOR_SIGNOFF: 'Waiting for a supervisor to sign it off',
  COMPLETE: 'Finished',
};

export default function Dashboard() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // The count endpoint rather than the whole inbox: this runs on every
      // return to the screen, and counting unread rows client-side means
      // downloading every message somebody has ever had to render one number.
      const [mine, count] = await Promise.all([
        api.get('/applications/mine'),
        api.get('/notifications/unread-count').catch(() => null),
      ]);
      setApplications(mine.data.data ?? []);
      // The API returns { data: { unreadCount } }. Named exactly, because a
      // wrong key here fails silently as a permanent zero rather than an error.
      setUnread(Number(count?.data?.data?.unreadCount ?? 0));
    } catch (err) {
      setError(friendlyError(err, 'We could not load your application just now.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refreshed on every return, so coming back from the wizard shows the new state.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const draft = applications.find((a) => a.status === 'DRAFT');
  const live = applications.find((a) => a.status === 'PENDING');
  const decided = applications.filter((a) => a.status === 'APPROVED' || a.status === 'DECLINED');
  const current = live ?? decided[0] ?? draft;

  if (loading) return <Loading label="Loading your application…" />;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={colors.brand}
        />
      }
    >
      <Text style={s.greeting}>
        {user?.firstName ? `Hello, ${user.firstName}` : 'Hello'}
      </Text>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {/* --- The one thing they came for ------------------------------- */}
      {!current ? (
        <Panel>
          <SectionTitle>You have not applied yet</SectionTitle>
          <Text style={s.body}>
            Indigent support can reduce or cover your water, electricity, refuse and sanitation charges. The
            application is free and takes about fifteen minutes.
          </Text>
          <Button title="Start my application" onPress={() => router.push('/(app)/apply/particulars')} />
        </Panel>
      ) : (
        <Panel>
          <View style={s.statusHead}>
            <Badge tone={statusTone(current.status)}>{STATUS_LABEL[current.status] ?? current.status}</Badge>
            {current.reference ? <Text style={s.reference}>{current.reference}</Text> : null}
          </View>

          {current.status === 'DRAFT' ? (
            <>
              <Text style={s.statusLine}>Your application is saved but not sent.</Text>
              <Text style={s.body}>
                Nothing happens until you send it. You can pick up where you left off — everything you have
                filled in is still there.
              </Text>
              <Button title="Carry on with my application" onPress={() => router.push('/(app)/apply/particulars')} />
            </>
          ) : current.status === 'PENDING' ? (
            <>
              <Text style={s.statusLine}>
                {STAGE_WORDS[current.approvalStage ?? ''] ?? 'Your application is being looked at'}
              </Text>
              <Text style={s.body}>
                Sent {dateZA(current.submittedAt)}. You will get an SMS at each stage — there is nothing you need
                to do unless the municipality asks you for something.
              </Text>
              <Button
                title="See the details"
                variant="outline"
                onPress={() => router.push(`/(app)/application/${current.id}`)}
              />
            </>
          ) : current.status === 'APPROVED' ? (
            <>
              <Text style={s.statusLine}>Your household is on the indigent register.</Text>
              <Text style={s.body}>
                Approved {dateZA(current.reviewedAt)}.
                {current.expiresAt
                  ? ` This needs to be renewed by ${dateZA(current.expiresAt)} — the municipality will remind you.`
                  : ''}
              </Text>
              <Button
                title="See the details"
                variant="outline"
                onPress={() => router.push(`/(app)/application/${current.id}`)}
              />
            </>
          ) : (
            <>
              <Text style={s.statusLine}>Your application was not approved.</Text>
              <Text style={s.body}>
                Decided {dateZA(current.reviewedAt)}. The reasons are on the application. If your circumstances
                change, you may apply again.
              </Text>
              <Button
                title="See the reasons"
                variant="outline"
                onPress={() => router.push(`/(app)/application/${current.id}`)}
              />
            </>
          )}
        </Panel>
      )}

      {/* --- Everything else ------------------------------------------ */}
      <View style={s.tiles}>
        <Tile
          title="My applications"
          note={applications.length === 1 ? '1 application' : `${applications.length} applications`}
          onPress={() => router.push('/(app)/applications')}
        />
        <Tile
          title="Messages"
          note={unread ? `${unread} unread` : 'Nothing new'}
          highlight={unread > 0}
          onPress={() => router.push('/(app)/notifications')}
        />
        <Tile
          title="Your information"
          note="What the municipality holds about you"
          onPress={() => router.push('/(app)/my-information')}
        />
        <Tile
          title="My profile"
          note="Your details and password"
          onPress={() => router.push('/(app)/profile')}
        />
      </View>

      <Pressable onPress={() => signOut(null)} hitSlop={10} style={s.signOut}>
        <Text style={s.signOutText}>Sign out</Text>
      </Pressable>

      <Hint>
        Applying is free. The municipality will never ask you to pay for an indigent application, and no official
        should ever ask you for money to process it.
      </Hint>
    </ScrollView>
  );
}

function Tile({
  title, note, onPress, highlight,
}: { title: string; note: string; onPress: () => void; highlight?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.tile, highlight && s.tileOn, pressed && s.tilePressed]}
    >
      <Text style={s.tileTitle}>{title}</Text>
      <Text style={[s.tileNote, highlight && s.tileNoteOn]}>{note}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: space.base, paddingBottom: space.xxl * 2 },

  greeting: { fontSize: type.h1, fontWeight: weight.semibold, color: colors.ink, marginBottom: space.base },

  statusHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: space.sm, marginBottom: space.md,
  },
  reference: { fontSize: type.hint, color: colors.inkMute, fontWeight: weight.medium },
  statusLine: { fontSize: type.h3, fontWeight: weight.semibold, color: colors.ink, marginBottom: space.sm, lineHeight: 24 },
  body: { fontSize: type.body, color: colors.inkSoft, lineHeight: 24, marginBottom: space.base },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.base },
  tile: {
    flexGrow: 1, flexBasis: '47%',
    padding: space.md, minHeight: 84,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg,
    justifyContent: 'space-between',
  },
  tileOn: { borderColor: colors.brandBorder, backgroundColor: colors.brandSoft },
  tilePressed: { opacity: 0.7 },
  tileTitle: { fontSize: type.body, fontWeight: weight.semibold, color: colors.ink },
  tileNote: { fontSize: type.hint, color: colors.inkMute, marginTop: space.xs },
  tileNoteOn: { color: colors.brand, fontWeight: weight.medium },

  signOut: { alignSelf: 'center', paddingVertical: space.md, marginBottom: space.sm },
  signOutText: { fontSize: type.label, color: colors.brand, fontWeight: weight.medium },
});
