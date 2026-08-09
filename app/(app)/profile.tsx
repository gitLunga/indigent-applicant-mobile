import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Alert, Button, Field, Hint, Panel, Screen, SectionTitle } from '../../src/components/ui';
import api, { friendlyError } from '../../src/services/api';
import { useAuth } from '../../src/services/auth';
import { colors, font, space, type } from '../../src/theme';

/** The household's own details, and the way to their privacy rights. */
export default function Profile() {
  const router = useRouter();
  const { user, patchUser, signOut, previousSignIn } = useAuth();

  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    cellNumber: user?.cellNumber ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setError(null); setSaved(false); setBusy(true);
    try {
      const res = await api.patch('/auth/me', form);
      patchUser(res.data.data ?? form);
      setSaved(true);
    } catch (err) {
      setError(friendlyError(err, 'We could not save your details.'));
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Panel>
        <SectionTitle icon="user">Your details</SectionTitle>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {saved ? <Alert tone="success">Saved.</Alert> : null}

        <Field label="First name" value={form.firstName} autoCapitalize="words"
          onChangeText={(v) => setForm((f) => ({ ...f, firstName: v }))} />
        <Field label="Surname" value={form.lastName} autoCapitalize="words"
          onChangeText={(v) => setForm((f) => ({ ...f, lastName: v }))} />
        <Field label="Cell number" value={form.cellNumber} keyboardType="phone-pad"
          onChangeText={(v) => setForm((f) => ({ ...f, cellNumber: v }))} />

        <Field label="Email address" value={user?.email ?? ''} editable={false}
          hint="Contact your municipal office to change the address on your account." />

        <Button title="Save my details" onPress={save} loading={busy} />
      </Panel>

      <Panel>
        <SectionTitle icon="lock">Security</SectionTitle>

        {/* Somebody noticing a sign-in that was not theirs is the cheapest
            account-compromise detection there is, and it costs one line. */}
        {previousSignIn ? (
          <Text style={s.line}>
            You last signed in on {new Date(previousSignIn).toLocaleString('en-ZA')}. If that was not you, change
            your password.
          </Text>
        ) : null}

        <Button title="Change my password" variant="outline"
          onPress={() => router.push('/(app)/change-password')} />
      </Panel>

      <Panel>
        <SectionTitle icon="shield">Your privacy</SectionTitle>
        <Text style={s.line}>
          You can see everything the municipality holds about you, and ask for anything wrong to be corrected.
        </Text>
        <Button title="See what is held about me" variant="outline"
          onPress={() => router.push('/(app)/my-information')} />
      </Panel>

      <Pressable onPress={() => signOut(null)} hitSlop={10} style={s.signOut}>
        <Text style={s.signOutText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  line: { fontFamily: font.regular, fontSize: type.label, color: colors.inkSoft, lineHeight: 21, marginBottom: space.md },
  signOut: { alignSelf: 'center', paddingVertical: space.base },
  signOutText: { fontSize: type.label, color: colors.brand, fontFamily: font.medium },
});
