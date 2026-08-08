import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Stepper from '../../../src/components/Stepper';
import {
  Actions, Alert, Button, CheckRow, Choice, Field, Hint, Loading, Panel, Screen, SectionTitle,
} from '../../../src/components/ui';
import { useDraft } from '../../../src/services/draft';
import api, { friendlyError } from '../../../src/services/api';
import {
  cellNumberProblem, EMPLOYER_DETAILS_NEEDED, EMPLOYMENT_STATUS, identityFromIdNumber,
  idNumberProblem, MARITAL_STATUS, postalProblems, SEX, sexFromIdNumber, TITLES,
} from '../../../src/lib/application';
import { colors, radius, space, type, weight } from '../../../src/theme';

/**
 * Step 1 — Applicant particulars.
 *
 * The field order is the one the municipality asked for and it is deliberate:
 * title, then name, then the ID number, then sex read back from it. Asking for a
 * date of birth after an ID number that already contains one is asking the same
 * question twice and giving the answers a chance to disagree.
 *
 * Employment comes last, and asks *whether* somebody is employed before asking
 * anything about an employer. On the old form an unemployed person met three
 * questions they could not answer and had to work out that they did not apply.
 */
export default function Particulars() {
  const router = useRouter();
  const { loading, error, form, set, save, applicationId } = useDraft();

  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [titleOpen, setTitleOpen] = useState(false);

  const identity = useMemo(() => identityFromIdNumber(form.idNumber), [form.idNumber]);
  const derivedSex = useMemo(() => sexFromIdNumber(form.idNumber), [form.idNumber]);
  const idProblem = idNumberProblem(form.idNumber);
  const cellProblem = cellNumberProblem(form.cellNumber);
  const postalIssues = postalProblems(form);

  const needsEmployer = EMPLOYER_DETAILS_NEEDED.includes(form.employmentStatus);

  /** What must be answered before this step can be left. */
  const blocking = useMemo(() => {
    const found: string[] = [];
    if (!form.surname.trim()) found.push('your surname');
    if (!form.names.trim()) found.push('your name');
    if (!form.idNumber.trim()) found.push('your ID number');
    if (!form.cellNumber.trim()) found.push('your cell number');
    if (!form.residentialAddress.trim()) found.push('where you live');
    if (!form.employmentStatus) found.push('whether you are employed');
    return found;
  }, [form]);

  const problem = idProblem || cellProblem || postalIssues[0] || null;

  /**
   * Capture the property's location from the device.
   *
   * Optional, and the screen says so. A household can refuse and still apply —
   * coordinates rest on consent, not on the municipality's statutory powers, and
   * a form that will not proceed without them is collecting them under duress.
   */
  const useMyLocation = async () => {
    setLocationNote(null);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationNote('Location permission was not given. You can type your address instead.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      set('addressLatitude', String(position.coords.latitude));
      set('addressLongitude', String(position.coords.longitude));
      set('addressSource', 'DEVICE');
      set('addressAccuracyM', position.coords.accuracy ? String(Math.round(position.coords.accuracy)) : '');

      setLocationNote(
        `Location captured, accurate to about ${Math.round(position.coords.accuracy ?? 0)} m. `
        + 'Please still type your address so a verification officer can find the gate.'
      );
    } catch (err) {
      setLocationNote('We could not read your location. You can type your address instead.');
    } finally {
      setLocating(false);
    }
  };

  /** Look the typed address up, so the pin matches what was written. */
  const verifyAddress = async () => {
    if (!form.residentialAddress.trim()) return;
    setLocationNote(null);
    setLocating(true);
    try {
      const res = await api.get('/geocode/search', { params: { q: form.residentialAddress } });
      const first = res.data?.data?.[0];
      if (!first) {
        setLocationNote('We could not find that address. You can still continue — an officer will confirm it on site.');
        return;
      }
      set('addressLatitude', String(first.latitude));
      set('addressLongitude', String(first.longitude));
      set('addressFormatted', first.formatted ?? '');
      set('addressSource', 'SEARCH');
      setLocationNote(`Found: ${first.formatted ?? 'a match for that address'}`);
    } catch {
      setLocationNote('The address lookup is unavailable. You can still continue.');
    } finally {
      setLocating(false);
    }
  };

  const next = async () => {
    setTouched(true);
    if (blocking.length || problem) return;

    setSaving(true);
    const ok = await save(2);
    setSaving(false);
    if (ok) router.push('/(app)/apply/verify');
  };

  if (loading) return <Screen scroll={false}><Loading label="Opening your application…" /></Screen>;

  if (error && !applicationId) {
    return (
      <Screen>
        <Alert tone="error">{error}</Alert>
      </Screen>
    );
  }

  return (
    <>
      <Stepper current="particulars" />
      <Screen>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {touched && blocking.length ? (
          <Alert tone="error">We still need {blocking.join(', ')}.</Alert>
        ) : null}

        <Panel>
          <SectionTitle>About you</SectionTitle>

          {/* Title: suggestions, not a fixed list. Any list is too short for the
              titles people actually use, and getting somebody's title wrong on a
              municipal letter is a small insult that costs nothing to avoid. */}
          <Field
            label="Title"
            value={form.title}
            onChangeText={(v) => set('title', v)}
            placeholder="Mr, Mrs, Ms, Dr…"
            maxLength={20}
            autoCapitalize="words"
          />
          <View style={s.chips}>
            {TITLES.slice(0, titleOpen ? TITLES.length : 5).map((t) => (
              <Pressable
                key={t}
                onPress={() => set('title', t)}
                style={({ pressed }) => [s.chip, form.title === t && s.chipOn, pressed && s.chipPressed]}
              >
                <Text style={[s.chipText, form.title === t && s.chipTextOn]}>{t}</Text>
              </Pressable>
            ))}
            {!titleOpen ? (
              <Pressable onPress={() => setTitleOpen(true)} style={s.chip}>
                <Text style={s.chipText}>More…</Text>
              </Pressable>
            ) : null}
          </View>

          <Field label="Surname" value={form.surname} onChangeText={(v) => set('surname', v)}
            placeholder="Mthembu" autoCapitalize="words" />

          <Field label="Name(s)" value={form.names} onChangeText={(v) => set('names', v)}
            placeholder="Grace Nomsa" autoCapitalize="words" />

          <Field
            label="ID number"
            value={form.idNumber}
            onChangeText={(v) => set('idNumber', v.replace(/\D/g, '').slice(0, 13))}
            placeholder="13-digit ID number"
            keyboardType="number-pad"
            maxLength={13}
            error={idProblem}
          />

          {/* Read back from the thirteen digits rather than asked again. Showing
              them also catches a mistyped digit here, rather than at verification
              when an officer is standing at the gate. */}
          {identity ? (
            <View style={s.derived}>
              <View style={s.derivedItem}>
                <Text style={s.derivedLabel}>Date of birth</Text>
                <Text style={s.derivedValue}>{identity.dateOfBirth}</Text>
              </View>
              <View style={s.derivedItem}>
                <Text style={s.derivedLabel}>Age</Text>
                <Text style={s.derivedValue}>{identity.age}</Text>
              </View>
              <Text style={s.derivedNote}>Read from your ID number. If this is wrong, check the digits.</Text>
            </View>
          ) : null}

          {/* Filled in from the ID, and changeable: the sequence digits record
              sex as registered at birth, which is the right default and wrong for
              some people. */}
          <Choice
            label="Sex"
            value={form.sex as '' | 'FEMALE' | 'MALE'}
            options={SEX.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => set('sex', v)}
            hint={
              derivedSex && form.sex && derivedSex !== form.sex
                ? `Your ID number indicates ${derivedSex === 'FEMALE' ? 'female' : 'male'}. We will record what you selected.`
                : 'Filled in from your ID number. Change it if it is wrong.'
            }
          />

          <Choice
            label="Marital status"
            value={form.maritalStatus as never}
            options={MARITAL_STATUS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => set('maritalStatus', v)}
          />

          <Field
            label="Cell number"
            value={form.cellNumber}
            onChangeText={(v) => set('cellNumber', v)}
            placeholder="082 123 4567"
            keyboardType="phone-pad"
            error={cellProblem}
            hint="You will verify this on the next step. The municipality sends updates here."
          />
        </Panel>

        {/* --- Where you live ------------------------------------------- */}
        <Panel>
          <SectionTitle>Where you live</SectionTitle>

          <Field
            label="Residential address"
            value={form.residentialAddress}
            onChangeText={(v) => set('residentialAddress', v)}
            placeholder="4512 Extension 3, Sebokeng"
            multiline
            autoCapitalize="words"
            hint="If your home has no street address, describe how to find it — a shop, a school, or a landmark nearby."
          />

          <View style={s.locationRow}>
            <Button title="Use my location" variant="outline" small onPress={useMyLocation}
              disabled={locating} style={s.flex} />
            <Button title="Check address" variant="outline" small onPress={verifyAddress}
              disabled={locating || !form.residentialAddress.trim()} style={s.flex} />
          </View>

          {locating ? (
            <View style={s.locating}>
              <ActivityIndicator size="small" color={colors.brand} />
              <Text style={s.locatingText}>Working…</Text>
            </View>
          ) : null}

          {form.addressLatitude && form.addressLongitude ? (
            <View style={s.pin}>
              <Text style={s.pinText}>
                Location saved: {Number(form.addressLatitude).toFixed(5)}, {Number(form.addressLongitude).toFixed(5)}
              </Text>
              <Pressable
                onPress={() => {
                  set('addressLatitude', '');
                  set('addressLongitude', '');
                  set('addressAccuracyM', '');
                  set('addressSource', '');
                  setLocationNote('Location removed. Your application is not affected.');
                }}
                hitSlop={8}
              >
                <Text style={s.pinRemove}>Remove</Text>
              </Pressable>
            </View>
          ) : null}

          {locationNote ? <Hint>{locationNote}</Hint> : null}

          <Hint>
            Giving your location is optional. It only helps an officer find the property for a verification
            visit, and you can apply without it.
          </Hint>
        </Panel>

        {/* --- Postal address ------------------------------------------- */}
        <Panel>
          <SectionTitle>Postal address</SectionTitle>

          <CheckRow
            label="My postal address is the same as my residential address"
            checked={form.postalSameAsResidential}
            onChange={(v) => set('postalSameAsResidential', v)}
          />

          {/* Hidden rather than disabled. Most households give the same address,
              and five greyed-out boxes still read as five things left undone.
              Nothing is copied into them either — one answer on file cannot fall
              out of step with itself when somebody moves. */}
          {!form.postalSameAsResidential ? (
            <>
              <Field
                label="Street address, PO Box or Private Bag"
                value={form.postalLine1}
                onChangeText={(v) => set('postalLine1', v)}
                placeholder="4512 Extension 3, or PO Box 1183"
                autoCapitalize="words"
              />
              <Field
                label="Complex, unit or farm name"
                optional
                value={form.postalLine2}
                onChangeText={(v) => set('postalLine2', v)}
                placeholder="Unit 14, Protea Court"
                autoCapitalize="words"
              />
              <Field
                label="Suburb or township"
                value={form.postalSuburb}
                onChangeText={(v) => set('postalSuburb', v)}
                placeholder="Sebokeng"
                autoCapitalize="words"
              />
              <Field
                label="Town or city"
                value={form.postalCity}
                onChangeText={(v) => set('postalCity', v)}
                placeholder="Vanderbijlpark"
                autoCapitalize="words"
              />
              <Field
                label="Postal code"
                value={form.postalCode}
                onChangeText={(v) => set('postalCode', v.replace(/\D/g, '').slice(0, 4))}
                placeholder="1900"
                keyboardType="number-pad"
                maxLength={4}
                error={form.postalCode && form.postalCode.length !== 4
                  ? 'A South African postal code is four digits.' : null}
              />
            </>
          ) : null}
        </Panel>

        {/* --- Employment ----------------------------------------------- */}
        <Panel>
          <SectionTitle>Employment</SectionTitle>

          <Choice
            label="Are you employed?"
            value={form.employmentStatus as never}
            options={EMPLOYMENT_STATUS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => set('employmentStatus', v)}
          />

          {needsEmployer ? (
            <>
              <Field
                label={form.employmentStatus === 'SELF_EMPLOYED' ? 'Name of your business' : 'Name of employer'}
                value={form.employerName}
                onChangeText={(v) => set('employerName', v)}
                placeholder="Acme Foundry"
                autoCapitalize="words"
              />
              <Field
                label={form.employmentStatus === 'SELF_EMPLOYED' ? 'Business address' : "Employer's address"}
                value={form.employerAddress}
                onChangeText={(v) => set('employerAddress', v)}
                placeholder="1 Works Road, Vanderbijlpark"
                autoCapitalize="words"
              />
              <Field
                label="Work telephone number"
                optional
                value={form.workTelNumber}
                onChangeText={(v) => set('workTelNumber', v)}
                placeholder="016 100 2000"
                keyboardType="phone-pad"
              />
            </>
          ) : form.employmentStatus ? (
            <Hint>
              No employer details are needed. You will be asked about any money the household receives on a
              later step.
            </Hint>
          ) : null}
        </Panel>

        <Actions>
          <Button title="Save and continue" onPress={next} loading={saving} />
        </Actions>

        <Hint>Your answers are saved each time you continue, so you can stop and come back.</Hint>
      </Screen>
    </>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: -space.sm, marginBottom: space.base },
  chip: {
    paddingHorizontal: space.md, paddingVertical: space.sm,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong,
    backgroundColor: colors.surface, minHeight: 36, justifyContent: 'center',
  },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  chipPressed: { opacity: 0.7 },
  chipText: { fontSize: type.hint, color: colors.inkSoft },
  chipTextOn: { color: colors.brand, fontWeight: weight.semibold },

  derived: {
    flexDirection: 'row', flexWrap: 'wrap', gap: space.lg,
    padding: space.md, marginTop: -space.sm, marginBottom: space.base,
    backgroundColor: colors.slate50,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
  },
  derivedItem: { minWidth: 96 },
  derivedLabel: { fontSize: type.small, color: colors.inkMute, textTransform: 'uppercase', letterSpacing: 0.5 },
  derivedValue: { fontSize: type.body, fontWeight: weight.semibold, color: colors.ink },
  derivedNote: { width: '100%', fontSize: type.hint, color: colors.inkMute },

  locationRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.sm },
  locating: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  locatingText: { fontSize: type.hint, color: colors.inkMute },

  pin: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: space.md, marginBottom: space.sm,
    backgroundColor: colors.successSoft,
    borderWidth: 1, borderColor: colors.successLine, borderRadius: radius.md,
  },
  pinText: { flex: 1, fontSize: type.hint, color: colors.success },
  pinRemove: { fontSize: type.hint, color: colors.danger, fontWeight: weight.medium },
});
