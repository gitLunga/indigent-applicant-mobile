import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Stepper from '../../../src/components/Stepper';
import {
  Actions, Alert, Button, CheckRow, Choice, Hint, Panel, Screen, SectionTitle, YesNo,
} from '../../../src/components/ui';
import { useDraft } from '../../../src/services/draft';
import { DIFFICULTY, FUNCTIONING_DOMAINS } from '../../../src/lib/application';
import { colors, font, radius, space, type } from '../../../src/theme';

/**
 * Step 5 — general information, consent, and the functioning questions.
 *
 * Two very different kinds of question share this screen, and the difference is
 * legal rather than cosmetic:
 *
 *  - The **consents** are preconditions. Verification cannot lawfully begin
 *    without all three, so they are required and the screen says why.
 *  - The **functioning questions** are health information under POPIA section 26,
 *    which means they rest on consent rather than on the municipality's statutory
 *    powers. They are optional, every one of them, and saying so is not a
 *    courtesy — a form that requires them is collecting special personal
 *    information without a lawful ground.
 */
export default function General() {
  const router = useRouter();
  const { error, form, set, save, completed } = useDraft();

  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const consentsGiven = form.consentSiteVisit && form.consentDataMatching && form.declarationTruthful;

  const answeredDomains = useMemo(
    () => FUNCTIONING_DOMAINS.filter((d) => form[d.field as keyof typeof form]).length,
    [form]
  );

  const next = async () => {
    setTouched(true);
    if (!consentsGiven) return;

    setSaving(true);
    const ok = await save(6);
    setSaving(false);
    if (ok) router.push('/(app)/apply/documents');
  };

  return (
    <>
      <Stepper current="general" completed={completed} onJump={() => router.back()} />
      <Screen>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {touched && !consentsGiven ? (
          <Alert tone="error">
            All three agreements below are needed before the municipality can look at your application.
          </Alert>
        ) : null}

        {/* --- General questions ---------------------------------------- */}
        <Panel>
          <SectionTitle icon="help">A few more questions</SectionTitle>

          <YesNo
            label="Do you live at this property full time?"
            value={form.isFullTimeOccupant}
            onChange={(v) => set('isFullTimeOccupant', v)}
          />

          <YesNo
            label="Do you owe the municipality money?"
            value={form.hasMunicipalArrears}
            onChange={(v) => set('hasMunicipalArrears', v)}
            hint="Owing money does not disqualify you. Indigent support often exists precisely to help with it."
          />

          {form.hasMunicipalArrears === true ? (
            <YesNo
              label="Have you made an arrangement to pay it off?"
              value={form.hasArrearsArrangement}
              onChange={(v) => set('hasArrearsArrangement', v)}
            />
          ) : null}
        </Panel>

        {/* --- Functioning ---------------------------------------------- */}
        <Panel>
          <SectionTitle icon="user">Difficulty with daily activities</SectionTitle>

          <Alert tone="info">
            These six questions are about health, so they are treated as especially private. Answering them is
            entirely your choice — you can leave every one blank and it will not affect your application. They
            help the municipality report how many households it reaches who have a disability, and spot
            households that may need extra help.
          </Alert>

          {FUNCTIONING_DOMAINS.map((domain) => (
            <Choice
              key={domain.field}
              label={domain.question}
              optional
              value={form[domain.field as keyof typeof form] as never}
              options={DIFFICULTY.map((o) => ({ value: o.value, label: o.label }))}
              onChange={(v) => set(domain.field as never, v as never)}
            />
          ))}

          {answeredDomains > 0 ? (
            <Hint>
              You have answered {answeredDomains} of {FUNCTIONING_DOMAINS.length}. You can leave the rest blank.
            </Hint>
          ) : null}
        </Panel>

        {/* --- Consent -------------------------------------------------- */}
        <Panel>
          <SectionTitle icon="check-circle">Your agreement</SectionTitle>

          <Text style={s.lede}>
            The municipality needs your permission for the checks that decide an indigent application. Without
            all three, verification cannot lawfully start.
          </Text>

          <CheckRow
            label="A municipal officer may visit my property to confirm what I have said"
            checked={form.consentSiteVisit}
            onChange={(v) => set('consentSiteVisit', v)}
            hint="An officer will call at the property. They will show identification."
          />

          <CheckRow
            label="The municipality may check my details against SARS, UIF, SASSA, credit bureaux and the deeds office"
            checked={form.consentDataMatching}
            onChange={(v) => set('consentDataMatching', v)}
            hint="Only to confirm the income and property you have declared."
          />

          <CheckRow
            label="Everything I have stated in this application is true and complete"
            checked={form.declarationTruthful}
            onChange={(v) => set('declarationTruthful', v)}
            hint="Giving false information is a criminal offence and the support can be withdrawn."
          />

          {consentsGiven ? (
            <View style={s.consented}>
              <Text style={s.consentedText}>
                Thank you. The date and time of your agreement will be recorded with your application.
              </Text>
            </View>
          ) : null}
        </Panel>

        <Actions>
          <Button title="Save and continue" onPress={next} loading={saving} />
        </Actions>

        <Hint>
          You may withdraw your agreement at any time by contacting your municipal office, though the
          application cannot be decided without it.
        </Hint>
      </Screen>
    </>
  );
}

const s = StyleSheet.create({
  lede: { fontFamily: font.regular, fontSize: type.body, color: colors.inkSoft, lineHeight: 24, marginBottom: space.base },
  consented: {
    padding: space.md,
    backgroundColor: colors.successSoft,
    borderWidth: 1, borderColor: colors.successLine, borderRadius: radius.md,
  },
  consentedText: { fontSize: type.hint, color: colors.success, lineHeight: 19, fontFamily: font.medium },
});
