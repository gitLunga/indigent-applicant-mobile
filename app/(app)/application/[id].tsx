import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Alert, Badge, Hint, Loading, Panel, Screen, SectionTitle } from '../../../src/components/ui';
import api, { friendlyError } from '../../../src/services/api';
import { dateZA, STATUS_LABEL } from '../../../src/lib/application';
import { colors, font, space, statusTone, type } from '../../../src/theme';

/**
 * One application, as the household is allowed to see it.
 *
 * The timeline endpoint already filters for applicants: they are told that a
 * municipal official acted, never which one. Nothing is filtered here, because a
 * client-side filter is not a protection — it is a hope.
 */
export default function ApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [timeline, setTimeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/applications/${id}/timeline`);
      setTimeline(res.data.data);
    } catch (err) {
      setError(friendlyError(err, 'We could not load that application.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;
  if (error) return <Screen><Alert tone="error">{error}</Alert></Screen>;
  if (!timeline) return <Screen><Alert tone="error">We could not find that application.</Alert></Screen>;

  return (
    <Screen>
      <Panel>
        <View style={s.head}>
          <Badge tone={statusTone(timeline.status)}>
            {STATUS_LABEL[timeline.status] ?? timeline.status}
          </Badge>
          {timeline.reference ? <Text style={s.reference}>{timeline.reference}</Text> : null}
        </View>

        {timeline.nextAction ? <Alert tone="info">{timeline.nextAction}</Alert> : null}

        <View style={s.dates}>
          <Text style={s.date}>Sent: {dateZA(timeline.submittedAt)}</Text>
          <Text style={s.date}>Decided: {dateZA(timeline.reviewedAt)}</Text>
        </View>
      </Panel>

      {timeline.reviewNotes ? (
        <Panel>
          <SectionTitle icon="info">What the municipality said</SectionTitle>
          <Text style={s.notes}>{timeline.reviewNotes}</Text>
        </Panel>
      ) : null}

      {Array.isArray(timeline.stages) && timeline.stages.length ? (
        <Panel>
          <SectionTitle icon="applications">Where it has been</SectionTitle>
          {timeline.stages.map((stage: any, i: number) => (
            <View key={stage.key ?? i} style={s.stage}>
              <View style={[s.pip, stage.done && s.pipDone, stage.current && s.pipNow]} />
              <View style={s.flex}>
                <Text style={[s.stageName, stage.current && s.stageNow]}>{stage.label}</Text>
                {stage.description ? <Text style={s.stageNote}>{stage.description}</Text> : null}
              </View>
            </View>
          ))}
        </Panel>
      ) : null}

      {Array.isArray(timeline.documents) && timeline.documents.length ? (
        <Panel>
          <SectionTitle icon="file">Your documents</SectionTitle>
          {timeline.documents.map((d: any, i: number) => (
            <View key={i} style={s.docRow}>
              <Text style={s.docName}>{d.name ?? d.label}</Text>
              <Badge tone={d.supplied || d.status === 'Uploaded' ? 'approved' : 'pending'}>
                {d.supplied || d.status === 'Uploaded' ? 'Supplied' : 'Outstanding'}
              </Badge>
            </View>
          ))}
        </Panel>
      ) : null}

      {Array.isArray(timeline.events) && timeline.events.length ? (
        <Panel>
          <SectionTitle icon="calendar">What has happened</SectionTitle>
          {timeline.events.map((e: any, i: number) => (
            <View key={i} style={s.event}>
              <Text style={s.eventText}>{e.label ?? e.what ?? e.action}</Text>
              <Text style={s.eventWhen}>{dateZA(e.at ?? e.createdAt)}</Text>
            </View>
          ))}
        </Panel>
      ) : null}

      <Hint>
        Officials are not named here. If you need to know who handled your application, you can ask for that
        from Your information on the dashboard.
      </Hint>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.md },
  reference: { fontSize: type.hint, color: colors.inkMute, fontFamily: font.medium },
  dates: { gap: space.xs },
  date: { fontFamily: font.regular, fontSize: type.label, color: colors.inkSoft },
  notes: { fontFamily: font.regular, fontSize: type.body, color: colors.inkSoft, lineHeight: 24 },

  stage: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  pip: { width: 12, height: 12, borderRadius: 6, marginTop: 5, backgroundColor: colors.slate300 },
  pipDone: { backgroundColor: colors.success },
  pipNow: { backgroundColor: colors.brand },
  stageName: { fontFamily: font.semibold, fontSize: type.body, color: colors.ink },
  stageNow: { fontFamily: font.semibold },
  stageNote: { fontFamily: font.regular, fontSize: type.hint, color: colors.inkMute, marginTop: 2, lineHeight: 18 },

  docRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: space.sm, paddingVertical: space.sm,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  docName: { fontFamily: font.medium, flex: 1, fontSize: type.label, color: colors.ink },

  event: { paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  eventText: { fontFamily: font.regular, fontSize: type.label, color: colors.ink },
  eventWhen: { fontFamily: font.regular, fontSize: type.small, color: colors.inkMute, marginTop: 2 },
});
