import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, type, weight } from '../theme';

/**
 * Where you are in the form, and how much is left.
 *
 * The web renders all six steps side by side. On a phone that would be six
 * columns of four-point type, so this shows the count and the current step's name
 * in full, with a progress bar beneath. A stepper nobody can read is decoration.
 *
 * Completed steps stay tappable so somebody can go back and correct an answer.
 * Steps ahead do not: each one saves to the server on the way out, and skipping
 * forward would post a half-filled step and collect validation errors for
 * questions the person has not reached yet.
 */

export const WIZARD_STEPS = [
  { key: 'particulars', label: 'Applicant particulars', short: 'You' },
  { key: 'verify', label: 'Verify your number', short: 'Verify' },
  { key: 'property', label: 'Property particulars', short: 'Property' },
  { key: 'income', label: 'Household and income', short: 'Income' },
  { key: 'general', label: 'General information', short: 'General' },
  { key: 'documents', label: 'Supporting documents', short: 'Documents' },
] as const;

export type StepKey = typeof WIZARD_STEPS[number]['key'];

export default function Stepper({
  current,
  onJump,
}: {
  current: StepKey;
  onJump?: (key: StepKey) => void;
}) {
  const index = WIZARD_STEPS.findIndex((s) => s.key === current);
  const step = WIZARD_STEPS[index] ?? WIZARD_STEPS[0];
  const progress = ((index + 1) / WIZARD_STEPS.length) * 100;

  return (
    <View style={s.wrap}>
      <View style={s.headline}>
        <Text style={s.count}>Step {index + 1} of {WIZARD_STEPS.length}</Text>
        <Text style={s.label}>{step.label}</Text>
      </View>

      {/* The bar carries the same information as the pips below, for anybody who
          reads shape faster than text. */}
      <View style={s.track}>
        <View style={[s.fill, { width: `${progress}%` }]} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.pips}
      >
        {WIZARD_STEPS.map((item, i) => {
          const done = i < index;
          const active = i === index;
          const reachable = done && Boolean(onJump);

          return (
            <Pressable
              key={item.key}
              disabled={!reachable}
              onPress={() => reachable && onJump?.(item.key)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Step ${i + 1}, ${item.label}${done ? ', completed' : active ? ', current' : ''}`}
              style={s.pipWrap}
            >
              <View style={[s.pip, done && s.pipDone, active && s.pipActive]}>
                <Text style={[s.pipText, (done || active) && s.pipTextOn]}>
                  {done ? '✓' : i + 1}
                </Text>
              </View>
              <Text style={[s.pipLabel, active && s.pipLabelActive]} numberOfLines={1}>
                {item.short}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  headline: { paddingHorizontal: space.base, marginBottom: space.sm },
  count: {
    fontSize: type.small,
    fontWeight: weight.semibold,
    color: colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  label: { fontSize: type.h3, fontWeight: weight.semibold, color: colors.ink, marginTop: 2 },

  track: {
    height: 3,
    backgroundColor: colors.slate200,
    marginHorizontal: space.base,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginBottom: space.md,
  },
  fill: { height: 3, backgroundColor: colors.brand, borderRadius: radius.pill },

  pips: { paddingHorizontal: space.base, gap: space.base, alignItems: 'flex-start' },
  pipWrap: { alignItems: 'center', width: 62 },
  pip: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1, borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  pipDone: { backgroundColor: colors.success, borderColor: colors.success },
  pipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pipText: { fontSize: type.small, fontWeight: weight.semibold, color: colors.inkMute },
  pipTextOn: { color: colors.white },
  pipLabel: { fontSize: 11, color: colors.inkMute, textAlign: 'center' },
  pipLabelActive: { color: colors.ink, fontWeight: weight.semibold },
});
