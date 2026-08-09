import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Brand from '../../src/components/Brand';
import Icon from '../../src/components/Icon';
import { Alert, Button, Field, Hint } from '../../src/components/ui';
import { useAuth, SIGN_OUT_MESSAGE } from '../../src/services/auth';
import { friendlyError } from '../../src/services/api';
import { colors, font, radius, shadow, space, tracking, type } from '../../src/theme';

/**
 * Sign in.
 *
 * The one field accepts an email address **or** a cell number, because residents
 * registered at their door by a councillor have no email — their SMS tells them
 * to sign in with their number, and the server matches on either. Labelling it
 * "email" would tell those households, wrongly, that the app is not for them.
 *
 * The navy band at the top is the same institutional chrome as the portal's
 * sidebar and the landing hero. It is doing a job beyond decoration: this is the
 * screen where somebody types a password, and looking unmistakably like the
 * municipality's own product is what separates it from a lookalike.
 */
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* The masthead, in the institutional navy and brand red of the portal. */}
        <LinearGradient colors={[colors.navy900, colors.navy700]} style={[s.head, { paddingTop: insets.top + space.base }]}>
          <Pressable
            onPress={() => router.replace('/')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back to the home page"
            style={s.back}
          >
            <Icon name="arrow-left" size={18} color={colors.slate300} />
            <Text style={s.backText}>Home</Text>
          </Pressable>

          <Brand size={40} onDark />

          <Text style={s.title}>Welcome back</Text>
          <Text style={s.lede}>
            Sign in to continue an application, upload outstanding documents, or check where yours has got to.
          </Text>
        </LinearGradient>

        <View style={s.card}>
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
            <Icon name={show ? 'eye-off' : 'eye'} size={15} color={colors.brand} />
            <Text style={s.revealText}>{show ? 'Hide password' : 'Show password'}</Text>
          </Pressable>

          <Button title="Sign in" icon="arrow-right" iconAfter onPress={submit} loading={busy} />

          <View style={s.footer}>
            <Link href="/(auth)/register" asChild>
              <Pressable hitSlop={8}><Text style={s.link}>Create an account</Text></Pressable>
            </Link>
            <Text style={s.dot}>·</Text>
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable hitSlop={8}><Text style={s.link}>Forgot your password?</Text></Pressable>
            </Link>
          </View>
        </View>

        <View style={s.note}>
          <Icon name="shield" size={16} color={colors.inkMute} />
          <Hint>
            Applying is free. The municipality will never ask you to pay for an indigent application.
          </Hint>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: space.xxl * 2, backgroundColor: colors.canvas, flexGrow: 1 },

  head: { paddingHorizontal: space.lg, paddingBottom: space.xxl + space.lg },
  back: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: space.lg, alignSelf: 'flex-start' },
  backText: { fontSize: type.label, fontFamily: font.medium, color: colors.slate300 },

  title: {
    fontSize: type.displaySmall, fontFamily: font.extraBold, color: colors.white,
    letterSpacing: tracking.display, marginTop: space.xl,
  },
  lede: {
    fontSize: type.label, fontFamily: font.regular, color: colors.slate300,
    lineHeight: 22, marginTop: space.sm,
  },

  card: {
    marginHorizontal: space.base,
    marginTop: -space.xxl,
    padding: space.base,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg,
    ...shadow.md,
  },

  reveal: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', marginTop: -space.sm, marginBottom: space.base,
  },
  revealText: { fontSize: type.hint, fontFamily: font.semibold, color: colors.brand },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space.sm, marginTop: space.lg,
  },
  link: { fontSize: type.label, fontFamily: font.semibold, color: colors.brand },
  dot: { color: colors.slate400, fontFamily: font.regular },

  note: {
    flexDirection: 'row', gap: space.sm, alignItems: 'flex-start',
    paddingHorizontal: space.lg, paddingTop: space.lg,
  },
});
