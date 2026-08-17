import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { colors, font, radius, space, type } from '../theme';

/**
 * How far an upload has actually got.
 *
 * Every upload in this app used to sit behind a spinner that never moved. A
 * household photographing an ID book produces a few megabytes, and on a rural
 * connection that is a long wait with nothing to read — which is exactly where
 * somebody taps again and creates a duplicate.
 *
 * ## The rule
 *
 * **Never show a number that is not true.** The bar is determinate only where
 * real bytes are being counted. Where the total is unknown — some React Native
 * networking stacks do not report it — this falls back to an indeterminate
 * state rather than inventing a denominator. A bar that creeps to 90% and waits
 * teaches people the number means nothing, which is worse than no number.
 *
 * Motion is restrained and drops out entirely under the OS reduce-motion
 * setting. These run on cheap Android handsets; animation heavy enough to jank
 * on the phones our applicants actually own is worse than none.
 */

const humanSize = (bytes?: number | null) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function UploadProgress({
  fileName,
  fraction,
  loaded,
  total,
  onCancel,
  done = false,
}: {
  fileName?: string | null;
  /** 0 to 1, or null when the total is unknown. */
  fraction: number | null;
  loaded?: number;
  total?: number | null;
  onCancel?: (() => void) | null;
  done?: boolean;
}) {
  const width = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { reduceMotion.current = enabled; });
  }, []);

  // The determinate bar follows the real figure.
  useEffect(() => {
    if (fraction === null) return;
    const target = done ? 1 : fraction;
    if (reduceMotion.current) {
      width.setValue(target);
      return;
    }
    Animated.timing(width, {
      toValue: target,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [fraction, done, width]);

  /**
   * The indeterminate sweep, used only when the total is genuinely unknown.
   * Looped rather than timed to a guess, because it is saying "still working",
   * not "this far along".
   */
  useEffect(() => {
    if (fraction !== null || done || reduceMotion.current) return undefined;
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [fraction, done, sweep]);

  const percent = fraction === null ? null : Math.round((done ? 1 : fraction) * 100);

  return (
    <View
      style={s.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={
        done
          ? `${fileName || 'File'} uploaded`
          : percent === null
            ? `Uploading ${fileName || 'file'}`
            : `Uploading ${fileName || 'file'}, ${percent} percent`
      }
    >
      <View style={s.head}>
        <View style={s.headText}>
          <Text style={s.name} numberOfLines={1}>{fileName || 'Uploading…'}</Text>
          <Text style={s.meta}>
            {done
              ? 'Sent'
              : percent === null
                ? `${humanSize(loaded)} sent`
                : `${percent}% · ${humanSize(loaded)} of ${humanSize(total)}`}
          </Text>
        </View>

        {/* Completion morphs into a tick rather than the row vanishing — the
            slot is already the right shape and a disappearing control reads as
            something having gone wrong. */}
        {done ? (
          <Icon name="check-circle" size={20} color={colors.success} />
        ) : onCancel ? (
          <Pressable onPress={onCancel} hitSlop={10} accessibilityLabel="Cancel this upload">
            <Icon name="close" size={18} color={colors.slate400} />
          </Pressable>
        ) : null}
      </View>

      <View style={s.track}>
        {fraction === null && !done ? (
          <Animated.View
            style={[
              s.fillIndeterminate,
              {
                left: sweep.interpolate({ inputRange: [0, 1], outputRange: ['-35%', '100%'] }),
              },
            ]}
          />
        ) : (
          <Animated.View
            style={[
              s.fill,
              done && s.fillDone,
              { width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    padding: space.md,
    backgroundColor: colors.slate50,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    marginBottom: space.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  headText: { flex: 1, minWidth: 0 },
  name: { fontFamily: font.medium, fontSize: type.label, color: colors.ink },
  meta: { fontFamily: font.regular, fontSize: type.hint, color: colors.inkSoft, marginTop: 1 },

  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.brand },
  fillDone: { backgroundColor: colors.success },
  fillIndeterminate: {
    position: 'absolute', top: 0, bottom: 0,
    width: '35%', borderRadius: 3, backgroundColor: colors.brand,
  },
});
