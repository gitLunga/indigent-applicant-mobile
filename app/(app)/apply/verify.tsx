import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Stepper from '../../../src/components/Stepper';
import { Actions, Alert, Button, Hint, Panel, Screen, SectionTitle } from '../../../src/components/ui';
import { useDraft } from '../../../src/services/draft';
import api, { friendlyError } from '../../../src/services/api';
import { colors, font, radius, space, type } from '../../../src/theme';

const CODE_LENGTH = 6;

/**
 * Step 2 — verify the cell number.
 *
 * Its own screen rather than the web's modal. The code arrives on this phone, so
 * the person is switching to their messages and back; a modal that can be
 * dismissed by a stray tap loses the number they typed on the previous step, and
 * a full screen survives the trip.
 *
 * Verification is not a gate. A household whose SMS never arrives — a borrowed
 * phone, a number typed wrong, no signal at a gate — must still be able to
 * finish applying, so this step can be skipped and picked up later. What it
 * cannot do is stop somebody from getting help.
 */
export default function Verify() {
  const router = useRouter();
  const { form, set, save, completed } = useDraft();

  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const inputRef = useRef<TextInput>(null);

  /** A cooling-off period, so the resend button cannot be leaned on. */
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setInterval(() => setSecondsLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const sendCode = async () => {
    setError(null);
    setNotice(null);
    setSending(true);
    try {
      const res = await api.post('/auth/send-otp', { cellNumber: form.cellNumber });
      setSent(true);
      setSecondsLeft(45);
      /**
       * In development the server returns the code so the flow is testable
       * without an SMS gateway. Shown plainly and labelled as a development aid,
       * because a code appearing on screen with no explanation looks like a leak.
       */
      const demo = res.data?.demoOtp;
      setNotice(demo ? `${res.data.message}. Development code: ${demo}` : res.data.message);
      inputRef.current?.focus();
    } catch (err) {
      setError(friendlyError(err, 'We could not send the code. Please try again in a moment.'));
    } finally {
      setSending(false);
    }
  };

  const check = async (value: string) => {
    setError(null);
    setChecking(true);
    try {
      await api.post('/auth/verify-otp', { cellNumber: form.cellNumber, code: value });
      set('cellVerified', true);
      setNotice('Your number is verified.');
      await save(3);
      router.push('/(app)/apply/property');
    } catch (err) {
      setError(friendlyError(err, 'That code is not valid or has expired.'));
      setCode('');
    } finally {
      setChecking(false);
    }
  };

  /** Submitted automatically on the sixth digit — nobody wants to press a button too. */
  const onChangeCode = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH && !checking) check(digits);
  };

  const skip = async () => {
    const ok = await save(3);
    if (ok) router.push('/(app)/apply/property');
  };

  return (
    <>
      <Stepper current="verify" completed={completed} onJump={() => router.back()} />
      <Screen>
        <Panel>
          <SectionTitle icon="phone">Verify your cell number</SectionTitle>

          <Text style={s.lede}>
            The municipality sends every update about your application by SMS, so we need to know this number
            reaches you.
          </Text>

          <View style={s.numberRow}>
            <Text style={s.number}>{form.cellNumber || 'No number entered'}</Text>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={s.change}>Change</Text>
            </Pressable>
          </View>

          {error ? <Alert tone="error">{error}</Alert> : null}
          {notice && !error ? <Alert tone={form.cellVerified ? 'success' : 'info'}>{notice}</Alert> : null}

          {form.cellVerified ? (
            <Alert tone="success">This number has been verified.</Alert>
          ) : !sent ? (
            <Button
              title="Send me a code"
              onPress={sendCode}
              loading={sending}
              disabled={!form.cellNumber.trim()}
            />
          ) : (
            <>
              <Text style={s.label}>Enter the 6-digit code</Text>

              {/*
                One hidden input behind six boxes.
                Six separate inputs each steal focus from the next, which breaks
                SMS autofill and makes backspacing across a boundary erratic. A
                single field with `autoComplete="sms-otp"` lets Android fill it in
                one tap, and the boxes are only how it is drawn.
              */}
              <Pressable onPress={() => inputRef.current?.focus()} style={s.boxes}>
                {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                  <View key={i} style={[s.box, code.length === i && s.boxActive, code[i] ? s.boxFilled : null]}>
                    <Text style={s.boxText}>{code[i] ?? ''}</Text>
                  </View>
                ))}
              </Pressable>

              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={onChangeCode}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                autoFocus
                style={s.hiddenInput}
                editable={!checking}
              />

              {checking ? <Hint>Checking your code…</Hint> : null}

              <View style={s.resendRow}>
                <Button
                  title={secondsLeft > 0 ? `Send again in ${secondsLeft}s` : 'Send a new code'}
                  variant="outline"
                  small
                  onPress={sendCode}
                  disabled={secondsLeft > 0 || sending}
                />
              </View>
            </>
          )}
        </Panel>

        <Actions>
          {/* Offered plainly rather than hidden. A household whose SMS never
              arrives — a borrowed phone, no signal at a gate — must still be able
              to apply, and burying the way past this step would strand them. */}
          {!form.cellVerified ? (
            <Button title="Skip for now" variant="ghost" onPress={skip} disabled={checking} />
          ) : null}
          <Button title="Continue" onPress={skip} disabled={checking} />
        </Actions>

        <Hint>
          You can verify your number later from your profile. Your application will not be refused for an
          unverified number, but the municipality may not be able to reach you.
        </Hint>
      </Screen>
    </>
  );
}

const s = StyleSheet.create({
  lede: { fontFamily: font.regular, fontSize: type.body, color: colors.inkSoft, lineHeight: 24, marginBottom: space.base },

  numberRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: space.md, marginBottom: space.base,
    backgroundColor: colors.slate50,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
  },
  number: { fontSize: type.body, fontFamily: font.semibold, color: colors.ink },
  change: { fontSize: type.hint, color: colors.brand, fontFamily: font.medium },

  label: { fontSize: type.label, fontFamily: font.medium, color: colors.slate700, marginBottom: space.md },

  boxes: { flexDirection: 'row', gap: space.sm, marginBottom: space.base },
  box: {
    flex: 1, aspectRatio: 0.8, maxWidth: 52,
    borderWidth: 1.5, borderColor: colors.lineStrong, borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  boxActive: { borderColor: colors.brand },
  boxFilled: { borderColor: colors.navy600, backgroundColor: colors.slate50 },
  boxText: { fontSize: 22, fontFamily: font.semibold, color: colors.ink },

  // Present for the keyboard and autofill, never seen.
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },

  resendRow: { alignItems: 'flex-start', marginTop: space.sm },
});
