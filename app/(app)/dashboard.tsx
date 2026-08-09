import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Icon from '../../src/components/Icon';
import { Alert, Badge, Button, Hint, Loading, Panel } from '../../src/components/ui';
import api, { friendlyError } from '../../src/services/api';
import { useAuth } from '../../src/services/auth';
import { completedSteps, dateZA, formFromApplication, STATUS_LABEL } from '../../src/lib/application';
import { WIZARD_STEPS } from '../../src/components/Stepper';
import { colors, font, radius, space, statusTone, tracking, type } from '../../src/theme';

/**
 * Where somebody lands, and what they came to find out.
 *
 * One question dominates every visit — what is happening with my application —
 * so the answer takes the whole top of the screen, in words rather than a status
 * code. Everything else sits beneath it and stays quiet.
 *
 * The card changes shape with the state rather than showing the same layout with
 * different text. A half-finished application needs a progress bar and a way
 * back in; one under review needs a stage and reassurance that nothing is
 * expected of them; an approved one needs its renewal date. Those are three
 * different things to say, so they look like three different things.
 */

type Application = {
  id: string;
  reference: string | null;
  status: string;
  approvalStage?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  documents?: { status: string; importance: string; requirementGroup: string | null }[];
};

/** What each approval stage means to the household, never naming an officer. */
const STAGE_WORDS: Record<string, string> = {
  VERIFICATION: 'An officer is checking the details you gave us',
  ASSESSMENT: 'We are working out whether your household qualifies',
  SUPERVISOR_SIGNOFF: 'Waiting for a supervisor to make the final decision',
  COMPLETE: 'Finished',
};

const daysUntil = (value?: string | null) => {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
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
      // The count endpoint rather than the whole inbox: this runs on every return
      // to the screen, and counting unread rows client-side means downloading
      // every message somebody has ever had to render one number.
      const [mine, count] = await Promise.all([
        api.get('/applications/mine'),
        api.get('/notifications/unread-count').catch(() => null),
      ]);
      setApplications(mine.data.data ?? []);
      setUnread(Number(count?.data?.data?.unreadCount ?? 0));
    } catch (err) {
      setError(friendlyError(err, 'We could not load your application just now.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
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
      <View style={s.greetRow}>
        <View style={s.flex}>
          <Text style={s.overline}>Indigent support</Text>
          <Text style={s.greeting}>{user?.firstName ? `Hello, ${user.firstName}` : 'Hello'}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/notifications')}
          hitSlop={10}
          style={s.bell}
          accessibilityLabel={unread ? `${unread} unread messages` : 'Messages'}
        >
          <Icon name="bell" size={20} color={colors.ink} />
          {unread > 0 ? (
            <View style={s.bellDot}>
              <Text style={s.bellCount}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {!current ? <NotStarted onStart={() => router.push('/(app)/apply/particulars')} />
        : current.status === 'DRAFT' ? <DraftCard app={current} onResume={() => router.push('/(app)/apply/particulars')} />
          : current.status === 'PENDING' ? <PendingCard app={current} onOpen={() => router.push(`/(app)/application/${current.id}`)} />
            : current.status === 'APPROVED' ? <ApprovedCard app={current} onOpen={() => router.push(`/(app)/application/${current.id}`)} />
              : <DeclinedCard app={current} onOpen={() => router.push(`/(app)/application/${current.id}`)} />}

      <Text style={s.groupLabel}>More</Text>
      <View style={s.tiles}>
        <Tile icon="applications" title="My applications"
          note={applications.length === 1 ? '1 application' : `${applications.length} applications`}
          onPress={() => router.push('/(app)/applications')} />
        <Tile icon="file" title="Documents" note="What you have sent"
          onPress={() => router.push('/(app)/documents')} />
        <Tile icon="shield" title="Your information" note="What we hold about you"
          onPress={() => router.push('/(app)/my-information')} />
        <Tile icon="user" title="My profile" note="Details and password"
          onPress={() => router.push('/(app)/profile')} />
      </View>

      <Pressable onPress={() => signOut(null)} hitSlop={10} style={s.signOut}>
        <Icon name="logout" size={15} color={colors.brand} />
        <Text style={s.signOutText}>Sign out</Text>
      </Pressable>

      <Hint>
        Applying is free. The municipality will never ask you to pay for an indigent application, and no official
        should ever ask you for money to process it.
      </Hint>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// The state cards
// ---------------------------------------------------------------------------

function NotStarted({ onStart }: { onStart: () => void }) {
  return (
    <View style={s.hero}>
      <Text style={s.heroTitle}>Apply for help with your bill</Text>
      <Text style={s.heroBody}>
        Indigent support can reduce or cover your water, electricity, refuse and sanitation charges. It is free to
        apply and takes about fifteen minutes.
      </Text>

      <View style={s.pointList}>
        {[
          'You can stop and come back — it saves as you go',
          'Photograph your documents with this phone',
          'You will get an SMS at every stage',
        ].map((point) => (
          <View key={point} style={s.point}>
            <Icon name="check" size={14} color={colors.white} strokeWidth={3} />
            <Text style={s.pointText}>{point}</Text>
          </View>
        ))}
      </View>

      <Button title="Start my application" icon="arrow-right" iconAfter onPress={onStart} />
    </View>
  );
}

/**
 * A draft, with how far along it is.
 *
 * The bar counts steps genuinely finished, not screens visited — the same
 * measure the wizard's own stepper uses, so the two can never disagree about
 * how much is left.
 */
function DraftCard({ app, onResume }: { app: Application; onResume: () => void }) {
  const done = completedSteps(formFromApplication(app as never), app.documents ?? []);
  const total = WIZARD_STEPS.length;
  const pct = Math.round((done.length / total) * 100);

  return (
    <Panel style={s.card}>
      <View style={s.cardHead}>
        <Badge tone="draft">Not sent yet</Badge>
        <Text style={s.cardMeta}>Started {dateZA(app.createdAt)}</Text>
      </View>

      <Text style={s.cardTitle}>Your application is saved</Text>
      <Text style={s.cardBody}>
        Nothing happens until you send it. Pick up exactly where you left off.
      </Text>

      <View style={s.progressRow}>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${Math.max(4, pct)}%` }]} />
        </View>
        <Text style={s.progressText}>{done.length} of {total}</Text>
      </View>

      <Button title="Carry on" icon="arrow-right" iconAfter onPress={onResume} />
    </Panel>
  );
}

function PendingCard({ app, onOpen }: { app: Application; onOpen: () => void }) {
  return (
    <Panel style={s.card}>
      <View style={s.cardHead}>
        <Badge tone="pending">Being decided</Badge>
        {app.reference ? <Text style={s.cardMeta}>{app.reference}</Text> : null}
      </View>

      <Text style={s.cardTitle}>
        {STAGE_WORDS[app.approvalStage ?? ''] ?? 'Your application is being looked at'}
      </Text>
      <Text style={s.cardBody}>
        Sent {dateZA(app.submittedAt)}. There is nothing you need to do unless we ask you for something.
      </Text>

      <Button title="See where it has got to" variant="outline" icon="arrow-right" iconAfter onPress={onOpen} />
    </Panel>
  );
}

function ApprovedCard({ app, onOpen }: { app: Application; onOpen: () => void }) {
  const days = daysUntil(app.expiresAt);
  const dueSoon = days !== null && days <= 60;

  return (
    <Panel style={{ ...s.card, ...s.cardApproved }}>
      <View style={s.cardHead}>
        <Badge tone="approved">Approved</Badge>
        {app.reference ? <Text style={s.cardMeta}>{app.reference}</Text> : null}
      </View>

      <Text style={s.cardTitle}>You are on the indigent register</Text>
      <Text style={s.cardBody}>
        Approved {dateZA(app.reviewedAt)}. The relief is applied to your municipal account.
      </Text>

      {/* Renewal is the one thing that can quietly go wrong later, so it is
          stated rather than left to an SMS nobody kept. */}
      {app.expiresAt ? (
        <View style={[s.renewal, dueSoon && s.renewalSoon]}>
          <Icon name="calendar" size={15} color={dueSoon ? colors.warning : colors.success} />
          <Text style={[s.renewalText, dueSoon && s.renewalTextSoon]}>
            {dueSoon
              ? `Needs renewing by ${dateZA(app.expiresAt)} — ${days} days left`
              : `Valid until ${dateZA(app.expiresAt)}`}
          </Text>
        </View>
      ) : null}

      <Button title="See the details" variant="outline" icon="arrow-right" iconAfter onPress={onOpen} />
    </Panel>
  );
}

function DeclinedCard({ app, onOpen }: { app: Application; onOpen: () => void }) {
  return (
    <Panel style={s.card}>
      <View style={s.cardHead}>
        <Badge tone="declined">Not approved</Badge>
        {app.reference ? <Text style={s.cardMeta}>{app.reference}</Text> : null}
      </View>

      <Text style={s.cardTitle}>Your application was not approved</Text>
      <Text style={s.cardBody}>
        Decided {dateZA(app.reviewedAt)}. The reasons are on the application. If your circumstances change, you
        may apply again.
      </Text>

      <Button title="See the reasons" variant="outline" icon="arrow-right" iconAfter onPress={onOpen} />
    </Panel>
  );
}

function Tile({
  icon, title, note, onPress,
}: { icon: never | string; title: string; note: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.tile, pressed && s.tilePressed]}>
      <View style={s.tileIcon}>
        <Icon name={icon as never} size={17} color={colors.brand} />
      </View>
      <Text style={s.tileTitle}>{title}</Text>
      <Text style={s.tileNote}>{note}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: space.base, paddingBottom: space.xxl * 2 },
  flex: { flex: 1 },

  greetRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  overline: {
    fontFamily: font.bold, fontSize: 11, color: colors.brand,
    textTransform: 'uppercase', letterSpacing: tracking.overline,
  },
  greeting: {
    fontFamily: font.extraBold, fontSize: type.h1, color: colors.ink,
    letterSpacing: tracking.display, marginTop: 2,
  },
  bell: {
    width: 42, height: 42, borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.canvas,
  },
  bellCount: { fontFamily: font.bold, fontSize: 10, color: colors.white },

  // --- Hero, for somebody who has not applied ------------------------------
  hero: {
    backgroundColor: colors.navy900,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.lg,
  },
  heroTitle: {
    fontFamily: font.extraBold, fontSize: type.h1, color: colors.white,
    letterSpacing: tracking.display, marginBottom: space.sm,
  },
  heroBody: { fontFamily: font.regular, fontSize: type.body, color: colors.slate300, lineHeight: 23 },
  pointList: { marginVertical: space.lg, gap: space.sm },
  point: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pointText: { flex: 1, fontFamily: font.regular, fontSize: type.label, color: colors.slate200 },

  // --- Status cards --------------------------------------------------------
  card: { marginBottom: space.lg },
  cardApproved: { borderColor: colors.successLine },
  cardHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: space.sm, marginBottom: space.md,
  },
  cardMeta: { fontFamily: font.medium, fontSize: type.hint, color: colors.inkMute },
  cardTitle: {
    fontFamily: font.bold, fontSize: type.h3, color: colors.ink,
    letterSpacing: tracking.heading, lineHeight: 24, marginBottom: space.xs,
  },
  cardBody: {
    fontFamily: font.regular, fontSize: type.label, color: colors.inkSoft,
    lineHeight: 22, marginBottom: space.base,
  },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.base },
  progressTrack: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.slate200, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.brand },
  progressText: { fontFamily: font.bold, fontSize: type.hint, color: colors.inkSoft },

  renewal: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    padding: space.md, marginBottom: space.base,
    backgroundColor: colors.successSoft,
    borderWidth: 1, borderColor: colors.successLine, borderRadius: radius.md,
  },
  renewalSoon: { backgroundColor: colors.warningSoft, borderColor: colors.warningLine },
  renewalText: { flex: 1, fontFamily: font.medium, fontSize: type.hint, color: colors.success },
  renewalTextSoon: { color: colors.warning },

  // --- Tiles ---------------------------------------------------------------
  groupLabel: {
    fontFamily: font.bold, fontSize: 11, color: colors.inkMute,
    textTransform: 'uppercase', letterSpacing: tracking.overline, marginBottom: space.sm,
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  tile: {
    flexGrow: 1, flexBasis: '47%',
    padding: space.md, minHeight: 104,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg,
  },
  tilePressed: { opacity: 0.7 },
  tileIcon: {
    width: 34, height: 34, borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space.sm,
  },
  tileTitle: { fontFamily: font.semibold, fontSize: type.label, color: colors.ink },
  tileNote: { fontFamily: font.regular, fontSize: type.small, color: colors.inkMute, marginTop: 2 },

  signOut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    paddingVertical: space.md, marginBottom: space.sm,
  },
  signOutText: { fontFamily: font.medium, fontSize: type.label, color: colors.brand },
});
