import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Stepper from '../../../src/components/Stepper';
import {
  Actions, Alert, Button, Field, Hint, Panel, Screen, SectionTitle,
} from '../../../src/components/ui';
import { useDraft } from '../../../src/services/draft';
import api, { friendlyError } from '../../../src/services/api';
import { money } from '../../../src/lib/application';
import { colors, font, radius, space, type } from '../../../src/theme';

/**
 * Step 4 — who lives here, and what the household lives on.
 *
 * The running total is shown as the figures are typed. Not as a verdict — the
 * means test belongs to the assessment officer and this screen must never imply
 * an outcome — but because a household adding up five sources of income on a
 * phone deserves to see the arithmetic they are being asked to do.
 *
 * Household members are a separate resource, so each one is saved as it is added
 * rather than with the rest of the step. Somebody adding four members at a gate
 * on a bad connection should not lose all four because the fourth failed.
 */
export default function Income() {
  const router = useRouter();
  const { error, form, set, save, applicationId, household, refreshHousehold } = useDraft();

  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [memberBusy, setMemberBusy] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [member, setMember] = useState({ fullName: '', relationship: '', age: '', income: '' });

  useEffect(() => { refreshHousehold(); }, [refreshHousehold]);

  const total = useMemo(() => {
    const parts = [form.salary, form.oldAgePension, form.disabilityPension, form.businessIncome, form.rentingIncome];
    return parts.reduce((sum, value) => sum + (Number(value) || 0), 0);
  }, [form.salary, form.oldAgePension, form.disabilityPension, form.businessIncome, form.rentingIncome]);

  /** Everyone's income, including the members listed below. */
  const householdTotal = useMemo(
    () => total + household.reduce((sum, m) => sum + (Number(m.income) || 0), 0),
    [total, household]
  );

  const people = Number(form.peopleOnProperty) || 0;
  const perPerson = people > 0 ? householdTotal / people : null;

  const blocking = useMemo(() => {
    const found: string[] = [];
    if (!form.peopleOnProperty.trim()) found.push('how many people live on the property');
    return found;
  }, [form.peopleOnProperty]);

  const addMember = async () => {
    if (!applicationId || !member.fullName.trim()) {
      setMemberError('Please give the person’s name.');
      return;
    }
    setMemberError(null);
    setMemberBusy(true);
    try {
      await api.post(`/applications/${applicationId}/household`, {
        fullName: member.fullName.trim(),
        relationship: member.relationship.trim() || undefined,
        age: member.age ? Number(member.age) : undefined,
        income: member.income ? Number(member.income) : undefined,
      });
      setMember({ fullName: '', relationship: '', age: '', income: '' });
      setAdding(false);
      await refreshHousehold();
    } catch (err) {
      setMemberError(friendlyError(err, 'We could not add that person.'));
    } finally {
      setMemberBusy(false);
    }
  };

  const removeMember = async (id: string) => {
    if (!applicationId) return;
    setMemberBusy(true);
    try {
      await api.delete(`/applications/${applicationId}/household/${id}`);
      await refreshHousehold();
    } catch (err) {
      setMemberError(friendlyError(err, 'We could not remove that person.'));
    } finally {
      setMemberBusy(false);
    }
  };

  const next = async () => {
    setTouched(true);
    if (blocking.length) return;

    setSaving(true);
    const ok = await save(5);
    setSaving(false);
    if (ok) router.push('/(app)/apply/general');
  };

  return (
    <>
      <Stepper current="income" onJump={() => router.back()} />
      <Screen>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {touched && blocking.length ? <Alert tone="error">We still need {blocking[0]}.</Alert> : null}

        <Panel>
          <SectionTitle icon="user">Who lives on the property</SectionTitle>

          <Field
            label="How many people live here in total?"
            value={form.peopleOnProperty}
            onChangeText={(v) => set('peopleOnProperty', v.replace(/\D/g, '').slice(0, 2))}
            placeholder="5"
            keyboardType="number-pad"
            hint="Count everyone, including yourself and children."
          />

          <Field
            label="How many are children under 18?"
            optional
            value={form.childrenUnder18}
            onChangeText={(v) => set('childrenUnder18', v.replace(/\D/g, '').slice(0, 2))}
            placeholder="2"
            keyboardType="number-pad"
          />

          <Field
            label="How many are pensioners over 60?"
            optional
            value={form.pensionersOver60}
            onChangeText={(v) => set('pensionersOver60', v.replace(/\D/g, '').slice(0, 2))}
            placeholder="1"
            keyboardType="number-pad"
          />
        </Panel>

        {/* --- The household roll --------------------------------------- */}
        <Panel>
          <SectionTitle icon="applications">Everyone in the household</SectionTitle>
          <Hint>
            List the other people living with you. Their details stay private — nobody in the household sees
            what another person earns.
          </Hint>

          {memberError ? <Alert tone="error">{memberError}</Alert> : null}

          {household.length === 0 ? (
            <Text style={s.empty}>Nobody added yet.</Text>
          ) : (
            <View style={s.members}>
              {household.map((m) => (
                <View key={m.id} style={s.member}>
                  <View style={s.flex}>
                    <Text style={s.memberName}>{m.fullName}</Text>
                    <Text style={s.memberMeta}>
                      {[m.relationship, m.age ? `${m.age} years` : null,
                        m.income ? money(m.income) + ' a month' : 'no income']
                        .filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeMember(m.id)} disabled={memberBusy} hitSlop={10}>
                    <Text style={s.remove}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {adding ? (
            <View style={s.addBox}>
              <Field label="Full name" value={member.fullName}
                onChangeText={(v) => setMember((m) => ({ ...m, fullName: v }))}
                placeholder="Sipho Mthembu" autoCapitalize="words" />
              <Field label="Relationship to you" optional value={member.relationship}
                onChangeText={(v) => setMember((m) => ({ ...m, relationship: v }))}
                placeholder="Son, mother, grandchild…" autoCapitalize="words" />
              <Field label="Age" optional value={member.age}
                onChangeText={(v) => setMember((m) => ({ ...m, age: v.replace(/\D/g, '').slice(0, 3) }))}
                placeholder="14" keyboardType="number-pad" />
              <Field label="Money they receive each month" optional value={member.income}
                onChangeText={(v) => setMember((m) => ({ ...m, income: v.replace(/[^\d.]/g, '') }))}
                placeholder="0" keyboardType="decimal-pad"
                hint="Including any grant. Leave blank if they receive nothing." />

              <View style={s.addActions}>
                <Button title="Cancel" variant="ghost" small onPress={() => { setAdding(false); setMemberError(null); }} />
                <Button title="Add this person" small onPress={addMember} loading={memberBusy} />
              </View>
            </View>
          ) : (
            <Button title="Add a person" variant="outline" onPress={() => setAdding(true)} />
          )}
        </Panel>

        {/* --- Income --------------------------------------------------- */}
        <Panel>
          <SectionTitle icon="money">Money coming in each month</SectionTitle>
          <Hint>
            Enter what the household actually receives each month, before any deductions. If a source does not
            apply, leave it blank.
          </Hint>

          <Field label="Salary or wages" optional value={form.salary}
            onChangeText={(v) => set('salary', v.replace(/[^\d.]/g, ''))}
            placeholder="0" keyboardType="decimal-pad" />

          <Field label="Old age pension" optional value={form.oldAgePension}
            onChangeText={(v) => set('oldAgePension', v.replace(/[^\d.]/g, ''))}
            placeholder="0" keyboardType="decimal-pad" />

          <Field label="Disability grant" optional value={form.disabilityPension}
            onChangeText={(v) => set('disabilityPension', v.replace(/[^\d.]/g, ''))}
            placeholder="0" keyboardType="decimal-pad" />

          <Field label="Money from a business or piece work" optional value={form.businessIncome}
            onChangeText={(v) => set('businessIncome', v.replace(/[^\d.]/g, ''))}
            placeholder="0" keyboardType="decimal-pad"
            hint="Including spaza takings, hairdressing, mechanics, anything run from home." />

          <Field label="Rent received" optional value={form.rentingIncome}
            onChangeText={(v) => set('rentingIncome', v.replace(/[^\d.]/g, ''))}
            placeholder="0" keyboardType="decimal-pad"
            hint="If you rent out a room or a back room." />

          <Field label="Anything else we should know about your income" optional
            value={form.incomeExclusions}
            onChangeText={(v) => set('incomeExclusions', v)}
            placeholder="For example, work that stops in winter"
            multiline />

          {/*
            The arithmetic, not a verdict.
            No mention of thresholds and no suggestion of an outcome: the means
            test is the assessment officer's, and an app that hints at "you
            qualify" undermines the decision and misleads the household.
          */}
          <View style={s.totals}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Your income</Text>
              <Text style={s.totalValue}>{money(total)}</Text>
            </View>
            {household.length ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Everyone in the household</Text>
                <Text style={s.totalValue}>{money(householdTotal)}</Text>
              </View>
            ) : null}
            {perPerson !== null ? (
              <View style={[s.totalRow, s.totalRowLast]}>
                <Text style={s.totalLabel}>Per person, across {people}</Text>
                <Text style={s.totalValue}>{money(perPerson)}</Text>
              </View>
            ) : null}
            <Text style={s.totalNote}>
              The municipality works these figures out again from what you have entered. An officer decides your
              application — nothing here is a decision.
            </Text>
          </View>
        </Panel>

        <Actions>
          <Button title="Save and continue" onPress={next} loading={saving} />
        </Actions>
      </Screen>
    </>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  empty: { fontFamily: font.regular, fontSize: type.label, color: colors.inkMute, fontStyle: 'italic', marginBottom: space.md },

  members: { gap: space.sm, marginBottom: space.base },
  member: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md,
    backgroundColor: colors.slate50,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
  },
  memberName: { fontSize: type.body, fontFamily: font.medium, color: colors.ink },
  memberMeta: { fontFamily: font.regular, fontSize: type.hint, color: colors.inkMute, marginTop: 2 },
  remove: { fontSize: type.hint, color: colors.danger, fontFamily: font.medium },

  addBox: {
    padding: space.md, marginTop: space.sm,
    backgroundColor: colors.slate50,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
  },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },

  totals: {
    marginTop: space.sm, padding: space.md,
    backgroundColor: colors.navy900, borderRadius: radius.md,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: space.sm,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  totalRowLast: { borderBottomWidth: 0 },
  totalLabel: { fontFamily: font.semibold, fontSize: type.label, color: colors.slate300 },
  totalValue: { fontSize: type.h3, fontFamily: font.semibold, color: colors.white },
  totalNote: { fontFamily: font.regular, fontSize: type.hint, color: colors.slate400, marginTop: space.sm, lineHeight: 18 },
});
