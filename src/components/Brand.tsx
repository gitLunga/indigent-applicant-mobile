import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space, tracking, type } from '../theme';

/**
 * The municipal lockup: a red `IR` tile, the name, and what it is.
 *
 * One component because it appears in four places — the landing header, the
 * drawer, the auth screens and the splash — and a brand mark that is 32px in one
 * place and 30px in another is the kind of thing that looks like a mistake
 * without anybody being able to point at it. The web has the same problem and
 * solves it the same way, with `.sidebar-mark` and `.brand-lockup`.
 */

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <View style={[s.mark, { width: size, height: size, borderRadius: size <= 34 ? radius.md : radius.lg }]}>
      <Text style={[s.markText, { fontSize: size * 0.42 }]}>IR</Text>
    </View>
  );
}

export default function Brand({
  size = 32,
  onDark = false,
}: {
  size?: number;
  /** Navy ground — the drawer and the hero. Otherwise a white header. */
  onDark?: boolean;
}) {
  return (
    <View style={s.lockup}>
      <BrandMark size={size} />
      <View style={s.text}>
        <Text style={[s.name, onDark && s.nameOnDark]} numberOfLines={1}>
          Indigent Register
        </Text>
        <Text style={[s.sub, onDark && s.subOnDark]} numberOfLines={1}>
          Municipal Support
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  lockup: { flexDirection: 'row', alignItems: 'center', gap: space.md, minWidth: 0 },
  mark: {
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: colors.white, fontFamily: font.extraBold, letterSpacing: 0.3 },

  text: { flexShrink: 1, minWidth: 0 },
  name: { fontSize: 15, fontFamily: font.bold, color: colors.ink, letterSpacing: tracking.heading },
  nameOnDark: { color: colors.white },
  sub: {
    fontSize: type.overline, fontFamily: font.semibold, color: colors.inkMute,
    textTransform: 'uppercase', letterSpacing: tracking.overline, marginTop: 1,
  },
  subOnDark: { color: colors.slate400 },
});
