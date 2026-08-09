import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, { IconName } from './Icon';
import { BrandMark } from './Brand';
import { statusSummary, useApplication } from '../services/application';
import { useAuth } from '../services/auth';
import { colors, font, radius, space, tracking, type } from '../theme';

/**
 * The applicant's navigation, ported from the web's `AppSidebar.jsx`.
 *
 * The status block is the point of this sidebar, on the web and here: an
 * applicant's main question is "where has my application got to", and this
 * answers it on every screen without making them navigate anywhere. Everything
 * else in the drawer is ordinary navigation and could have gone in a menu; the
 * status block could not.
 *
 * The link groups, their order, their labels and their icons are the web's
 * exactly. Somebody who has used the website should not have to re-learn where
 * anything is.
 */

type Link = { href: string; label: string; icon: IconName };

const SECTIONS: { label: string; links: Link[] }[] = [
  {
    label: 'My account',
    links: [
      { href: '/(app)/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { href: '/(app)/apply/particulars', label: 'Application form', icon: 'edit' },
      { href: '/(app)/applications', label: 'My applications', icon: 'applications' },
      { href: '/(app)/documents', label: 'Documents', icon: 'file' },
    ],
  },
  {
    label: 'Settings',
    links: [
      { href: '/(app)/notifications', label: 'Notifications', icon: 'bell' },
      { href: '/(app)/profile', label: 'Profile', icon: 'user' },
      { href: '/(app)/my-information', label: 'Your information', icon: 'shield' },
      { href: '/(app)/help', label: 'Help & FAQ', icon: 'help' },
    ],
  },
];

const initials = (first?: string | null, last?: string | null, email?: string | null) => {
  const parts = [first, last].filter(Boolean) as string[];
  if (parts.length) return parts.map((s) => s[0]).join('').toUpperCase();
  return (email || 'A').slice(0, 2).toUpperCase();
};

/** `/(app)/apply/income` should light up "Application form", not nothing. */
function isActive(pathname: string, href: string): boolean {
  const path = href.replace('/(app)', '');
  if (path === '/dashboard') return pathname === '/dashboard' || pathname === '/';
  if (path === '/apply/particulars') return pathname.startsWith('/apply');
  if (path === '/applications') return pathname.startsWith('/applications') || pathname.startsWith('/application/');
  return pathname.startsWith(path);
}

export default function AppDrawer({
  onNavigate,
  onSignOut,
}: {
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { application, unread } = useApplication();

  const status = statusSummary(application);

  const go = (href: string) => {
    onNavigate();
    router.push(href as never);
  };

  return (
    <View style={[s.drawer, { paddingTop: insets.top }]}>
      {/* --- Brand ------------------------------------------------------ */}
      <View style={s.brand}>
        <BrandMark size={34} />
        <View style={s.brandText}>
          <Text style={s.brandTitle} numberOfLines={1}>Indigent Register</Text>
          <Text style={s.brandSub} numberOfLines={1}>Municipal Support</Text>
        </View>
      </View>

      {/* --- Application status ----------------------------------------- */}
      <View style={s.status}>
        <Text style={s.statusLabel}>Application status</Text>
        <Text style={s.statusValue}>{status.label}</Text>
        {status.showBar ? (
          <View
            style={s.statusTrack}
            accessibilityRole="progressbar"
            accessibilityValue={{ now: status.progress, min: 0, max: 100 }}
          >
            <View style={[s.statusFill, { width: `${status.progress}%` }]} />
          </View>
        ) : null}
      </View>

      {/* --- Navigation -------------------------------------------------- */}
      <ScrollView style={s.nav} contentContainerStyle={s.navContent} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section) => (
          <View key={section.label} style={s.section}>
            <Text style={s.sectionLabel}>{section.label}</Text>

            {section.links.map((link) => {
              const active = isActive(pathname, link.href);
              const badge = link.icon === 'bell' && unread > 0 ? unread : 0;

              return (
                <Pressable
                  key={link.href}
                  onPress={() => go(link.href)}
                  accessibilityRole="link"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [s.link, active && s.linkOn, pressed && s.linkPressed]}
                >
                  {/* The web marks the active link with a red leading edge. */}
                  <View style={[s.linkEdge, active && s.linkEdgeOn]} />
                  <Icon
                    name={link.icon}
                    size={18}
                    color={active ? colors.white : colors.slate400}
                  />
                  <Text style={[s.linkLabel, active && s.linkLabelOn]} numberOfLines={1}>
                    {link.label}
                  </Text>
                  {badge ? (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* --- Who is signed in -------------------------------------------- */}
      <View style={[s.foot, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials(user?.firstName, user?.lastName, user?.email)}</Text>
        </View>

        <View style={s.userText}>
          <Text style={s.userName} numberOfLines={1}>
            {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email}
          </Text>
          <View style={s.userRoleRow}>
            {user?.isVerified ? (
              <Icon name="check-circle" size={12} color={colors.successLine} />
            ) : null}
            <Text style={s.userRole}>{user?.isVerified ? 'Verified' : 'Not verified'}</Text>
          </View>
        </View>

        <Pressable
          onPress={onSignOut}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={({ pressed }) => [s.signOut, pressed && s.signOutPressed]}
        >
          <Icon name="logout" size={17} color={colors.slate300} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  drawer: { flex: 1, backgroundColor: colors.navy900 },

  brand: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.base, paddingVertical: space.base,
    borderBottomWidth: 1, borderBottomColor: colors.navy700,
  },
  brandText: { flex: 1, minWidth: 0 },
  brandTitle: { fontSize: type.label, fontFamily: font.bold, color: colors.white },
  brandSub: {
    fontSize: type.overline, fontFamily: font.semibold, color: colors.slate400,
    textTransform: 'uppercase', letterSpacing: tracking.overline, marginTop: 1,
  },

  status: {
    margin: space.md,
    padding: space.md,
    backgroundColor: colors.navy800,
    borderWidth: 1, borderColor: colors.navy600,
    borderRadius: radius.md,
  },
  statusLabel: {
    fontSize: type.overline, fontFamily: font.bold, color: colors.slate400,
    textTransform: 'uppercase', letterSpacing: tracking.overline,
  },
  statusValue: {
    fontSize: type.label, fontFamily: font.semibold, color: colors.white,
    lineHeight: 20, marginTop: 5,
  },
  statusTrack: {
    height: 5, borderRadius: radius.pill, backgroundColor: colors.navy600,
    overflow: 'hidden', marginTop: space.md,
  },
  statusFill: { height: 5, borderRadius: radius.pill, backgroundColor: colors.brand },

  nav: { flex: 1 },
  navContent: { paddingBottom: space.base },
  section: { marginBottom: space.lg },
  sectionLabel: {
    fontSize: type.overline, fontFamily: font.bold, color: colors.slate500,
    textTransform: 'uppercase', letterSpacing: tracking.overline,
    paddingHorizontal: space.base, marginBottom: space.sm,
  },

  link: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    minHeight: 48, paddingRight: space.base,
  },
  linkOn: { backgroundColor: colors.navy700 },
  linkPressed: { backgroundColor: colors.navy800 },
  linkEdge: { width: 3, alignSelf: 'stretch', backgroundColor: colors.transparent },
  linkEdgeOn: { backgroundColor: colors.brand },
  linkLabel: { flex: 1, fontSize: type.body, fontFamily: font.regular, color: colors.slate300 },
  linkLabelOn: { fontFamily: font.semibold, color: colors.white },

  badge: {
    minWidth: 22, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.pill, backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: type.small, fontFamily: font.bold, color: colors.white },

  foot: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.base, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.navy700,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.navy600,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: type.hint, fontFamily: font.bold, color: colors.white },
  userText: { flex: 1, minWidth: 0 },
  userName: { fontSize: type.label, fontFamily: font.semibold, color: colors.white },
  userRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  userRole: { fontSize: type.small, fontFamily: font.regular, color: colors.slate400 },
  signOut: { padding: space.sm, borderRadius: radius.md },
  signOutPressed: { backgroundColor: colors.navy700 },
});
