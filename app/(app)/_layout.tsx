import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Drawer } from 'react-native-drawer-layout';
import AppDrawer from '../../src/components/AppDrawer';
import ConfirmModal from '../../src/components/ConfirmModal';
import Icon from '../../src/components/Icon';
import { ApplicationProvider, useApplication } from '../../src/services/application';
import { useAuth } from '../../src/services/auth';
import { colors, font, radius, space, type } from '../../src/theme';

/**
 * Everything behind a session.
 *
 * A drawer over a stack, rather than tabs. The web puts every destination in one
 * sidebar with the application's status pinned above them, and this is that
 * sidebar — same groups, same order, same status block. Tabs would have given
 * equal weight to five destinations when the applicant's job here is linear:
 * apply, then wait, then respond if asked.
 *
 * `react-native-drawer-layout` is the primitive React Navigation's own drawer is
 * built on, and expo-router already depends on it — so this costs no new
 * dependency and, being unstyled, lets the drawer be a real port of the web's
 * navy sidebar rather than a themed approximation of somebody else's.
 */

function Shell() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { unread } = useApplication();

  const [open, setOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  return (
    <>
      <Drawer
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        drawerType="front"
        drawerStyle={s.drawer}
        // The web dims the page behind an open drawer with the same slate wash.
        overlayStyle={s.overlay}
        renderDrawerContent={() => (
          <AppDrawer
            onNavigate={() => setOpen(false)}
            onSignOut={() => { setOpen(false); setConfirmSignOut(true); }}
          />
        )}
      >
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.navy900 },
            headerTintColor: colors.white,
            headerTitleStyle: { fontSize: type.h3, fontFamily: font.semibold },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.canvas },
            headerLeft: () => (
              <Pressable
                onPress={() => setOpen(true)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Open navigation"
                style={({ pressed }) => [s.headerBtn, pressed && s.headerBtnPressed]}
              >
                <Icon name="menu" size={22} color={colors.white} />
              </Pressable>
            ),
            headerRight: () => (
              <Pressable
                onPress={() => router.push('/(app)/notifications')}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                style={({ pressed }) => [s.headerBtn, pressed && s.headerBtnPressed]}
              >
                <Icon name="bell" size={21} color={colors.white} />
                {unread > 0 ? (
                  <View style={s.dot}>
                    <Text style={s.dotText}>{unread > 9 ? '9+' : unread}</Text>
                  </View>
                ) : null}
              </Pressable>
            ),
          }}
        >
          <Stack.Screen name="dashboard" options={{ title: 'My application' }} />
          <Stack.Screen name="applications" options={{ title: 'My applications' }} />
          <Stack.Screen name="documents" options={{ title: 'Documents' }} />
          <Stack.Screen name="profile" options={{ title: 'My profile' }} />
          <Stack.Screen name="my-information" options={{ title: 'Your information' }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="help" options={{ title: 'Help & FAQ' }} />

          {/* Detail and wizard screens are pushed onto the stack, so they get a
              back arrow instead of the hamburger — going back is what somebody
              wants from a screen they opened, and two navigation affordances in
              one header is one too many. */}
          <Stack.Screen
            name="application/[id]"
            options={{ title: 'Application', headerLeft: undefined }}
          />
          <Stack.Screen
            name="change-password"
            options={{ title: 'Change your password', headerBackVisible: false, headerLeft: () => null }}
          />
          <Stack.Screen name="apply" options={{ headerShown: false }} />
        </Stack>
      </Drawer>

      <ConfirmModal
        open={confirmSignOut}
        title="Sign out?"
        description="Your application is saved. You can sign back in at any time to carry on."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        variant="danger"
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => { setConfirmSignOut(false); signOut(null); }}
      />
    </>
  );
}

export default function AppLayout() {
  return (
    <ApplicationProvider>
      <Shell />
    </ApplicationProvider>
  );
}

const s = StyleSheet.create({
  drawer: { width: 288, backgroundColor: colors.navy900 },
  overlay: { backgroundColor: 'rgba(15, 23, 42, 0.5)' },

  headerBtn: { padding: space.sm, borderRadius: radius.md },
  headerBtnPressed: { backgroundColor: colors.navy700 },

  dot: {
    position: 'absolute', top: 2, right: 0,
    minWidth: 17, height: 17, paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    borderWidth: 1.5, borderColor: colors.navy900,
    alignItems: 'center', justifyContent: 'center',
  },
  dotText: { fontSize: 9, fontFamily: font.bold, color: colors.white },
});
