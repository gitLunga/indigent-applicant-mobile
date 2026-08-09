import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Alert, Button, Field, Hint, Loading, Panel, Screen, SectionTitle, Select,
} from '../../src/components/ui';
import api, { friendlyError } from '../../src/services/api';
import { colors, font, radius, space, type } from '../../src/theme';

/**
 * "What do you know about me?"
 *
 * POPIA section 23 gives a household the right to be told what is held about
 * them, section 24 the right to have it corrected or deleted. This screen has to
 * actually deliver those rather than mention them.
 *
 * The response is assembled by the server in plain language — including what was
 * derived and *why*, which is the part people most often want and the part most
 * systems cannot produce. Nothing is reformatted here beyond laying it out.
 */

type Subject = {
  about: Record<string, unknown>;
  applications: Record<string, any>[];
  activityOnYourRecord?: { what: string; by: string; when: string }[];
  yourRights?: string[];
};

const REQUEST_TYPES = [
  { value: 'CORRECTION', label: 'Something you hold about me is wrong' },
  { value: 'DELETION', label: 'I want you to delete my information' },
  { value: 'OBJECTION', label: 'I object to how you are using my information' },
  { value: 'ACCESS', label: 'I want a formal written copy' },
] as const;

const human = (key: string) => key
  .replace(/([A-Z])/g, ' $1')
  .replace(/^./, (c) => c.toUpperCase())
  .replace(/\bId\b/g, 'ID')
  .trim();

export default function MyInformation() {
  const [record, setRecord] = useState<Subject | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<string>('CORRECTION');
  const [request, setRequest] = useState('');
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [mine, mineRequests] = await Promise.all([
        api.get('/privacy/my-information'),
        api.get('/privacy/my-requests').catch(() => null),
      ]);
      setRecord(mine.data.data);
      setRequests(mineRequests?.data?.data ?? []);
    } catch (err) {
      setError(friendlyError(err, 'We could not load your information just now.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lodge = async () => {
    setError(null);
    setSending(true);
    try {
      const res = await api.post('/privacy/requests', {
        type,
        request,
        correctionDetail: detail || undefined,
      });
      setSent(res.data.message);
      setRequest(''); setDetail('');
      const mineRequests = await api.get('/privacy/my-requests').catch(() => null);
      setRequests(mineRequests?.data?.data ?? []);
    } catch (err) {
      setError(friendlyError(err, 'We could not log that request.'));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Loading label="Gathering what we hold…" />;

  return (
    <Screen>
      {error ? <Alert tone="error">{error}</Alert> : null}

      {record?.about ? (
        <Panel>
          <SectionTitle icon="user">Who we think you are</SectionTitle>
          {Object.entries(record.about)
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([key, value]) => (
              <View key={key} style={s.row}>
                <Text style={s.key}>{human(key)}</Text>
                <Text style={s.value}>{String(value)}</Text>
              </View>
            ))}
        </Panel>
      ) : null}

      {(record?.applications ?? []).map((app, i) => (
        <Panel key={app.reference ?? i}>
          <SectionTitle>Application {app.reference}</SectionTitle>
          <Text style={s.muted}>{app.status}</Text>

          {app.whatYouToldUs ? (
            <>
              <Text style={s.subhead}>What you told us</Text>
              {Object.entries(app.whatYouToldUs)
                .filter(([, v]) => v !== null && v !== undefined && v !== '')
                .map(([key, value]) => (
                  <View key={key} style={s.row}>
                    <Text style={s.key}>{human(key)}</Text>
                    <Text style={s.value}>
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                    </Text>
                  </View>
                ))}
            </>
          ) : null}

          {/* Derived values carry their own explanation, which is the answer to
              "how did you get my date of birth?" */}
          {app.whatWeWorkedOut ? (
            <>
              <Text style={s.subhead}>What we worked out from that</Text>
              <Hint>We did not ask you for these. We calculated them, and this is how.</Hint>
              {Object.entries(app.whatWeWorkedOut as Record<string, any>)
                .filter(([, v]) => v?.value !== null && v?.value !== undefined)
                .map(([key, v]) => (
                  <View key={key} style={s.row}>
                    <Text style={s.key}>{human(key)}</Text>
                    <Text style={s.value}>
                      {String(v.value)}
                      <Text style={s.from}> — from {String(v.derivedFrom).toLowerCase()}</Text>
                    </Text>
                  </View>
                ))}
            </>
          ) : null}

          {app.locationHeld ? (
            <>
              <Text style={s.subhead}>Where we think you live</Text>
              <View style={s.row}>
                <Text style={s.key}>Coordinates</Text>
                <Text style={s.value}>{app.locationHeld.coordinates}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.key}>How we got them</Text>
                <Text style={s.value}>{app.locationHeld.howItWasObtained}</Text>
              </View>
            </>
          ) : null}

          {Array.isArray(app.whoHasHandledIt) && app.whoHasHandledIt.length ? (
            <>
              <Text style={s.subhead}>Who has handled your application</Text>
              {app.whoHasHandledIt.map((step: any, j: number) => (
                <Text key={j} style={s.bullet}>
                  {step.official} — {step.stage}{step.when ? ` on ${step.when}` : ''}
                </Text>
              ))}
            </>
          ) : null}

          {Array.isArray(app.externalChecksRunOnYou) && app.externalChecksRunOnYou.length ? (
            <>
              <Text style={s.subhead}>Organisations we checked your details against</Text>
              {app.externalChecksRunOnYou.map((c: any, j: number) => (
                <Text key={j} style={s.bullet}>{c.organisation} — {c.when}</Text>
              ))}
              <Hint>You agreed to these checks when you applied.</Hint>
            </>
          ) : null}

          {Array.isArray(app.householdMembersYouListed) && app.householdMembersYouListed.length ? (
            <>
              <Text style={s.subhead}>People you listed in your household</Text>
              {app.householdMembersYouListed.map((m: any, j: number) => (
                <Text key={j} style={s.bullet}>{m.name} — {m.relationship}</Text>
              ))}
              <Hint>
                Their own ID numbers and income are their information rather than yours, so they are not shown
                here.
              </Hint>
            </>
          ) : null}
        </Panel>
      ))}

      {/* --- Asking for a change ------------------------------------- */}
      <Panel>
        <SectionTitle icon="edit">Ask us to change something</SectionTitle>

        {sent ? <Alert tone="success">{sent}</Alert> : null}

        <Select
          label="What would you like us to do?"
          value={type as never}
          options={REQUEST_TYPES}
          onChange={(v) => setType(v)}
        />

        <Field
          label="Tell us more"
          value={request}
          onChangeText={setRequest}
          placeholder="e.g. My cell number changed when I moved. The one you have is my old number."
          multiline
        />

        {type === 'CORRECTION' ? (
          <Field
            label="What should it say instead?"
            value={detail}
            onChangeText={setDetail}
            placeholder="e.g. My cell number is 082 123 4567."
            multiline
          />
        ) : null}

        <Button
          title="Send the request"
          onPress={lodge}
          loading={sending}
          disabled={!request.trim() || (type === 'CORRECTION' && !detail.trim())}
        />
      </Panel>

      {requests.length ? (
        <Panel>
          <SectionTitle icon="applications">Requests you have made</SectionTitle>
          {requests.map((r) => (
            <View key={r.id} style={s.requestRow}>
              <Text style={s.value}>{r.request}</Text>
              <Text style={s.muted}>{r.status}</Text>
              {r.responseNotes ? <Text style={s.answer}>Our answer: {r.responseNotes}</Text> : null}
              {r.refusalGround ? <Text style={s.answer}>Why we refused: {r.refusalGround}</Text> : null}
            </View>
          ))}
        </Panel>
      ) : null}

      {record?.yourRights?.length ? (
        <Panel>
          <SectionTitle icon="shield">Your rights</SectionTitle>
          {record.yourRights.map((right, i) => <Text key={i} style={s.bullet}>{right}</Text>)}
        </Panel>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  key: { fontFamily: font.semibold, fontSize: type.small, color: colors.inkMute, textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontFamily: font.regular, fontSize: type.body, color: colors.ink, marginTop: 2, lineHeight: 22 },
  from: { fontFamily: font.regular, fontSize: type.hint, color: colors.inkMute },

  subhead: {
    fontSize: type.label, fontFamily: font.semibold, color: colors.ink,
    marginTop: space.base, marginBottom: space.sm,
  },
  muted: { fontFamily: font.regular, fontSize: type.hint, color: colors.inkMute },
  bullet: { fontFamily: font.regular, fontSize: type.label, color: colors.inkSoft, lineHeight: 22, marginBottom: space.xs },

  requestRow: {
    padding: space.md, marginBottom: space.sm,
    backgroundColor: colors.slate50,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
  },
  answer: { fontFamily: font.regular, fontSize: type.hint, color: colors.inkSoft, marginTop: space.xs, lineHeight: 19 },
});
