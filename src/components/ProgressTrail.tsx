import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon, { IconName } from './Icon';
import { colors, font, radius, space, tracking, type } from '../theme';

/**
 * How far an application has got, as a household reads it.
 *
 * The municipality's own view of this names the officer at every stage. This one
 * never does, and that is deliberate rather than an omission: an applicant is
 * entitled to know where their application is, not who is holding it. The server
 * applies the same rule — the timeline endpoint filters officers out before the
 * response leaves the building, so nothing here is relying on the app to hide it.
 *
 * Four states, and each looks different at a glance:
 *
 *   done      a green tick, with the date it actually happened
 *   current   the brand red, ringed, so the eye lands on it first
 *   blocked   amber, because something is waiting on the household
 *   upcoming  quiet grey, present so the whole road is visible from the start
 *
 * Showing the upcoming steps matters. Somebody at step two who cannot see steps
 * three to six has no idea whether they are nearly done or barely started.
 */

export type Stage = {
  key: string;
  label: string;
  description?: string | null;
  at?: string | null;
  state: 'done' | 'current' | 'upcoming' | 'blocked';
  outcome?: string | null;
};

/**
 * An icon per state.
 *
 * `upcoming` never reaches this — it draws a plain dot instead, because a step
 * nobody has started should not carry a symbol suggesting anything about it.
 */
const ICON: Record<Exclude<Stage['state'], 'upcoming'>, IconName> = {
  done: 'check',
  current: 'refresh',
  blocked: 'alert-triangle',
};

const dateZA = (value?: string | null) =>
  (value ? new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : null);

export default function ProgressTrail({ stages = [] }: { stages: Stage[] }) {
  if (!stages.length) return null;

  return (
    <View style={s.wrap}>
      {stages.map((stage, i) => {
        const last = i === stages.length - 1;
        const tone = stage.state;

        return (
          <View key={stage.key} style={s.row}>
            {/* The rail: mark plus the line down to the next one. */}
            <View style={s.rail}>
              <View style={[s.mark, s[`mark_${tone}` as const]]}>
                {tone === 'upcoming' ? (
                  <View style={s.dot} />
                ) : (
                  <Icon
                    name={ICON[tone as Exclude<Stage['state'], 'upcoming'>]}
                    size={13}
                    color={colors.white}
                    strokeWidth={tone === 'done' ? 3 : 2.5}
                  />
                )}
              </View>

              {!last ? (
                // The connector is coloured only as far as the work has got, so
                // the filled length is itself the progress bar.
                <View style={[s.line, (tone === 'done') && s.lineDone]} />
              ) : null}
            </View>

            <View style={[s.body, last && s.bodyLast]}>
              <View style={s.head}>
                <Text style={[s.label, tone === 'current' && s.labelCurrent, tone === 'upcoming' && s.labelUpcoming]}>
                  {stage.label}
                </Text>
                {stage.at ? <Text style={s.when}>{dateZA(stage.at)}</Text> : null}
              </View>

              {stage.description ? (
                <Text style={[s.description, tone === 'upcoming' && s.descriptionUpcoming]}>
                  {stage.description}
                </Text>
              ) : null}

              {/* Only the stage that is actually moving gets a marker, so the
                  eye lands on the one thing that is happening now. */}
              {tone === 'current' ? (
                <View style={s.nowTag}>
                  <Text style={s.nowText}>Happening now</Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: space.sm },
  row: { flexDirection: 'row', gap: space.md },

  rail: { alignItems: 'center', width: 26 },
  mark: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.transparent,
  },
  mark_done: { backgroundColor: colors.success },
  mark_current: { backgroundColor: colors.brand, borderColor: colors.brandBorder },
  mark_blocked: { backgroundColor: colors.warning },
  mark_upcoming: { backgroundColor: colors.surface, borderColor: colors.lineStrong },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.slate300 },

  line: { flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 2 },
  lineDone: { backgroundColor: colors.success },

  body: { flex: 1, paddingBottom: space.lg },
  bodyLast: { paddingBottom: 0 },

  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  label: { flex: 1, fontFamily: font.semibold, fontSize: type.body, color: colors.ink, letterSpacing: tracking.heading },
  labelCurrent: { color: colors.brand },
  labelUpcoming: { color: colors.inkMute, fontFamily: font.medium },
  when: { fontFamily: font.regular, fontSize: type.small, color: colors.inkMute },

  description: { fontFamily: font.regular, fontSize: type.hint, color: colors.inkSoft, lineHeight: 19, marginTop: 3 },
  descriptionUpcoming: { color: colors.slate400 },

  nowTag: {
    alignSelf: 'flex-start',
    marginTop: space.sm,
    paddingHorizontal: space.sm, paddingVertical: 3,
    backgroundColor: colors.brandSoft,
    borderWidth: 1, borderColor: colors.brandBorder,
    borderRadius: radius.pill,
  },
  nowText: {
    fontFamily: font.bold, fontSize: 11, color: colors.brand,
    textTransform: 'uppercase', letterSpacing: tracking.overline,
  },
});
