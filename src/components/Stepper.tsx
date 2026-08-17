import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { colors, font, radius, space, tracking, type } from '../theme';

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
  { key: 'property', label: 'Property particulars', short: 'Property' },
  { key: 'income', label: 'Household and income', short: 'Income' },
  { key: 'general', label: 'General information', short: 'General' },
  { key: 'documents', label: 'Supporting documents', short: 'Documents' },
] as const;

export type StepKey = typeof WIZARD_STEPS[number]['key'];

export default function Stepper({
  current,
  onJump,
  completed,
}: {
  current: StepKey;
  onJump?: (key: StepKey) => void;
  /**
   * Steps whose answers are actually saved and complete.
   *
   * Without this a tick meant nothing more than "you walked past here" — a
   * person could skip through five screens answering nothing and see five green
   * ticks, then be refused at submission for the things those ticks implied were
   * done. Passed in from the draft, which knows what is really on the server.
   *
   * Optional so a screen that has no draft in hand still renders sensibly; it
   * then falls back to position, which is the old behaviour.
   */
  completed?: StepKey[];
}) {
  const index = WIZARD_STEPS.findIndex((s) => s.key === current);
  const step = WIZARD_STEPS[index] ?? WIZARD_STEPS[0];

  const isDone = (key: StepKey, i: number) =>
    (completed ? completed.includes(key) : i < index);

  /**
   * Progress measures work finished, not screens visited.
   *
   * Reaching the last screen with nothing filled in should not read as 100%.
   */
  const doneCount = WIZARD_STEPS.filter((item, i) => isDone(item.key, i)).length;
  const progress = (doneCount / WIZARD_STEPS.length) * 100;

  return (
    <View style={s.wrap}>
      <View style={s.headline}>
        <View style={s.flex}>
          <Text style={s.count}>Step {index + 1} of {WIZARD_STEPS.length}</Text>
          <Text style={s.label}>{step.label}</Text>
        </View>
        <Text style={s.percent}>{Math.round(progress)}%</Text>
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
          const done = isDone(item.key, i);
          const active = i === index;
          // Anything already visited can be reopened to correct an answer, even
          // if it is not complete — being unable to go back and finish a step is
          // worse than a tick that has not been earned.
          const reachable = i < index && Boolean(onJump);

          return (
            <View key={item.key} style={s.pipCol}>
              <Pressable
                disabled={!reachable}
                onPress={() => reachable && onJump?.(item.key)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={
                  `Step ${i + 1}, ${item.label}${done ? ', completed' : active ? ', current' : ', not yet reached'}`
                }
                style={s.pipWrap}
              >
                <View style={[s.pip, done && s.pipDone, active && s.pipActive]}>
                  {done ? (
                    <Icon name="check" size={14} color={colors.white} strokeWidth={3} />
                  ) : (
                    <Text style={[s.pipText, active && s.pipTextOn]}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[s.pipLabel, active && s.pipLabelActive]} numberOfLines={1}>
                  {item.short}
                </Text>
              </Pressable>

              {/* The connector sits between pips, not under them, so the row
                  reads as one sequence rather than six unrelated badges. */}
              {i < WIZARD_STEPS.length - 1 ? (
                <View style={[s.connector, done && s.connectorDone]} />
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  wrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  headline: {
    flexDirection: 'row', alignItems: 'flex-end', gap: space.md,
    paddingHorizontal: space.base, marginBottom: space.sm,
  },
  count: {
    fontSize: type.overline,
    fontFamily: font.bold,
    color: colors.brand,
    textTransform: 'uppercase',
    letterSpacing: tracking.overline,
  },
  label: {
    fontSize: type.h3, fontFamily: font.bold, color: colors.ink,
    letterSpacing: tracking.heading, marginTop: 2,
  },
  percent: { fontSize: type.hint, fontFamily: font.bold, color: colors.inkMute },

  track: {
    height: 4,
    backgroundColor: colors.slate200,
    marginHorizontal: space.base,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginBottom: space.md,
  },
  fill: { height: 4, backgroundColor: colors.brand, borderRadius: radius.pill },

  pips: { paddingHorizontal: space.base, alignItems: 'flex-start' },
  pipCol: { flexDirection: 'row', alignItems: 'flex-start' },
  pipWrap: { alignItems: 'center', width: 58 },
  pip: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 5,
  },
  pipDone: { backgroundColor: colors.success, borderColor: colors.success },
  pipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pipText: { fontSize: type.hint, fontFamily: font.bold, color: colors.inkMute },
  pipTextOn: { color: colors.white },
  pipLabel: { fontSize: 11, fontFamily: font.medium, color: colors.inkMute, textAlign: 'center' },
  pipLabelActive: { color: colors.ink, fontFamily: font.bold },

  connector: { width: 14, height: 2, backgroundColor: colors.line, marginTop: 13 },
  connectorDone: { backgroundColor: colors.success },
});
