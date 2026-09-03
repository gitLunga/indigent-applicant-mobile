import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Actions, Alert, Button, Hint, Panel, Screen, SectionTitle } from '../../src/components/ui';
import { useAuth } from '../../src/services/auth';
import api, { friendlyError } from '../../src/services/api';
import { colors, font, radius, space, type } from '../../src/theme';

const CODE_LENGTH = 6;

/**
 * Verify the cell number — before an application, not inside one.
 *
 * This used to be step 2 of the wizard, and it could be skipped. The reasoning
 * was sound as far as it went: a household on a borrowed phone, or with no
 * signal at a gate, must not be shut out of applying. But the effect was that
 * applications reached an approval queue carrying numbers nobody had confirmed,
 * and the municipality answers by SMS — so an unverified number is a decision
 * that never arrives.
 *
 * It moved here, and the account is created first. Somebody who mistyped their
 * number keeps the account they just made and can correct it from their profile
 * rather than being locked out and starting again. What they cannot do is send
 * an application the municipality has no way to answer.
 *
 * The code is already on its way when this screen opens — registration issues
 * one — so the common path is to type six digits and be finished.
 */
export default function Verify() {
  const router = useRouter();
  const { user, patchUser } = useAuth();

  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(45);
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
      const res = await api.post('/auth/send-otp', { cellNumber: user?.cellNumber });
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
      const res = await api.post('/auth/verify-otp', { cellNumber: user?.cellNumber, code: value });
      // Taken from what the server actually did, not assumed — a 200 here used
      // to mean only "the code was right", which is not the same thing as "an
      // account was verified".
      patchUser({ isVerified: Boolean(res.data?.data?.user?.isVerified) });
      router.replace('/(app)/dashboard');
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

  return (
    <Screen>
      <Panel>
        <SectionTitle icon="phone">Verify your cell number</SectionTitle>

        <Text style={s.lede}>
          We have sent a six-digit code to this number. The municipality sends every update about your
          application by SMS, so we need to know it reaches you.
        </Text>

        <View style={s.numberRow}>
          <Text style={s.number}>{user?.cellNumber || 'No number on your account'}</Text>
          <Pressable onPress={() => router.push('/(app)/profile')} hitSlop={8}>
            <Text style={s.change}>Change</Text>
          </Pressable>
        </View>

        {error ? <Alert tone="error">{error}</Alert> : null}
        {notice && !error ? <Alert tone="info">{notice}</Alert> : null}

        <Text style={s.label}>Enter the 6-digit code</Text>

        {/*
          One hidden input behind six boxes.
          Six separate inputs each steal focus from the next, which breaks SMS
          autofill and makes backspacing across a boundary erratic. A single
          field with `autoComplete="sms-otp"` lets Android fill it in one tap,
          and the boxes are only how it is drawn.
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
      </Panel>

      <Actions>
        <Button
          title={secondsLeft > 0 ? `Send a new code in ${secondsLeft}s` : 'Send a new code'}
          variant="outline"
          onPress={sendCode}
          loading={sending}
          disabled={secondsLeft > 0 || checking}
        />
      </Actions>

      <Hint>
        If this number is wrong, change it on your profile and we will send a new code. You cannot start an
        application until it is verified, because it is how the municipality reaches you.
      </Hint>
    </Screen>
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
});
