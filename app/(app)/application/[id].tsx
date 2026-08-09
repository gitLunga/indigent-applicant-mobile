import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../../src/components/Icon';
import ProgressTrail, { Stage } from '../../../src/components/ProgressTrail';
import {
  Alert, Badge, Button, EmptyState, Hint, Loading, Panel, SectionTitle,
} from '../../../src/components/ui';
import api, { friendlyError } from '../../../src/services/api';
import { dateZA, STATUS_LABEL } from '../../../src/lib/application';
import { colors, font, radius, space, statusTone, tracking, type } from '../../../src/theme';

/**
 * One application, as the household is allowed to see it.
 *
 * Built around a single question — where has this got to — because that is the
 * only reason anybody opens this screen. The progress trail is the whole of the
 * top half; the paperwork sits beneath it for the rarer visit where somebody
 * wants to check what they sent.
 *
 * The timeline endpoint already filters for applicants: they are told a
 * municipal official acted, never which one. Nothing is filtered here, because a
 * filter applied in the client is not a protection — it is a hope.
 */

type Timeline = {
  status: string;
  reference: string | null;
  stages: Stage[];
  nextAction: { label: string; detail: string; to: string | null } | null;
  events: { at: string; label: string; by: string; detail?: string }[];
  documents: { required: number; uploaded: number; rejected: number };
  reviewNotes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
};

/** What the current status means, said plainly and without jargon. */
const HEADLINE: Record<string, { title: string; body: string }> = {
  DRAFT: {
    title: 'Not sent yet',
    body: 'Nothing happens until you send it. Everything you have filled in has been saved.',
  },
  PENDING: {
    title: 'With the municipality',
    body: 'There is nothing you need to do unless we ask you for something. You will get an SMS at each stage.',
  },
  APPROVED: {
    title: 'Approved',
    body: 'Your household is on the indigent register. The relief will be applied to your municipal account.',
  },
  DECLINED: {
    title: 'Not approved',
    body: 'The reasons are below. If your circumstances change, you may apply again.',
  },
};

export default function ApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/applications/${id}/timeline`);
      setTimeline(res.data.data);
      setError(null);
    } catch (err) {
      setError(friendlyError(err, 'We could not load that application.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading label="Checking where it has got to…" />;

  if (error || !timeline) {
    return (
      <ScrollView contentContainerStyle={s.content}>
        <Alert tone="error">{error ?? 'We could not find that application.'}</Alert>
      </ScrollView>
    );
  }

  const headline = HEADLINE[timeline.status] ?? HEADLINE.PENDING;
  const docs = timeline.documents;
  const outstanding = Math.max(0, (docs?.required ?? 0) - (docs?.uploaded ?? 0));

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
      {/*
        The answer, before anything else.
        Dark card so it reads as a statement of record rather than as one panel
        among several — this is the thing they came for.
      */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <Badge tone={statusTone(timeline.status)}>
            {STATUS_LABEL[timeline.status] ?? timeline.status}
          </Badge>
          {timeline.reference ? <Text style={s.heroRef}>{timeline.reference}</Text> : null}
        </View>

        <Text style={s.heroTitle}>{headline.title}</Text>
        <Text style={s.heroBody}>{headline.body}</Text>

        <View style={s.heroFacts}>
          <View style={s.fact}>
            <Text style={s.factLabel}>Sent</Text>
            <Text style={s.factValue}>{dateZA(timeline.submittedAt)}</Text>
          </View>
          <View style={s.factDivider} />
          <View style={s.fact}>
            <Text style={s.factLabel}>Decided</Text>
            <Text style={s.factValue}>{dateZA(timeline.reviewedAt)}</Text>
          </View>
        </View>
      </View>

      {/* Anything waiting on the household comes before the history — a person
          who has something to do should not have to scroll to find it. */}
      {timeline.nextAction ? (
        <Panel style={s.action}>
          <View style={s.actionHead}>
            <View style={s.actionIcon}>
              <Icon name="alert-triangle" size={16} color={colors.warning} />
            </View>
            <View style={s.flex}>
              <Text style={s.actionTitle}>{timeline.nextAction.label}</Text>
              <Text style={s.actionBody}>{timeline.nextAction.detail}</Text>
            </View>
          </View>
          {timeline.nextAction.to ? (
            <Button
              title={outstanding > 0 ? 'Add the documents' : 'Carry on with my application'}
              icon="arrow-right"
              iconAfter
              onPress={() => router.push('/(app)/apply/particulars')}
            />
          ) : null}
        </Panel>
      ) : null}

      {/* --- The progress ------------------------------------------------ */}
      <Panel>
        <SectionTitle icon="refresh">Where it has got to</SectionTitle>
        <ProgressTrail stages={timeline.stages ?? []} />
      </Panel>

      {/* --- The decision, when there is one ----------------------------- */}
      {timeline.reviewNotes ? (
        <Panel>
          <SectionTitle icon="file-text">
            {timeline.status === 'DECLINED' ? 'Why it was not approved' : 'What the municipality said'}
          </SectionTitle>
          <Text style={s.notes}>{timeline.reviewNotes}</Text>
          {timeline.status === 'DECLINED' ? (
            <Hint>
              If you believe this is wrong, or your circumstances have changed, contact your municipal office.
            </Hint>
          ) : null}
        </Panel>
      ) : null}

      {/* --- Documents --------------------------------------------------- */}
      {docs && docs.required > 0 ? (
        <Panel>
          <SectionTitle icon="paperclip">Your documents</SectionTitle>

          <View style={s.docBar}>
            <View
              style={[
                s.docFill,
                { width: `${Math.min(100, (docs.uploaded / docs.required) * 100)}%` },
                docs.rejected > 0 && s.docFillWarn,
              ]}
            />
          </View>
          <Text style={s.docCount}>
            {docs.uploaded} of {docs.required} supplied
            {docs.rejected > 0 ? ` · ${docs.rejected} need replacing` : ''}
          </Text>

          {docs.rejected > 0 ? (
            <Alert tone="warning">
              A document was not accepted. Contact your municipal office to have it replaced.
            </Alert>
          ) : null}
        </Panel>
      ) : null}

      {/* --- History ------------------------------------------------------ */}
      {Array.isArray(timeline.events) && timeline.events.length ? (
        <Panel>
          <SectionTitle icon="calendar">What has happened</SectionTitle>
          {timeline.events.map((e, i) => (
            <View key={i} style={[s.event, i === timeline.events.length - 1 && s.eventLast]}>
              <Text style={s.eventText}>{e.label}</Text>
              <Text style={s.eventWhen}>{dateZA(e.at)}</Text>
            </View>
          ))}
          <Hint>
            Officials are not named here. You can ask who handled your application from Your information.
          </Hint>
        </Panel>
      ) : (
        <EmptyState
          icon="calendar"
          title="Nothing has happened yet"
          body="Steps appear here as your application moves through the municipality."
        />
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: space.base, paddingBottom: space.xxl * 2 },
  flex: { flex: 1 },

  // --- Hero ----------------------------------------------------------------
  hero: {
    backgroundColor: colors.navy900,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.base,
  },
  heroTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: space.sm, marginBottom: space.md,
  },
  heroRef: {
    fontFamily: font.bold, fontSize: type.hint, color: colors.slate300,
    letterSpacing: tracking.overline,
  },
  heroTitle: {
    fontFamily: font.extraBold, fontSize: type.h1, color: colors.white,
    letterSpacing: tracking.display, marginBottom: space.xs,
  },
  heroBody: { fontFamily: font.regular, fontSize: type.body, color: colors.slate300, lineHeight: 23 },

  heroFacts: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: space.lg, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)',
  },
  fact: { flex: 1 },
  factDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.12)' },
  factLabel: {
    fontFamily: font.medium, fontSize: 11, color: colors.slate400,
    textTransform: 'uppercase', letterSpacing: tracking.overline,
  },
  factValue: { fontFamily: font.semibold, fontSize: type.body, color: colors.white, marginTop: 2 },

  // --- Next action ---------------------------------------------------------
  action: { borderColor: colors.warningLine, backgroundColor: colors.warningSoft },
  actionHead: { flexDirection: 'row', gap: space.md, marginBottom: space.base },
  actionIcon: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: colors.warningLine,
    alignItems: 'center', justifyContent: 'center',
  },
  actionTitle: { fontFamily: font.bold, fontSize: type.body, color: colors.ink },
  actionBody: { fontFamily: font.regular, fontSize: type.hint, color: colors.inkSoft, lineHeight: 19, marginTop: 2 },

  notes: { fontFamily: font.regular, fontSize: type.body, color: colors.inkSoft, lineHeight: 24 },

  // --- Documents -----------------------------------------------------------
  docBar: {
    height: 6, borderRadius: radius.pill,
    backgroundColor: colors.slate200, overflow: 'hidden', marginBottom: space.sm,
  },
  docFill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.success },
  docFillWarn: { backgroundColor: colors.warning },
  docCount: { fontFamily: font.medium, fontSize: type.hint, color: colors.inkSoft, marginBottom: space.sm },

  // --- Events --------------------------------------------------------------
  event: {
    paddingVertical: space.sm,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  eventLast: { borderBottomWidth: 0 },
  eventText: { fontFamily: font.medium, fontSize: type.label, color: colors.ink },
  eventWhen: { fontFamily: font.regular, fontSize: type.small, color: colors.inkMute, marginTop: 2 },
});
