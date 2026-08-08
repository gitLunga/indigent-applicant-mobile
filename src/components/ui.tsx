import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { alertTone, AlertTone, badgeTone, BadgeTone, colors, control, radius, shadow, space, type, weight } from '../theme';

/**
 * The shared primitives.
 *
 * These are native reimplementations of the web client's `.btn`, `.form-group`,
 * `.panel`, `.badge` and `.alert` — same palette, same radii, same borders, same
 * wording conventions. None of the web JSX is ported; a `<Pressable>` with a
 * `hitSlop` and a pressed state is not a `<button>` with `:hover`, and
 * pretending otherwise produces a page that works with a mouse and fights a
 * thumb.
 *
 * The one deliberate departure is size: controls are 48pt rather than the web's
 * 38px, and body text is 16 rather than 14. A control that is comfortable to
 * click is not automatically comfortable to tap, and 14px inputs make iOS zoom
 * the whole page on focus.
 */

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export const H1 = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => (
  <Text style={[s.h1, style as never]}>{children}</Text>
);

export const H2 = ({ children }: { children: ReactNode }) => <Text style={s.h2}>{children}</Text>;

/** Matches `.form-section-title`: a heading with a rule under it. */
export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <View style={s.sectionTitleWrap}>
    <Text style={s.sectionTitle}>{children}</Text>
  </View>
);

export const Muted = ({ children }: { children: ReactNode }) => <Text style={s.muted}>{children}</Text>;

/** Matches `.field-hint`. `tone` turns it amber for a soft validation warning. */
export const Hint = ({ children, tone }: { children: ReactNode; tone?: 'warn' }) => (
  <Text style={[s.hint, tone === 'warn' && s.hintWarn]}>{children}</Text>
);

// ---------------------------------------------------------------------------
// Containers
// ---------------------------------------------------------------------------

/** Matches `.panel` / `.form-card`. */
export const Panel = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => (
  <View style={[s.panel, style]}>{children}</View>
);

export const Screen = ({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) => {
  if (!scroll) return <View style={s.screen}>{children}</View>;
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.screenContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {children}
    </ScrollView>
  );
};

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, small, style }: ButtonProps) {
  const busy = Boolean(loading);
  const off = Boolean(disabled) || busy;

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        variant === 'primary' && s.btnPrimary,
        variant === 'outline' && s.btnOutline,
        variant === 'ghost' && s.btnGhost,
        variant === 'danger' && s.btnDanger,
        // The web darkens on :active; a phone has no hover, so the pressed state
        // is the only feedback there is and it has to be unmistakable.
        pressed && !off && s.btnPressed,
        off && s.btnDisabled,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={variant === 'primary' || variant === 'danger' ? colors.white : colors.inkSoft} />
      ) : (
        <Text
          style={[
            s.btnText,
            small && s.btnTextSmall,
            (variant === 'outline' || variant === 'ghost') && s.btnTextMuted,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  children?: ReactNode;
};

export function Field({ label, hint, error, optional, children, ...input }: FieldProps) {
  return (
    <View style={s.group}>
      <Text style={s.label}>
        {label}
        {optional ? <Text style={s.optional}>  (optional)</Text> : null}
      </Text>

      {children ?? (
        <TextInput
          {...input}
          style={[s.input, error ? s.inputError : null, input.multiline ? s.inputMultiline : null]}
          placeholderTextColor={colors.slate400}
          // Off by default: names, addresses and account numbers are not
          // sentences, and autocapitalising them produces "Po Box" and "4512
          // Extension 3, Sebokeng" turned into something the Post Office will
          // not match. Screens that want it ask for it.
          autoCapitalize={input.autoCapitalize ?? 'none'}
          autoCorrect={input.autoCorrect ?? false}
        />
      )}

      {error ? <Text style={s.error}>{error}</Text> : hint ? <Hint>{hint}</Hint> : null}
    </View>
  );
}

/**
 * A choice, rendered as a stack of options rather than a dropdown.
 *
 * The web uses a `<select>`. A native picker is a modal wheel on iOS and a
 * dialog on Android, and both hide the options until tapped — which on a form
 * where the choice changes what is asked next (ownership changing the document
 * checklist, employment hiding the employer fields) means somebody cannot see
 * what their answer will do. Laid out flat, they can.
 */
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  error,
  optional,
}: {
  label: string;
  value: T | '';
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
  error?: string | null;
  optional?: boolean;
}) {
  return (
    <View style={s.group}>
      <Text style={s.label}>
        {label}
        {optional ? <Text style={s.optional}>  (optional)</Text> : null}
      </Text>

      <View style={s.choices}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => [s.choice, selected && s.choiceOn, pressed && s.choicePressed]}
            >
              <View style={[s.radio, selected && s.radioOn]}>
                {selected ? <View style={s.radioDot} /> : null}
              </View>
              <Text style={[s.choiceText, selected && s.choiceTextOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={s.error}>{error}</Text> : hint ? <Hint>{hint}</Hint> : null}
    </View>
  );
}

/** A yes/no question, which the web renders as a two-option select. */
export const YesNo = ({
  label, value, onChange, hint, optional,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
  hint?: string;
  optional?: boolean;
}) => (
  <Choice
    label={label}
    optional={optional}
    hint={hint}
    value={value === null || value === undefined ? '' : value ? 'yes' : 'no'}
    options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
    onChange={(v) => onChange(v === 'yes')}
  />
);

/** Matches `.checkbox-row`: a checkbox that governs the fields beneath it. */
export function CheckRow({
  label, checked, onChange, hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={({ pressed }) => [s.checkRow, checked && s.checkRowOn, pressed && s.choicePressed]}
    >
      <View style={[s.checkbox, checked && s.checkboxOn]}>
        {checked ? <Text style={s.checkMark}>✓</Text> : null}
      </View>
      <View style={s.flex}>
        <Text style={s.checkLabel}>{label}</Text>
        {hint ? <Hint>{hint}</Hint> : null}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

/** Matches `.alert`, including the 3px accent border on the leading edge. */
export const Alert = ({ tone = 'info', children }: { tone?: AlertTone; children: ReactNode }) => {
  const t = alertTone[tone];
  return (
    <View style={[s.alert, { backgroundColor: t.bg, borderColor: t.border, borderLeftColor: t.accent }]}>
      <Text style={[s.alertText, { color: t.fg }]}>{children}</Text>
    </View>
  );
};

/** Matches `.badge`. */
export const Badge = ({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) => {
  const t = badgeTone[tone];
  return (
    <View style={[s.badge, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[s.badgeText, { color: t.fg }]}>{children}</Text>
    </View>
  );
};

export const Loading = ({ label = 'Loading…' }: { label?: string }) => (
  <View style={s.loading}>
    <ActivityIndicator color={colors.brand} />
    <Muted>{label}</Muted>
  </View>
);

export const Divider = () => <View style={s.divider} />;

/** Right-aligned action row at the foot of a form, matching `.form-actions`. */
export const Actions = ({ children }: { children: ReactNode }) => <View style={s.actions}>{children}</View>;

// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  screenContent: { padding: space.base, paddingBottom: space.xxl * 2 },

  h1: { fontSize: type.h1, fontWeight: weight.semibold, color: colors.ink, marginBottom: space.xs },
  h2: { fontSize: type.h2, fontWeight: weight.semibold, color: colors.ink, marginBottom: space.sm },

  sectionTitleWrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: space.md,
    marginBottom: space.lg,
  },
  sectionTitle: { fontSize: type.sectionTitle, fontWeight: weight.semibold, color: colors.ink },

  muted: { fontSize: type.label, color: colors.inkMute, lineHeight: 21 },
  hint: { marginTop: space.xs, fontSize: type.hint, color: colors.inkMute, lineHeight: 18 },
  hintWarn: { color: colors.warning },
  error: { marginTop: space.xs, fontSize: type.hint, color: colors.danger, lineHeight: 18 },

  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.base,
    marginBottom: space.base,
    ...shadow.xs,
  },

  // --- Button --------------------------------------------------------------
  btn: {
    minHeight: control.height,
    paddingHorizontal: space.base,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  btnSmall: { minHeight: control.heightSmall, paddingHorizontal: space.md },
  btnPrimary: { backgroundColor: colors.brand, borderColor: colors.brand },
  btnDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  btnOutline: { backgroundColor: colors.transparent, borderColor: colors.lineStrong },
  btnGhost: { backgroundColor: colors.transparent, borderColor: colors.transparent },
  btnPressed: { opacity: 0.75 },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: colors.white, fontSize: type.body, fontWeight: weight.medium },
  btnTextSmall: { fontSize: type.label },
  btnTextMuted: { color: colors.inkSoft },

  // --- Fields --------------------------------------------------------------
  group: { marginBottom: space.base },
  label: { fontSize: type.label, fontWeight: weight.medium, color: colors.slate700, marginBottom: space.sm },
  optional: { fontWeight: weight.regular, color: colors.inkMute },
  input: {
    minHeight: control.height,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: type.input,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },

  choices: { gap: space.sm },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: control.minTouch,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  choiceOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  choicePressed: { opacity: 0.7 },
  choiceText: { flex: 1, fontSize: type.body, color: colors.ink },
  choiceTextOn: { fontWeight: weight.medium },

  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.lineStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: colors.brand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.slate50,
    marginBottom: space.base,
  },
  checkRowOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  checkbox: {
    width: 24, height: 24, borderRadius: radius.sm,
    borderWidth: 2, borderColor: colors.lineStrong,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
    marginTop: 1,
  },
  checkboxOn: { borderColor: colors.brand, backgroundColor: colors.brand },
  checkMark: { color: colors.white, fontSize: 15, fontWeight: weight.bold, lineHeight: 18 },
  checkLabel: { fontSize: type.body, color: colors.ink, lineHeight: 22 },

  // --- Feedback ------------------------------------------------------------
  alert: {
    flexDirection: 'row',
    padding: space.md,
    marginBottom: space.base,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: radius.md,
  },
  alertText: { flex: 1, fontSize: type.label, lineHeight: 21 },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: type.small, fontWeight: weight.semibold },

  loading: { padding: space.xxl, alignItems: 'center', gap: space.md },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space.base },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm, marginTop: space.lg },
  flex: { flex: 1 },
});
