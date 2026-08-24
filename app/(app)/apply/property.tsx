import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import Stepper from '../../../src/components/Stepper';
import {
  Actions, Alert, Button, Choice, Field, Hint, Panel, Screen, SectionTitle, Select, YesNo,
} from '../../../src/components/ui';
import { useDraft } from '../../../src/services/draft';
import { APPLICANT_CATEGORY, TENURE } from '../../../src/lib/application';

/**
 * Step 3 — the property.
 *
 * Two answers here change what the application requires later: `tenure` adds a
 * proof of ownership or a lease to the document checklist, and
 * `applicantCategory` can add a death certificate, a social worker's letter or a
 * disability certificate. Both are saved before the documents step is reached, so
 * the checklist there is already correct — and the screen says so, because a list
 * that grows without explanation looks like a moving target.
 */
export default function Property() {
  const router = useRouter();
  const { error, form, set, save, completed } = useDraft();

  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const blocking = useMemo(() => {
    const found: string[] = [];
    if (!form.tenure) found.push('whether you own or rent');
    // Rates relief belongs to the owner, so a verification officer needs a name
    // to check against the deed once the applicant is not the owner themselves.
    if ((form.tenure === 'TENANT' || form.tenure === 'OCCUPIER') && !form.ownerFullName.trim()) {
      found.push("the property owner's full name");
    }
    if (form.ownsOtherProperty === null) found.push('whether you own other property');
    return found;
  }, [form.tenure, form.ownerFullName, form.ownsOtherProperty]);

  /** What the choices above will ask for at the documents step. */
  const extraDocument = useMemo(() => {
    if (form.tenure === 'OWNER') return 'proof that you own the property — a title deed, deed of sale, or a rates account in your name';
    if (form.tenure === 'TENANT') return 'a copy of your lease agreement';
    return null;
  }, [form.tenure]);

  const categoryDocument = useMemo(() => {
    switch (form.applicantCategory) {
      case 'DECEASED_ESTATE': return 'a copy of the death certificate, and a letter of authority if you are administering the estate';
      case 'CHILD_HEADED': return 'a letter from the social worker handling the household';
      case 'DISABLED': return 'a medical certificate or SASSA disability assessment';
      default: return null;
    }
  }, [form.applicantCategory]);

  const next = async () => {
    setTouched(true);
    if (blocking.length) return;

    setSaving(true);
    const ok = await save(4);
    setSaving(false);
    if (ok) router.push('/(app)/apply/income');
  };

  return (
    <>
      <Stepper current="property" completed={completed} onJump={() => router.back()} />
      <Screen>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {touched && blocking.length ? (
          <Alert tone="error">We still need {blocking.join(' and ')}.</Alert>
        ) : null}

        <Panel>
          <SectionTitle icon="home">The property</SectionTitle>

          {/* Kept as radios deliberately, against the general rule that three or
              more options belong in a dropdown. This answer adds a title deed or
              a lease to the checklist two screens later, and the alert below
              spells that out as soon as it is picked. Somebody weighing "own" vs
              "occupy" should be able to see both, and their consequence, without
              opening anything. */}
          <Choice
            label="Do you own or rent this property?"
            value={form.tenure as never}
            options={TENURE}
            onChange={(v) => set('tenure', v)}
          />

          {extraDocument ? (
            <Alert tone="info">Because of this answer, you will be asked for {extraDocument}.</Alert>
          ) : null}

          {form.tenure === 'TENANT' || form.tenure === 'OCCUPIER' ? (
            <>
              <Field
                label="Property owner's full name"
                value={form.ownerFullName}
                onChangeText={(v) => set('ownerFullName', v)}
                placeholder="Who the property actually belongs to"
                autoCapitalize="words"
                hint="Since you are not the owner, we need to know who is."
              />
              <Field
                label="Property owner's ID number"
                optional
                value={form.ownerIdNumber}
                onChangeText={(v) => set('ownerIdNumber', v)}
                placeholder="Only if you know it"
                keyboardType="number-pad"
              />
            </>
          ) : null}

          <Select
            label="Does any of this describe your household?"
            value={form.applicantCategory as never}
            options={APPLICANT_CATEGORY}
            onChange={(v) => set('applicantCategory', v)}
            hint="This decides which extra documents apply to you. Choose the closest one."
          />

          {categoryDocument ? (
            <Alert tone="info">You will also be asked for {categoryDocument}.</Alert>
          ) : null}

          <Field
            label="Ward number"
            optional
            value={form.wardNumber}
            onChangeText={(v) => set('wardNumber', v)}
            placeholder="Ward 7"
            autoCapitalize="words"
            hint="If you are not sure, leave it blank — the municipality will fill it in."
          />
        </Panel>

        <Panel>
          <SectionTitle icon="file-text">Your municipal account</SectionTitle>

          <Field
            label="Municipal account number"
            optional
            value={form.municipalAccountNumber}
            onChangeText={(v) => set('municipalAccountNumber', v)}
            placeholder="900123456"
            keyboardType="number-pad"
            hint="From the top of your municipal bill. This is where the relief will be applied."
          />

          <Field
            label="Eskom account number"
            optional
            value={form.eskomAccountNumber}
            onChangeText={(v) => set('eskomAccountNumber', v)}
            placeholder="If Eskom bills you directly for electricity"
            keyboardType="number-pad"
          />

          {/* Length-checked only on the server. South African meter numbering is
              not uniform enough to enforce a format without rejecting real
              meters, so the app does not pretend otherwise. */}
          <Field
            label="Water meter number"
            optional
            value={form.waterMeterNumber}
            onChangeText={(v) => set('waterMeterNumber', v)}
            placeholder="From the meter itself, or your bill"
          />

          <Field
            label="Electricity meter number"
            optional
            value={form.electricityMeterNumber}
            onChangeText={(v) => set('electricityMeterNumber', v)}
            placeholder="From the meter box, or your prepaid slip"
          />
        </Panel>

        <Panel>
          <SectionTitle icon="home">Other property</SectionTitle>

          <YesNo
            label="Do you or anyone in the household own any other property?"
            value={form.ownsOtherProperty}
            onChange={(v) => set('ownsOtherProperty', v)}
            hint="Including a house, a stand, or land anywhere in South Africa."
          />

          {form.ownsOtherProperty === true ? (
            <Field
              label="Tell us about it"
              value={form.otherPropertyDetails}
              onChangeText={(v) => set('otherPropertyDetails', v)}
              placeholder="Where it is, and who owns it"
              multiline
              hint="Owning other property does not automatically disqualify you. The assessment officer looks at the whole household."
            />
          ) : null}
        </Panel>

        <Actions>
          <Button title="Save and continue" onPress={next} loading={saving} />
        </Actions>

        <Hint>Answer as accurately as you can. A verification officer will check these against the property.</Hint>
      </Screen>
    </>
  );
}
