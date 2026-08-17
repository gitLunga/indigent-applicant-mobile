import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
/**
 * The five weights, imported one file at a time.
 *
 * `import { … } from '@expo-google-fonts/plus-jakarta-sans'` looks tidier and
 * costs about a megabyte: the package's barrel `require()`s all fourteen faces,
 * so Metro bundles every italic and the 200/300 weights this app never asks
 * for. Pointing at the `.ttf` files directly ships only what is loaded below.
 *
 * This is a household on a metered connection downloading a government app, so
 * the megabyte is the point.
 */
import PlusJakartaSans_400Regular from '@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf';
import PlusJakartaSans_500Medium from '@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf';
import PlusJakartaSans_600SemiBold from '@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf';
import PlusJakartaSans_700Bold from '@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf';
import PlusJakartaSans_800ExtraBold from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold/PlusJakartaSans_800ExtraBold.ttf';
import { AuthProvider, useAuth } from '../src/services/auth';
import { colors, font, type } from '../src/theme';

/**
 * The navigation shell.
 *
 * Three groups: the index route is the public landing page, `(auth)` is signing
 * in and registering, `(app)` is everything behind a session. The gate below
 * moves between them, which keeps every screen free of "am I allowed to be here"
 * checks — a check that is easy to forget on exactly the screen where forgetting
 * it matters.
 */

/**
 * Hold the splash until the fonts are in.
 *
 * Called at module scope, before React renders, because by the time an effect
 * runs the splash has already gone. Without this the first frame draws in the
 * system font and then reflows when Plus Jakarta Sans arrives — every heading
 * jumping a few pixels as the app opens.
 */
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or the module is unavailable in this environment. Neither is
  // worth crashing over: the cost is a font flash, not a broken app.
});

function Gate() {
  const { user, restoring } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (restoring) return;

    const inAuthGroup = segments[0] === '(auth)';
    /**
     * The landing page, identified by path rather than by an empty segment list.
     * `useSegments()` is typed as a non-empty tuple, so `segments.length === 0`
     * is a comparison TypeScript can prove never holds — it would have compiled
     * to a gate that redirected signed-out visitors away from the landing page
     * they had just been sent to.
     */
    const onLanding = pathname === '/';

    if (!user) {
      // Signed out is allowed on the landing page and in the auth group. It is
      // not allowed anywhere else.
      if (!onLanding && !inAuthGroup) router.replace('/(auth)/sign-in');
      return;
    }

    if (inAuthGroup || onLanding) {
      /**
       * A password issued by staff and sent over SMS has to be replaced before
       * anything else works — the API refuses every other route until it is, so
       * there is no point rendering a screen whose every request will fail.
       */
      /**
       * Two gates, in the order the API enforces them.
       *
       * A password issued by staff and sent over SMS has to be replaced before
       * anything else works, and an applicant's cell number has to be verified
       * before they can start an application. The API refuses every other route
       * in both cases, so rendering a screen whose every request will fail only
       * wastes the applicant's data.
       */
      if (user.mustChangePassword) router.replace('/(app)/change-password');
      else if (user.role === 'APPLICANT' && !user.isVerified) router.replace('/(app)/verify');
      else router.replace('/(app)/dashboard');
    }
  }, [user, restoring, segments, pathname, router]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy900 },
        headerTintColor: colors.white,
        headerTitleStyle: { fontSize: type.h3, fontFamily: font.semibold },
        contentStyle: { backgroundColor: colors.canvas },
        // The system back arrow and gesture are what people expect; a custom
        // header button that only sometimes appears is worse than neither.
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}

/**
 * Nothing renders until the keychain has been read and the fonts are loaded.
 *
 * Reading the keychain is asynchronous, so without the wait the sign-in screen
 * flashes up for a moment in front of somebody who is already signed in.
 */
function Boot() {
  const { restoring } = useAuth();

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  /**
   * A font that fails to load is not a reason to hold the app hostage.
   *
   * `fontError` means the app renders in the system font — visually wrong, but
   * an applicant can still complete and submit their application, which matters
   * more than the typeface. Blocking here would turn a cosmetic failure into a
   * total one.
   */
  const ready = (fontsLoaded || Boolean(fontError)) && !restoring;

  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Gate />
    </View>
  );
}

export default function RootLayout() {
  return (
    /**
     * The drawer's swipe gestures are gesture-handler gestures, and
     * gesture-handler only routes touches to them beneath a
     * `GestureHandlerRootView`. Without this the drawer still opens from the
     * hamburger and simply never responds to a swipe — a failure with no error
     * attached to it, which is the kind that survives to production.
     */
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {/*
          Light text, for the navy header beneath it.
          `backgroundColor` was removed from expo-status-bar in SDK 57 — the bar is
          translucent now and takes its ground from whatever is behind it, which is
          why the header supplies the navy rather than this.
        */}
        <StatusBar style="light" />
        <AuthProvider>
          <Boot />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
});
