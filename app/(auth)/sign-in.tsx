import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Button, Field, Hint } from '../../src/components/ui';
import { useAuth, SIGN_OUT_MESSAGE } from '../../src/services/auth';
import { friendlyError } from '../../src/services/api';
import { colors, radius, space, type, weight } from '../../src/theme';

/**
 * Sign in.
 *
 * The one field accepts an email address **or** a cell number, because residents
 * registered at their door by a councillor have no email — their SMS tells them
 * to sign in with their number, and the server matches on either. Labelling it
 * "email" would tell those households, wrongly, that the app is not for them.
 */
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { signIn, signedOutBecause, clearSignOutReason } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const notice = signedOutBecause ? SIGN_OUT_MESSAGE[signedOutBecause] : null;

  const submit = async () => {
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Please enter your email address or cell number, and your password.');
      return;
    }

    setBusy(true);
    try {
      // The root layout's gate handles where to go next, including sending
      // somebody on a temporary password to change it first.
      await signIn(identifier, password);
    } catch (err) {
      setError(friendlyError(err, 'We could not sign you in. Check your details and try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={s.flex}
        contentContainerStyle={[s.content, { paddingTop: insets.top + space.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* The masthead, in the institutional navy and brand red of the portal. */}
        <View style={s.brand}>
          <View style={s.mark}><Text style={s.markText}>IR</Text></View>
          <View style={s.flex}>
            <Text style={s.brandName}>Indigent Register</Text>
            <Text style={s.brandSub}>Municipal support application</Text>
          </View>
        </View>

        <Text style={s.title}>Welcome back</Text>
        <Text style={s.lede}>
          Sign in to continue an application, upload outstanding documents, or check where yours has got to.
        </Text>

        {/* Hidden once they have tried again, so an older notice does not sit
            above a fresh error and confuse which one is current. */}
        {notice && !error ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        <Field
          label="Email address or cell number"
          value={identifier}
          onChangeText={(v) => { setIdentifier(v); if (notice) clearSignOutReason(); }}
          placeholder="you@example.com or 082 123 4567"
          keyboardType="email-address"
          textContentType="username"
          autoComplete="username"
          returnKeyType="next"
        />

        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry={!show}
          textContentType="password"
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        {/*
          A reveal toggle rather than an eye icon inside the field. On a phone
          keyboard, mistyping a password you cannot see is the most common reason
          a sign-in fails — and an icon overlapping the text is a smaller target
          than a labelled line of text beneath it.
        */}
        <Pressable onPress={() => setShow((v) => !v)} hitSlop={10} style={s.reveal}>
          <Text style={s.revealText}>{show ? 'Hide password' : 'Show password'}</Text>
        </Pressable>

        <Button title="Sign in" onPress={submit} loading={busy} style={s.submit} />

        <View style={s.footer}>
          <Link href="/(auth)/register" asChild>
            <Pressable hitSlop={8}><Text style={s.link}>Create an account</Text></Pressable>
          </Link>
          <Text style={s.dot}>·</Text>
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable hitSlop={8}><Text style={s.link}>Forgot your password?</Text></Pressable>
          </Link>
        </View>

        <Hint>
          Applying is free. The municipality will never ask you to pay for an indigent application.
        </Hint>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxl * 2, backgroundColor: colors.canvas, flexGrow: 1 },

  brand: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xxl },
  mark: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center',
  },
  markText: { color: colors.white, fontWeight: weight.bold, fontSize: type.body, letterSpacing: 0.5 },
  brandName: { fontSize: type.h3, fontWeight: weight.semibold, color: colors.ink },
  brandSub: { fontSize: type.hint, color: colors.inkMute, textTransform: 'uppercase', letterSpacing: 0.6 },

  title: { fontSize: type.h1, fontWeight: weight.semibold, color: colors.ink, marginBottom: space.sm },
  lede: { fontSize: type.body, color: colors.inkSoft, lineHeight: 24, marginBottom: space.lg },

  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  reveal: { alignSelf: 'flex-start', marginTop: -space.sm, marginBottom: space.base },
  revealText: { fontSize: type.hint, color: colors.brand, fontWeight: weight.medium },

  submit: { marginTop: space.sm },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space.sm, marginTop: space.lg, marginBottom: space.base,
  },
  link: { fontSize: type.label, color: colors.brand, fontWeight: weight.medium },
  dot: { color: colors.slate400 },
});
