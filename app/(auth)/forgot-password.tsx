import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Alert, Button, Field, Panel, Screen, H1, Muted } from '../../src/components/ui';
import api, { friendlyError } from '../../src/services/api';
import { colors, space, type, weight } from '../../src/theme';

/**
 * Reset a forgotten password with a code sent by SMS.
 *
 * Two stages in one screen rather than two routes: the person is holding the
 * phone the code arrives on, so making them navigate between typing their number
 * and typing the code adds a step and loses the number if they go back.
 */
export default function ForgotPassword() {
  const router = useRouter();
  const [stage, setStage] = useState<'request' | 'reset'>('request');
  const [cellNumber, setCellNumber] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const request = async () => {
    setError(null); setBusy(true);
    try {
      const res = await api.post('/auth/forgot-password', { cellNumber: cellNumber.trim() });
      setNotice(res.data.message);
      setStage('reset');
    } catch (err) {
      setError(friendlyError(err, 'We could not send a code to that number.'));
    } finally { setBusy(false); }
  };

  const reset = async () => {
    setError(null); setBusy(true);
    try {
      await api.post('/auth/reset-password', { cellNumber: cellNumber.trim(), code: code.trim(), newPassword: password });
      router.replace('/(auth)/sign-in');
    } catch (err) {
      setError(friendlyError(err, 'We could not reset your password.'));
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <H1>Reset your password</H1>
      <Muted>
        We will send a code to the cell number on your account. Enter it below with a new password.
      </Muted>

      <Panel style={s.panel}>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {notice && !error ? <Alert tone="success">{notice}</Alert> : null}

        <Field
          label="Cell number"
          value={cellNumber}
          onChangeText={setCellNumber}
          placeholder="082 123 4567"
          keyboardType="phone-pad"
          editable={stage === 'request'}
        />

        {stage === 'reset' ? (
          <>
            <Field
              label="Code from the SMS"
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="sms-otp"
            />
            <Field
              label="New password"
              value={password}
              onChangeText={setPassword}
              placeholder="Choose a new password"
              secureTextEntry
              autoComplete="new-password"
            />
          </>
        ) : null}

        <Button
          title={stage === 'request' ? 'Send me a code' : 'Set my new password'}
          onPress={stage === 'request' ? request : reset}
          loading={busy}
        />
      </Panel>

      <Pressable onPress={() => router.replace('/(auth)/sign-in')} hitSlop={10} style={s.back}>
        <Text style={s.link}>Back to sign in</Text>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  panel: { marginTop: space.base },
  back: { alignSelf: 'center', marginTop: space.sm },
  link: { fontSize: type.label, color: colors.brand, fontWeight: weight.medium },
});
