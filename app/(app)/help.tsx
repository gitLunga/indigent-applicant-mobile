import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Icon, { IconName } from '../../src/components/Icon';
import { Hint, Panel, Screen, SectionTitle } from '../../src/components/ui';
import { useApplication } from '../../src/services/application';
import { colors, font, radius, space, tracking, type } from '../../src/theme';

/**
 * Help & FAQ, ported from the web's `Help.jsx`.
 *
 * The seven questions and their answers are the web's, word for word. They are
 * the municipality's answers, not ours, and rewriting them on a phone would
 * quietly give two channels two different official positions on how long a
 * review takes.
 *
 * The reference number is surfaced at the top rather than left on the dashboard:
 * every one of the contact routes below asks for it, and "you will find it on
 * your dashboard" is an instruction to go somewhere else and come back.
 */

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Who qualifies for indigent support?',
    a: 'Households whose combined gross monthly income falls at or below the municipal threshold. Income '
      + 'includes salaries, pensions, disability grants, income from a business run at home, and rent received '
      + 'from part of the property.',
  },
  {
    q: 'What documents do I need?',
    a: 'A certified copy of your ID, three months of bank statements, and a signed affidavit are required. A '
      + 'proof of grant, death certificate or letter of authority may also be attached if they apply to your '
      + 'household.',
  },
  {
    q: 'How long does the process take?',
    a: 'Applications are reviewed within 14 days of submission. You can check the status of your application at '
      + 'any time from your dashboard.',
  },
  {
    q: 'Can I re-apply if my application is declined?',
    a: 'Yes. If your circumstances change, or if your application was declined because a document was unclear, '
      + 'you may submit a new application with corrected information.',
  },
  {
    q: 'How is household income calculated?',
    a: 'Every source of income for everyone living on the property is added together to give a gross monthly '
      + 'household figure. That total is then divided by the number of people on the property to give the '
      + 'income per person.',
  },
  {
    q: 'Why do I need to verify my cell number?',
    a: 'The municipality uses your cell number to contact you about your application. Verifying it with a '
      + 'one-time code confirms the number is yours and reachable.',
  },
  {
    q: 'Can I change my application after submitting it?',
    a: 'No. Once submitted, an application is locked so that the reviewer sees exactly what you declared. '
      + 'Contact your municipal office if something needs correcting.',
  },
];

const CONTACTS: { icon: IconName; text: string }[] = [
  { icon: 'phone', text: 'Municipal call centre — office hours, Monday to Friday' },
  { icon: 'mail', text: 'Email the indigent support desk with your reference number' },
  { icon: 'home', text: 'Visit your nearest municipal customer care office in person' },
];

export default function Help() {
  const router = useRouter();
  const { application } = useApplication();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Screen>
      {application?.reference ? (
        <Pressable
          onPress={() => router.push('/(app)/dashboard')}
          style={({ pressed }) => [s.reference, pressed && s.referencePressed]}
        >
          <View style={s.referenceIcon}>
            <Icon name="file-check" size={18} color={colors.brand} strokeWidth={1.9} />
          </View>
          <View style={s.flex}>
            <Text style={s.referenceLabel}>Your reference</Text>
            <Text style={s.referenceValue}>{application.reference}</Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.slate400} />
        </Pressable>
      ) : null}

      <Panel>
        <SectionTitle icon="help">Frequently asked questions</SectionTitle>

        {FAQS.map((item, i) => {
          const isOpen = open === i;
          const last = i === FAQS.length - 1;

          return (
            <Pressable
              key={item.q}
              onPress={() => setOpen(isOpen ? null : i)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              style={[s.faq, last && s.faqLast]}
            >
              <View style={s.faqHead}>
                <Text style={[s.faqQ, isOpen && s.faqQOpen]}>{item.q}</Text>
                <Icon
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={17}
                  color={isOpen ? colors.brand : colors.slate400}
                />
              </View>
              {isOpen ? <Text style={s.faqA}>{item.a}</Text> : null}
            </Pressable>
          );
        })}
      </Panel>

      <Panel>
        <SectionTitle icon="phone">Still need help?</SectionTitle>
        <Hint>
          If your question is not answered above, contact your municipal office. Have your application
          reference ready.
        </Hint>

        <View style={s.contacts}>
          {CONTACTS.map((contact) => (
            <View key={contact.text} style={s.contact}>
              <Icon name={contact.icon} size={17} color={colors.inkMute} />
              <Text style={s.contactText}>{contact.text}</Text>
            </View>
          ))}
        </View>
      </Panel>

      <Panel>
        <SectionTitle icon="shield">Nobody should ask you for money</SectionTitle>
        <Text style={s.warn}>
          Applying for indigent support is free. The municipality will never ask you to pay to submit an
          application, to speed one up, or to have one approved. If an official asks you for money, report it to
          your municipal office.
        </Text>
      </Panel>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },

  reference: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, marginBottom: space.base,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.brandBorder, borderRadius: radius.lg,
  },
  referencePressed: { backgroundColor: colors.brandSoft },
  referenceIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  referenceLabel: {
    fontSize: type.overline, fontFamily: font.bold, color: colors.inkMute,
    textTransform: 'uppercase', letterSpacing: tracking.overline,
  },
  referenceValue: { fontSize: type.body, fontFamily: font.bold, color: colors.ink, marginTop: 1 },

  faq: { paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  faqLast: { borderBottomWidth: 0, paddingBottom: 0 },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  faqQ: { flex: 1, fontSize: type.body, fontFamily: font.semibold, color: colors.ink, lineHeight: 22 },
  faqQOpen: { color: colors.brand },
  faqA: {
    fontSize: type.label, fontFamily: font.regular, color: colors.inkSoft,
    lineHeight: 22, marginTop: space.sm,
  },

  contacts: { gap: space.sm, marginTop: space.md },
  contact: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md,
    backgroundColor: colors.slate50,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
  },
  contactText: { flex: 1, fontSize: type.label, fontFamily: font.regular, color: colors.inkSoft, lineHeight: 20 },

  warn: { fontSize: type.label, fontFamily: font.regular, color: colors.inkSoft, lineHeight: 22 },
});
