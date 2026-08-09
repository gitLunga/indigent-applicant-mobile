import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Icon, { IconName } from '../../src/components/Icon';
import {
  Alert, Badge, Button, Hint, Panel, SectionTitle, Skeleton,
} from '../../src/components/ui';
import { Application, statusSummary, useApplication } from '../../src/services/application';
import { useAuth } from '../../src/services/auth';
import { dateZA, STATUS_LABEL } from '../../src/lib/application';
import { colors, font, radius, space, statusTone, tracking, type } from '../../src/theme';

/**
 * Where somebody lands, and what they came to find out.
 *
 * One question dominates every visit — "what is happening with my application?"
 * — so that answer is the whole top of the screen, in words rather than a status
 * code. Everything else is beneath it.
 *
 * The applications themselves come from the shared context rather than a fetch
 * of this screen's own, so the drawer's status block and this screen cannot
 * disagree about what is happening.
 */

const STAGE_WORDS: Record<string, string> = {
  NOT_SUBMITTED: 'Not sent yet',
  VERIFICATION: 'A verification officer is checking your details',
  ASSESSMENT: 'An assessment officer is working out whether you qualify',
  SUPERVISOR_SIGNOFF: 'Waiting for a supervisor to sign it off',
  COMPLETE: 'Finished',
};

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { applications, unread, loading, error, refresh } = useApplication();

  const [refreshing, setRefreshing] = useState(false);

  // Refreshed on every return, so coming back from the wizard shows the new state.
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const draft = applications.find((a) => a.status === 'DRAFT');
  const live = applications.find((a) => a.status === 'PENDING');
  const decided = applications.filter((a) => a.status === 'APPROVED' || a.status === 'DECLINED');
  const current: Application | undefined = live ?? decided[0] ?? draft;

  if (loading) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.content}>
        <Skeleton height={28} width="50%" style={s.skeletonGap} />
        <Panel>
          <Skeleton height={22} width="35%" />
          <Skeleton height={18} width="70%" />
          <Skeleton height={54} />
        </Panel>
        <Panel>
          <Skeleton height={16} width="45%" />
          <Skeleton height={16} width="60%" />
        </Panel>
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
          onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}
          tintColor={colors.brand}
        />
      )}
    >
      <Text style={s.greeting}>
        {user?.firstName ? `Hello, ${user.firstName}` : 'Hello'}
      </Text>
      <Text style={s.greetingSub}>Here is where your application has got to.</Text>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {/* --- The one thing they came for ------------------------------- */}
      {!current ? (
        <Panel>
          <SectionTitle icon="edit">You have not applied yet</SectionTitle>
          <Text style={s.body}>
            Indigent support can reduce or cover your water, electricity, refuse and sanitation charges. The
            application is free and takes about fifteen minutes.
          </Text>
          <Button
            title="Start my application"
            icon="arrow-right"
            iconAfter
            onPress={() => router.push('/(app)/apply/particulars')}
          />
        </Panel>
      ) : (
        <StatusCard
          application={current}
          onContinue={() => router.push('/(app)/apply/particulars')}
          onOpen={() => router.push(`/(app)/application/${current.id}`)}
        />
      )}

      {/* --- Everything else ------------------------------------------ */}
      <View style={s.tiles}>
        <Tile
          icon="applications"
          title="My applications"
          note={applications.length === 1 ? '1 application' : `${applications.length} applications`}
          onPress={() => router.push('/(app)/applications')}
        />
        <Tile
          icon="file"
          title="Documents"
          note="What you have sent us"
          onPress={() => router.push('/(app)/documents')}
        />
        <Tile
          icon="bell"
          title="Messages"
          note={unread ? `${unread} unread` : 'Nothing new'}
          highlight={unread > 0}
          onPress={() => router.push('/(app)/notifications')}
        />
        <Tile
          icon="shield"
          title="Your information"
          note="What the municipality holds"
          onPress={() => router.push('/(app)/my-information')}
        />
      </View>

      <View style={s.warn}>
        <Icon name="alert-circle" size={17} color={colors.inkMute} />
        <Hint>
          Applying is free. The municipality will never ask you to pay for an indigent application, and no
          official should ever ask you for money to process it.
        </Hint>
      </View>
    </ScrollView>
  );
}

/** The status hero: badge, plain-language line, what to do next. */
function StatusCard({
  application, onContinue, onOpen,
}: {
  application: Application;
  onContinue: () => void;
  onOpen: () => void;
}) {
  const status = application.status;
  const summary = statusSummary(application);

  return (
    <View style={s.hero}>
      <LinearGradient colors={[colors.navy900, colors.navy700]} style={s.heroTop}>
        <View style={s.heroHead}>
          <Badge tone={statusTone(status)}>{STATUS_LABEL[status] ?? status}</Badge>
          {application.reference ? (
            <Text style={s.reference}>{application.reference}</Text>
          ) : null}
        </View>

        {status === 'DRAFT' ? (
          <>
            <Text style={s.heroLine}>Your application is saved but not sent.</Text>
            <View style={s.progressRow}>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${summary.progress}%` }]} />
              </View>
              <Text style={s.progressText}>{summary.progress}%</Text>
            </View>
          </>
        ) : (
          <Text style={s.heroLine}>
            {status === 'PENDING'
              ? STAGE_WORDS[application.approvalStage ?? ''] ?? 'Your application is being looked at'
              : status === 'APPROVED'
                ? 'Your household is on the indigent register.'
                : 'Your application was not approved.'}
          </Text>
        )}
      </LinearGradient>

      <View style={s.heroBody}>
        {status === 'DRAFT' ? (
          <>
            <Text style={s.body}>
              Nothing happens until you send it. You can pick up where you left off — everything you have
              filled in is still there.
            </Text>
            <Button title="Carry on with my application" icon="arrow-right" iconAfter onPress={onContinue} />
          </>
        ) : status === 'PENDING' ? (
          <>
            <Text style={s.body}>
              Sent {dateZA(application.submittedAt)}. You will get an SMS at each stage — there is nothing you
              need to do unless the municipality asks you for something.
            </Text>
            <Button title="See the details" variant="outline" onPress={onOpen} />
          </>
        ) : status === 'APPROVED' ? (
          <>
            <Text style={s.body}>
              Approved {dateZA(application.reviewedAt)}.
              {application.expiresAt
                ? ` This needs to be renewed by ${dateZA(application.expiresAt)} — the municipality will remind you.`
                : ''}
            </Text>
            <Button title="See the details" variant="outline" onPress={onOpen} />
          </>
        ) : (
          <>
            <Text style={s.body}>
              Decided {dateZA(application.reviewedAt)}. The reasons are on the application. If your
              circumstances change, you may apply again.
            </Text>
            <Button title="See the reasons" variant="outline" onPress={onOpen} />
          </>
        )}
      </View>
    </View>
  );
}

function Tile({
  icon, title, note, onPress, highlight,
}: { icon: IconName; title: string; note: string; onPress: () => void; highlight?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [s.tile, highlight && s.tileOn, pressed && s.tilePressed]}
    >
      <View style={[s.tileIcon, highlight && s.tileIconOn]}>
        <Icon name={icon} size={18} color={highlight ? colors.brand : colors.slate500} strokeWidth={1.9} />
      </View>
      <Text style={s.tileTitle}>{title}</Text>
      <Text style={[s.tileNote, highlight && s.tileNoteOn]}>{note}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: space.base, paddingBottom: space.xxl * 2 },
  skeletonGap: { marginBottom: space.base },

  greeting: {
    fontSize: type.h1, fontFamily: font.extraBold, color: colors.ink,
    letterSpacing: tracking.display,
  },
  greetingSub: {
    fontSize: type.label, fontFamily: font.regular, color: colors.inkMute,
    marginTop: 2, marginBottom: space.lg,
  },

  // --- Status hero ---------------------------------------------------------
  hero: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
    marginBottom: space.base,
  },
  heroTop: { padding: space.base },
  heroHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: space.sm, marginBottom: space.md,
  },
  reference: { fontSize: type.hint, fontFamily: font.bold, color: colors.slate300 },
  heroLine: {
    fontSize: type.h3, fontFamily: font.bold, color: colors.white,
    lineHeight: 24, letterSpacing: tracking.heading,
  },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.base },
  progressTrack: {
    flex: 1, height: 6, borderRadius: radius.pill,
    backgroundColor: colors.navy600, overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.brand },
  progressText: { fontSize: type.hint, fontFamily: font.bold, color: colors.slate300 },

  heroBody: { padding: space.base, backgroundColor: colors.surface },
  body: {
    fontSize: type.body, fontFamily: font.regular, color: colors.inkSoft,
    lineHeight: 24, marginBottom: space.base,
  },

  // --- Tiles ---------------------------------------------------------------
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.base },
  tile: {
    flexGrow: 1, flexBasis: '47%',
    padding: space.md, minHeight: 108,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg,
  },
  tileOn: { borderColor: colors.brandBorder, backgroundColor: colors.brandSoft },
  tilePressed: { opacity: 0.7 },
  tileIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.slate100,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space.sm,
  },
  tileIconOn: { backgroundColor: colors.white },
  tileTitle: { fontSize: type.label, fontFamily: font.bold, color: colors.ink },
  tileNote: { fontSize: type.hint, fontFamily: font.regular, color: colors.inkMute, marginTop: 2 },
  tileNoteOn: { color: colors.brand, fontFamily: font.semibold },

  warn: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', paddingHorizontal: space.xs },
});
