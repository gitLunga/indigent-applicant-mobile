import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Button, Field, Hint } from '../../src/components/ui';
import { useAuth } from '../../src/services/auth';
import { friendlyError } from '../../src/services/api';
import { cellNumberProblem, identityFromIdNumber, idNumberProblem } from '../../src/lib/application';
import { colors, font, radius, space, type } from '../../src/theme';

/**
 * Create an account.
 *
 * Deliberately short. This is not the application — it is only enough to have
 * somewhere to save one, and every extra field here is a household that gives up
 * before starting. Everything else is asked inside the form, where it can be
 * saved a step at a time.
 */
export default function Register() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', cellNumber: '', idNumber: '', password: '', confirm: '',
  });
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const idProblem = useMemo(() => idNumberProblem(form.idNumber), [form.idNumber]);
  const cellProblem = useMemo(() => cellNumberProblem(form.cellNumber), [form.cellNumber]);
  const identity = useMemo(() => identityFromIdNumber(form.idNumber), [form.idNumber]);

  const submit = async () => {
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Please give your first name and surname.');
      return;
    }
    if (!form.email.trim()) {
      setError('Please give an email address.');
      return;
    }
    // Both are required now. The cell number is how every decision reaches the
    // household and has to be verified before an application can be started;
    // the ID number is what the register is keyed on.
    if (!form.idNumber.trim()) { setError('Please give your 13-digit ID number.'); return; }
    if (idProblem) { setError(idProblem); return; }
    if (!form.cellNumber.trim()) { setError('Please give your cell number. We send a verification code to it.'); return; }
    if (cellProblem) { setError(cellProblem); return; }
    if (form.password !== form.confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        cellNumber: form.cellNumber.trim(),
        idNumber: form.idNumber.replace(/\D/g, ''),
        password: form.password,
      });
      // The gate in the root layout takes it from here.
    } catch (err) {
      // The API's own wording covers the cases that matter — a duplicate ID
      // number, a weak password, an address already registered.
      setError(friendlyError(err, 'We could not create your account. Please check your details.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={s.flex}
        contentContainerStyle={[s.content, { paddingTop: insets.top + space.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.brand}>
          <View style={s.mark}><Text style={s.markText}>IR</Text></View>
          <Text style={s.brandName}>Indigent Register</Text>
        </View>

        <Text style={s.title}>Create your account</Text>
        <Text style={s.lede}>
          This takes a minute. You can start your application afterwards and finish it whenever you like — it
          saves as you go.
        </Text>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <Field label="First name" value={form.firstName} onChangeText={set('firstName')}
          placeholder="Grace" autoCapitalize="words" />

        <Field label="Surname" value={form.lastName} onChangeText={set('lastName')}
          placeholder="Mthembu" autoCapitalize="words" />

        <Field label="Email address" value={form.email} onChangeText={set('email')}
          placeholder="you@example.com" keyboardType="email-address" autoComplete="email" />

        <Field
          label="Cell number"
          value={form.cellNumber}
          onChangeText={set('cellNumber')}
          placeholder="082 123 4567"
          keyboardType="phone-pad"
          error={cellProblem}
          hint="We send a verification code here. You will need it before you can apply."
        />

        <Field
          label="ID number"
          value={form.idNumber}
          onChangeText={(v) => set('idNumber')(v.replace(/\D/g, '').slice(0, 13))}
          placeholder="13-digit ID number"
          keyboardType="number-pad"
          maxLength={13}
          error={idProblem}
          hint={
            identity
              ? `Born ${identity.dateOfBirth}, age ${identity.age}. We read this from your ID number.`
              : 'We use this to work out your date of birth, so you do not have to enter it again.'
          }
        />

        <Field label="Password" value={form.password} onChangeText={set('password')}
          placeholder="Choose a password" secureTextEntry={!show} autoComplete="new-password" />

        <Field label="Confirm password" value={form.confirm} onChangeText={set('confirm')}
          placeholder="Type it again" secureTextEntry={!show} autoComplete="new-password" />

        <Pressable onPress={() => setShow((v) => !v)} hitSlop={10} style={s.reveal}>
          <Text style={s.revealText}>{show ? 'Hide passwords' : 'Show passwords'}</Text>
        </Pressable>

        <Button title="Create account" onPress={submit} loading={busy} />

        <Pressable onPress={() => router.replace('/(auth)/sign-in')} hitSlop={10} style={s.back}>
          <Text style={s.link}>I already have an account</Text>
        </Pressable>

        <Hint>
          The municipality uses your details only to decide your application. You can see everything held about
          you, and ask for it to be corrected, from your profile once you are signed in.
        </Hint>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxl * 2, backgroundColor: colors.canvas, flexGrow: 1 },

  brand: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  mark: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center',
  },
  markText: { color: colors.white, fontFamily: font.bold, fontSize: type.label },
  brandName: { fontSize: type.h3, fontFamily: font.semibold, color: colors.ink },

  title: { fontSize: type.h1, fontFamily: font.semibold, color: colors.ink, marginBottom: space.sm },
  lede: { fontFamily: font.regular, fontSize: type.body, color: colors.inkSoft, lineHeight: 24, marginBottom: space.lg },

  reveal: { alignSelf: 'flex-start', marginTop: -space.sm, marginBottom: space.base },
  revealText: { fontSize: type.hint, color: colors.brand, fontFamily: font.medium },

  back: { alignSelf: 'center', marginTop: space.lg, marginBottom: space.base },
  link: { fontSize: type.label, color: colors.brand, fontFamily: font.medium },
});
