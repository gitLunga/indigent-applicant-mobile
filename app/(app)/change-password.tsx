import React, { useState } from 'react';
import { Alert, Button, Field, Hint, Panel, Screen, SectionTitle } from '../../src/components/ui';
import api, { friendlyError, setToken } from '../../src/services/api';
import { useAuth } from '../../src/services/auth';
import { useRouter } from 'expo-router';

/**
 * Replace the password.
 *
 * Reached two ways: from the profile by choice, or forced when an account is
 * still on the temporary password a councillor read out over the phone. In the
 * forced case there is no way back — the API refuses every other route until it
 * is done, so offering navigation would only lead to a wall of errors.
 */
export default function ChangePassword() {
  const router = useRouter();
  const { user, patchUser } = useAuth();
  const forced = Boolean(user?.mustChangePassword);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (next !== confirm) { setError('The two new passwords do not match.'); return; }

    setBusy(true);
    try {
      const res = await api.post('/auth/change-password', { currentPassword: current, newPassword: next });

      /**
       * Swap in the replacement token before anything else runs.
       *
       * Changing a password revokes every token issued before it, including the
       * one this request was made with. Without this the next request would 401
       * and sign the person out of the change they just completed.
       */
      if (res.data?.data?.token) await setToken(res.data.data.token);

      patchUser({ mustChangePassword: false });
      setCurrent(''); setNext(''); setConfirm('');
      setDone(true);
      if (forced) router.replace('/(app)/dashboard');
    } catch (err) {
      setError(friendlyError(err, 'We could not change your password.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Panel>
        <SectionTitle>{forced ? 'Choose your own password' : 'Change your password'}</SectionTitle>

        {forced ? (
          <Alert tone="info">
            Your account was set up for you and the password was sent by SMS. Someone else has seen it, so please
            choose your own before you carry on.
          </Alert>
        ) : null}

        {error ? <Alert tone="error">{error}</Alert> : null}
        {done && !forced ? <Alert tone="success">Your password has been changed.</Alert> : null}

        <Field label={forced ? 'The password from the SMS' : 'Your current password'}
          value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />

        <Field label="New password" value={next} onChangeText={setNext}
          secureTextEntry autoComplete="new-password" />

        <Field label="Type the new password again" value={confirm} onChangeText={setConfirm}
          secureTextEntry autoComplete="new-password" />

        <Button title="Change my password" onPress={submit} loading={busy}
          disabled={!current || !next || !confirm} />

        <Hint>
          Any other phone or computer signed in as you will be signed out.
        </Hint>
      </Panel>
    </Screen>
  );
}
