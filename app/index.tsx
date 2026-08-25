import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Brand from '../src/components/Brand';
import Icon, { IconName } from '../src/components/Icon';
import { Button } from '../src/components/ui';
import { colors, font, radius, shadow, space, tracking, type } from '../src/theme';

/**
 * The public landing page.
 *
 * A port of the web client's `Landing.jsx` — the same four steps in the same
 * order, the same R7 500 threshold, the same five questions. Somebody who was
 * shown the website at a municipal office and then downloads the app should
 * recognise it immediately; that recognition is most of what tells a household
 * this is the real thing and not somebody phishing for ID numbers.
 *
 * Two things are deliberately better than the web's. The FAQ answers actually
 * open — on the web they are `<div>`s with a chevron and no handler, which on a
 * phone reads as a broken button. And the eligibility figure is pulled out into
 * its own panel, because it is the one fact that decides whether the next
 * fifteen minutes are worth somebody's time.
 */

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'edit',
    title: 'Complete the form',
    body: 'Your personal details, the property, who lives there and what the household lives on.',
  },
  {
    icon: 'file',
    title: 'Upload documents',
    body: 'Your ID, proof of income and a sworn affidavit. Photograph them or attach a PDF.',
  },
  {
    icon: 'bell',
    title: 'Get notified',
    body: 'An SMS at every stage, so you are never left wondering where it has got to.',
  },
  {
    icon: 'shield',
    title: 'Get support',
    body: 'If approved, the discount is applied straight to your municipal account.',
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Who qualifies for indigent support?',
    a: 'Households whose total monthly income is R7 500 or less. Everyone living on the property counts, '
      + 'including grants and pensions.',
  },
  {
    q: 'What documents do I need?',
    a: 'A copy of your ID, proof of what the household lives on (a payslip, a SASSA letter or three months of '
      + 'bank statements), and a sworn affidavit. Any police station will commission the affidavit free of charge.',
  },
  {
    q: 'How long does the process take?',
    a: 'Most applications are decided within 30 days. It goes through verification, assessment and a '
      + 'supervisor sign-off, and you get an SMS at each stage.',
  },
  {
    q: 'Can I re-apply if declined?',
    a: 'Yes. If your circumstances change — you lose work, someone moves in or out, an income stops — you can '
      + 'apply again straight away.',
  },
  {
    q: 'How is household income calculated?',
    a: 'Every income on the property is added together: salaries, old age and disability pensions, money from '
      + 'a business, and rent you receive. The total is what is measured against R7 500.',
  },
];

export default function Landing() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <View style={s.root}>
      {/* --- Header ---------------------------------------------------- */}
      <View style={[s.header, { paddingTop: insets.top + space.sm }]}>
        <Brand size={32} />
        <Pressable
          onPress={() => router.push('/(auth)/sign-in')}
          hitSlop={8}
          style={({ pressed }) => [s.headerLink, pressed && s.headerLinkPressed]}
        >
          <Text style={s.headerLinkText}>Sign in</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* --- Hero ---------------------------------------------------- */}
        <LinearGradient colors={[colors.navy900, colors.navy700]} style={s.hero}>
          <View style={s.eyebrow}>
            <Text style={s.eyebrowText}>Municipal indigent register</Text>
          </View>

          <Text style={s.heroTitle}>Apply for indigent support</Text>
          <Text style={s.heroBody}>
            Whether you qualify depends on your monthly household income. If your total household income is
            R7 500 or less per month, you could qualify for a discount on your water, sewerage, electricity,
            waste collection and property rates.
          </Text>

          <Button
            title="Start my application"
            icon="arrow-right"
            iconAfter
            onPress={() => router.push('/(auth)/register')}
            style={s.heroCta}
          />
          <Text style={s.heroNote}>Applying is free. It takes about fifteen minutes.</Text>
        </LinearGradient>

        {/* --- The threshold, on its own ------------------------------- */}
        <View style={s.thresholdWrap}>
          <View style={s.threshold}>
            <View style={s.thresholdIcon}>
              <Icon name="money" size={20} color={colors.brand} strokeWidth={1.9} />
            </View>
            <View style={s.flex}>
              <Text style={s.thresholdLabel}>Household income limit</Text>
              <Text style={s.thresholdValue}>R7 500 per month</Text>
              <Text style={s.thresholdNote}>
                Everyone living on the property counts, including grants and pensions.
              </Text>
            </View>
          </View>
        </View>

        {/* --- How it works -------------------------------------------- */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>How does it work?</Text>
          <Text style={s.sectionLede}>Four steps, and you can stop and come back at any point.</Text>

          {STEPS.map((step, i) => (
            <View key={step.title} style={s.step}>
              <View style={s.stepRail}>
                <View style={s.stepMark}>
                  <Icon name={step.icon} size={18} color={colors.brand} strokeWidth={1.9} />
                </View>
                {i < STEPS.length - 1 ? <View style={s.stepLine} /> : null}
              </View>

              <View style={s.stepBody}>
                <Text style={s.stepNumber}>Step {i + 1}</Text>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepText}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* --- Important information ----------------------------------- */}
        <View style={s.noticeWrap}>
          <View style={s.notice}>
            <Icon name="alert-circle" size={18} color={colors.warning} />
            <Text style={s.noticeText}>
              Please make sure everything you enter is accurate. Incomplete applications, or ones with
              supporting documents missing, may be declined.
            </Text>
          </View>
        </View>

        {/* --- FAQ ------------------------------------------------------ */}
        <View style={s.faqSection}>
          <Text style={[s.sectionTitle, s.sectionTitleOnDark]}>Frequently asked questions</Text>

          {FAQS.map((item, i) => {
            const open = openFaq === i;
            return (
              <Pressable
                key={item.q}
                onPress={() => setOpenFaq(open ? null : i)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={s.faq}
              >
                <View style={s.faqHead}>
                  <Text style={s.faqQ}>{item.q}</Text>
                  <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.slate400} />
                </View>
                {open ? <Text style={s.faqA}>{item.a}</Text> : null}
              </Pressable>
            );
          })}
        </View>

        {/* --- Closing CTA ---------------------------------------------- */}
        <View style={s.closing}>
          <Text style={s.closingTitle}>Ready to apply?</Text>
          <Text style={s.closingBody}>
            You will need your ID number and your municipal account number if you have one.
          </Text>
          <Button title="Create an account" onPress={() => router.push('/(auth)/register')} />
          <Pressable
            onPress={() => router.push('/(auth)/sign-in')}
            hitSlop={8}
            style={s.closingSignIn}
          >
            <Text style={s.closingSignInText}>I already have an account</Text>
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Terms &amp; Conditions © 2026. All rights reserved.</Text>
          <Text style={s.footerWarn}>
            The municipality will never ask you to pay for an indigent application.
          </Text>
          <Text style={s.footerPowered}>Powered by Malcam ICT Solutions</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.base, paddingBottom: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  headerLink: { paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.md },
  headerLinkPressed: { backgroundColor: colors.slate100 },
  headerLinkText: { fontSize: type.label, fontFamily: font.semibold, color: colors.brand },

  // --- Hero ----------------------------------------------------------------
  hero: { paddingHorizontal: space.lg, paddingVertical: space.xxl + space.sm, alignItems: 'center' },
  eyebrow: {
    paddingHorizontal: space.md, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: radius.pill,
    marginBottom: space.base,
  },
  eyebrowText: {
    fontSize: type.overline, fontFamily: font.semibold, color: colors.slate300,
    textTransform: 'uppercase', letterSpacing: tracking.overline,
  },
  heroTitle: {
    fontSize: type.display, fontFamily: font.extraBold, color: colors.white,
    letterSpacing: tracking.display, textAlign: 'center', lineHeight: 38,
  },
  heroBody: {
    fontSize: type.body, fontFamily: font.regular, color: colors.slate300,
    textAlign: 'center', lineHeight: 24, marginTop: space.md, marginBottom: space.xl,
  },
  heroCta: { alignSelf: 'stretch' },
  heroNote: { fontSize: type.hint, fontFamily: font.regular, color: colors.slate400, marginTop: space.md },

  // --- Threshold -----------------------------------------------------------
  thresholdWrap: { paddingHorizontal: space.base, marginTop: -space.lg },
  threshold: {
    flexDirection: 'row', gap: space.md,
    padding: space.base,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg,
    ...shadow.md,
  },
  thresholdIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    borderWidth: 1, borderColor: colors.brandBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  thresholdLabel: {
    fontSize: type.overline, fontFamily: font.bold, color: colors.inkMute,
    textTransform: 'uppercase', letterSpacing: tracking.overline,
  },
  thresholdValue: {
    fontSize: type.h2, fontFamily: font.extraBold, color: colors.ink,
    letterSpacing: tracking.heading, marginTop: 2,
  },
  thresholdNote: {
    fontSize: type.hint, fontFamily: font.regular, color: colors.inkMute,
    lineHeight: 18, marginTop: space.xs,
  },

  // --- Sections ------------------------------------------------------------
  section: { paddingHorizontal: space.base, paddingTop: space.xxl, paddingBottom: space.lg },
  sectionTitle: {
    fontSize: type.h2, fontFamily: font.bold, color: colors.ink,
    letterSpacing: tracking.heading, textAlign: 'center',
  },
  sectionTitleOnDark: { color: colors.white },
  sectionLede: {
    fontSize: type.label, fontFamily: font.regular, color: colors.inkMute,
    textAlign: 'center', lineHeight: 21, marginTop: space.sm, marginBottom: space.xl,
  },

  step: { flexDirection: 'row', gap: space.base },
  stepRail: { alignItems: 'center', width: 44 },
  stepMark: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.brandBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  // The rail is what makes four cards read as four *steps* — the web gets this
  // from a numbered grid it has the width for; a phone has one column, so the
  // sequence has to be drawn.
  stepLine: { flex: 1, width: 2, backgroundColor: colors.line, marginVertical: space.xs },
  stepBody: { flex: 1, paddingBottom: space.xl },
  stepNumber: {
    fontSize: type.overline, fontFamily: font.bold, color: colors.brand,
    textTransform: 'uppercase', letterSpacing: tracking.overline,
  },
  stepTitle: { fontSize: type.h3, fontFamily: font.bold, color: colors.ink, marginTop: 2 },
  stepText: {
    fontSize: type.label, fontFamily: font.regular, color: colors.inkSoft,
    lineHeight: 21, marginTop: space.xs,
  },

  // --- Notice --------------------------------------------------------------
  noticeWrap: { paddingHorizontal: space.base, paddingBottom: space.xxl },
  notice: {
    flexDirection: 'row', gap: space.md, padding: space.base,
    backgroundColor: colors.warningSoft,
    borderWidth: 1, borderColor: colors.warningLine,
    borderLeftWidth: 3, borderLeftColor: colors.warning,
    borderRadius: radius.md,
  },
  noticeText: { flex: 1, fontSize: type.label, fontFamily: font.regular, color: '#78350f', lineHeight: 21 },

  // --- FAQ -----------------------------------------------------------------
  faqSection: {
    backgroundColor: colors.slate800,
    paddingHorizontal: space.base, paddingTop: space.xxl, paddingBottom: space.lg,
  },
  faq: {
    paddingVertical: space.base,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  faqQ: { flex: 1, fontSize: type.body, fontFamily: font.semibold, color: colors.white, lineHeight: 22 },
  faqA: {
    fontSize: type.label, fontFamily: font.regular, color: colors.slate300,
    lineHeight: 22, marginTop: space.md,
  },

  // --- Closing -------------------------------------------------------------
  closing: { padding: space.lg, paddingTop: space.xxl, alignItems: 'center' },
  closingTitle: {
    fontSize: type.h2, fontFamily: font.bold, color: colors.ink,
    letterSpacing: tracking.heading,
  },
  closingBody: {
    fontSize: type.label, fontFamily: font.regular, color: colors.inkMute,
    textAlign: 'center', lineHeight: 21, marginTop: space.sm, marginBottom: space.lg,
  },
  closingSignIn: { paddingVertical: space.md, marginTop: space.xs },
  closingSignInText: { fontSize: type.label, fontFamily: font.semibold, color: colors.brand },

  footer: {
    backgroundColor: colors.navy900,
    padding: space.lg,
    alignItems: 'center',
    gap: space.sm,
  },
  footerText: { fontSize: type.hint, fontFamily: font.regular, color: colors.slate400, textAlign: 'center' },
  footerWarn: { fontSize: type.hint, fontFamily: font.medium, color: colors.slate300, textAlign: 'center' },
  footerPowered: { fontSize: type.small, fontFamily: font.regular, color: colors.slate500, textAlign: 'center' },
});
