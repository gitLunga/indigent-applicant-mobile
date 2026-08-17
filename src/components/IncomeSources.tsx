import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Alert, Button, CheckRow, Field, Hint, Loading, Panel, SectionTitle, Select, YesNo } from './ui';
import Icon from './Icon';
import api, { friendlyError } from '../services/api';
import { colors, font, radius, space, type } from '../theme';

/**
 * Where the household's money comes from.
 *
 * This replaced five fixed amount boxes — salary, old age pension, disability
 * grant, business, rent — which could hold five kinds of income and no more. A
 * household with two grants, or a pension and a lodger, had nowhere to record
 * the second, and on a phone that meant scrolling past three boxes that did not
 * apply to reach the one that did.
 *
 * The types and their follow-up questions come from the API, not from this
 * file. The same definitions drive the resident's web form and the councillor's
 * capture screen, so the three cannot drift — and the one used by the household
 * least able to check the result is not the one that asks least.
 */

type TypeDef = {
  value: string;
  label: string;
  hint: string;
  asks: string[];
  required: string[];
};

type Source = {
  id: string;
  type: string;
  monthlyAmount: string | number;
  label?: string;
  sentence?: string;
  jobDescription?: string | null;
  employerName?: string | null;
  businessName?: string | null;
  businessType?: string | null;
  isRegistered?: boolean | null;
  otherDetail?: string | null;
};

const FIELD_LABELS: Record<string, string> = {
  jobDescription: 'What is the work?',
  employerName: 'Who do you work for?',
  businessName: 'What is the business called?',
  businessType: 'What does the business do?',
  otherDetail: 'What is this income?',
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  jobDescription: 'Street vendor, domestic worker…',
  employerName: 'Name of your employer',
  businessName: 'Name of the business',
  businessType: 'Spaza shop, hair salon, taxi…',
  otherDetail: 'Say where this money comes from',
};

const money = (v: unknown) => `R ${Number(v || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

export default function IncomeSources({
  applicationId,
  people,
  onChange,
}: {
  applicationId: string | null;
  people?: string | number;
  onChange?: (application: Record<string, unknown>) => void;
}) {
  const [types, setTypes] = useState<TypeDef[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [declaredNone, setDeclaredNone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Partial<Source> | null>(null);

  useEffect(() => {
    api.get('/applications/income-types')
      .then((res) => setTypes(res.data.data))
      .catch(() => setTypes([]));
  }, []);

  const load = () => {
    if (!applicationId) { setLoading(false); return; }
    setLoading(true);
    api.get(`/applications/${applicationId}/income`)
      .then((res) => {
        setSources(res.data.data);
        setDeclaredNone(Boolean(res.data.declaredNoIncome));
      })
      .catch((err) => setError(friendlyError(err, 'We could not load your income details.')))
      .finally(() => setLoading(false));
  };

  useEffect(load, [applicationId]);

  const definition = (value?: string) => types.find((t) => t.value === value) || null;
  const total = sources.reduce((sum, s) => sum + Number(s.monthlyAmount || 0), 0);
  const headcount = Number(people) || 0;

  const save = async () => {
    if (!draft || !applicationId) return;
    setError(null);
    setBusy(true);
    try {
      const res = draft.id
        ? await api.patch(`/applications/${applicationId}/income/${draft.id}`, draft)
        : await api.post(`/applications/${applicationId}/income`, draft);
      setDraft(null);
      setDeclaredNone(false);
      load();
      onChange?.(res.data.application);
    } catch (err) {
      // The server names the missing follow-up in the applicant's own words —
      // "say what the work is", not "jobDescription is required".
      setError(friendlyError(err, 'We could not save that.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!applicationId) return;
    setBusy(true);
    try {
      const res = await api.delete(`/applications/${applicationId}/income/${id}`);
      load();
      onChange?.(res.data.application);
    } catch (err) {
      setError(friendlyError(err, 'We could not remove that.'));
    } finally {
      setBusy(false);
    }
  };

  const declareNone = async (declared: boolean) => {
    if (!applicationId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post(`/applications/${applicationId}/income/none`, { declared });
      setDeclaredNone(declared);
      load();
      onChange?.(res.data.application);
    } catch (err) {
      setError(friendlyError(err, 'We could not save that.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Panel><Loading label="Loading your income details…" /></Panel>;

  return (
    <Panel>
      <SectionTitle icon="money">Income</SectionTitle>
      <Hint>
        We do not assume that you work. Tell us where your household&rsquo;s money comes from — a job, a
        grant, a pension, renting out a room, or anything else.
      </Hint>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {sources.map((s) => (
        <View key={s.id} style={st.row}>
          <View style={st.rowMain}>
            <Text style={st.rowLabel}>{s.label || s.type}</Text>
            {s.sentence && s.sentence !== s.label ? (
              <Text style={st.rowDetail} numberOfLines={2}>
                {s.sentence.replace(`${s.label} — `, '')}
              </Text>
            ) : null}
          </View>
          <Text style={st.rowAmount}>{money(s.monthlyAmount)}</Text>
          <Pressable onPress={() => setDraft(s)} hitSlop={8} accessibilityLabel={`Change ${s.label}`}>
            <Icon name="edit" size={17} color={colors.slate400} />
          </Pressable>
          <Pressable onPress={() => remove(s.id)} hitSlop={8} disabled={busy} accessibilityLabel={`Remove ${s.label}`}>
            <Icon name="trash" size={17} color={colors.slate400} />
          </Pressable>
        </View>
      ))}

      {sources.length > 0 ? (
        <View style={st.total}>
          <View style={st.totalRow}>
            <Text style={st.totalLabel}>Total each month</Text>
            <Text style={st.totalValue}>{money(total)}</Text>
          </View>
          {headcount > 0 ? (
            <View style={st.totalRow}>
              <Text style={st.totalMuted}>
                Per person across {headcount} {headcount === 1 ? 'person' : 'people'}
              </Text>
              <Text style={st.totalMuted}>{money(total / headcount)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {draft ? (
        <View style={st.form}>
          <Select
            label="Where does this money come from?"
            value={(draft.type as string) || ''}
            options={types.map((t) => ({ value: t.value, label: t.label }))}
            onChange={(v) => setDraft({ id: draft.id, type: v, monthlyAmount: draft.monthlyAmount ?? '' })}
            hint={definition(draft.type)?.hint}
          />

          {(definition(draft.type)?.asks || []).map((field) => (
            field === 'isRegistered' ? (
              <YesNo
                key={field}
                label="Is the business registered?"
                optional
                hint="Both are fine. An informal business does not count against you."
                value={draft.isRegistered ?? null}
                onChange={(v) => setDraft({ ...draft, isRegistered: v })}
              />
            ) : (
              <Field
                key={field}
                label={FIELD_LABELS[field] || field}
                value={(draft as Record<string, string>)[field] || ''}
                onChangeText={(v: string) => setDraft({ ...draft, [field]: v })}
                placeholder={FIELD_PLACEHOLDERS[field] || ''}
              />
            )
          ))}

          {draft.type ? (
            <Field
              label="How much a month?"
              value={String(draft.monthlyAmount ?? '')}
              onChangeText={(v: string) => setDraft({ ...draft, monthlyAmount: v.replace(/[^\d.]/g, '') })}
              placeholder="0"
              keyboardType="decimal-pad"
              prefix="R"
            />
          ) : null}

          <Button
            title={draft.id ? 'Save changes' : 'Add this income'}
            onPress={save}
            loading={busy}
            disabled={!draft.type}
          />
          <Button title="Cancel" variant="ghost" onPress={() => { setDraft(null); setError(null); }} disabled={busy} />
        </View>
      ) : (
        <>
          <Button
            title={sources.length ? 'Add another source' : 'Add where your income comes from'}
            variant="outline"
            onPress={() => setDraft({ type: '', monthlyAmount: '' })}
            disabled={busy || !applicationId}
          />

          {/*
            A real answer, and the commonest one here — so it needs somewhere to
            be recorded. Without it an empty list means both "there is nothing"
            and "nobody has asked yet", and only one of those can be submitted.
          */}
          {sources.length === 0 ? (
            <CheckRow
              label="This household has no income at all"
              checked={declaredNone}
              onChange={declareNone}
              hint="Tick this if no one living here receives any money."
            />
          ) : null}
        </>
      )}
    </Panel>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingVertical: space.md, paddingHorizontal: space.md,
    marginBottom: space.sm,
    backgroundColor: colors.slate50,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowLabel: { fontFamily: font.semibold, fontSize: type.body, color: colors.ink },
  rowDetail: { fontFamily: font.regular, fontSize: type.hint, color: colors.inkSoft, marginTop: 2 },
  rowAmount: { fontFamily: font.semibold, fontSize: type.body, color: colors.ink },

  total: {
    marginTop: space.sm, marginBottom: space.base,
    padding: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { fontFamily: font.medium, fontSize: type.body, color: colors.ink },
  totalValue: { fontFamily: font.semibold, fontSize: type.h3, color: colors.ink },
  totalMuted: { fontFamily: font.regular, fontSize: type.hint, color: colors.inkSoft, marginTop: space.xs },

  form: {
    marginTop: space.sm,
    padding: space.md,
    backgroundColor: colors.slate50,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
  },
});
