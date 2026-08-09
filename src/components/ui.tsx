import React, { ReactNode, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, { IconName } from './Icon';
import {
  alertTone, AlertTone, badgeTone, BadgeTone, colors, control, font, radius, shadow, space, tracking, type,
} from '../theme';

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
 * The deliberate departures from the web are all upward: controls are 48pt
 * rather than 38px, body text is 16 rather than 14 (14px inputs make iOS zoom
 * the whole page on focus), and weight is carried by font family rather than
 * `fontWeight` — see the note on `font` in the theme for why that is not
 * optional.
 */

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export const H1 = ({ children, style }: { children: ReactNode; style?: TextStyle }) => (
  <Text style={[s.h1, style]}>{children}</Text>
);

export const H2 = ({ children, style }: { children: ReactNode; style?: TextStyle }) => (
  <Text style={[s.h2, style]}>{children}</Text>
);

/** Matches `.form-section-title`: a heading with a rule under it. */
export const SectionTitle = ({ children, icon }: { children: ReactNode; icon?: IconName }) => (
  <View style={s.sectionTitleWrap}>
    {icon ? <Icon name={icon} size={17} color={colors.brand} /> : null}
    <Text style={s.sectionTitle}>{children}</Text>
  </View>
);

/**
 * Small caps with tracking — "APPLICATION STATUS", "STEP 2 OF 6".
 *
 * Caps at 11px close up into a grey block without the extra tracking, which is
 * why this is a component rather than three properties copied around.
 */
export const Overline = ({ children, color = colors.brand }: { children: ReactNode; color?: string }) => (
  <Text style={[s.overline, { color }]}>{children}</Text>
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
  icon?: IconName;
  /** Puts the icon after the label — for "continue" style actions. */
  iconAfter?: boolean;
  style?: ViewStyle;
};

export function Button({
  title, onPress, variant = 'primary', disabled, loading, small, icon, iconAfter, style,
}: ButtonProps) {
  const busy = Boolean(loading);
  const off = Boolean(disabled) || busy;
  const onDark = variant === 'primary' || variant === 'danger';
  const fg = onDark ? colors.white : colors.inkSoft;

  const glyph = icon && !busy
    ? <Icon name={icon} size={small ? 15 : 17} color={off ? fg : fg} />
    : null;

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
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {!iconAfter ? glyph : null}
          <Text style={[s.btnText, small && s.btnTextSmall, !onDark && s.btnTextMuted]}>
            {title}
          </Text>
          {iconAfter ? glyph : null}
        </>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

/** Label, then the control, then whichever of error/hint applies. */
function FieldShell({
  label, hint, error, optional, children,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={s.group}>
      {label ? (
        <Text style={s.label}>
          {label}
          {optional ? <Text style={s.optional}>  (optional)</Text> : null}
        </Text>
      ) : null}

      {children}

      {error ? (
        <View style={s.errorRow}>
          <Icon name="alert-circle" size={13} color={colors.danger} />
          <Text style={s.error}>{error}</Text>
        </View>
      ) : hint ? <Hint>{hint}</Hint> : null}
    </View>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  /** Rendered inside the input's leading edge — a currency R, a phone glyph. */
  prefix?: string;
  children?: ReactNode;
};

export function Field({ label, hint, error, optional, prefix, children, ...input }: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional}>
      {children ?? (
        <View style={[
          s.inputWrap,
          focused && s.inputWrapFocused,
          error ? s.inputWrapError : null,
          input.multiline ? s.inputWrapMultiline : null,
        ]}>
          {prefix ? <Text style={s.prefix}>{prefix}</Text> : null}
          <TextInput
            {...input}
            onFocus={(e) => { setFocused(true); input.onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); input.onBlur?.(e); }}
            style={[s.input, input.multiline ? s.inputMultiline : null]}
            placeholderTextColor={colors.slate400}
            // Off by default: names, addresses and account numbers are not
            // sentences, and autocapitalising them produces "Po Box" and "4512
            // Extension 3, Sebokeng" turned into something the Post Office will
            // not match. Screens that want it ask for it.
            autoCapitalize={input.autoCapitalize ?? 'none'}
            autoCorrect={input.autoCorrect ?? false}
          />
        </View>
      )}
    </FieldShell>
  );
}

/**
 * A choice laid out flat, as a stack of radio rows.
 *
 * Used where the answer changes what is asked next — tenure changing the
 * document checklist, a functioning question that belongs to a scale. Laid out
 * flat, somebody can see every option and what picking it will do before they
 * commit. Behind a dropdown they cannot.
 *
 * For long lists, or lists whose options are just names, use `Select`. Ten radio
 * rows is not a considered choice, it is a wall.
 */
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  error,
  optional,
  columns,
}: {
  label: string;
  value: T | '';
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  /** Two-up, for short labels like Female/Male that waste a row each. */
  columns?: boolean;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional}>
      <View style={[s.choices, columns && s.choicesRow]}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                s.choice,
                columns && s.choiceColumn,
                selected && s.choiceOn,
                pressed && s.choicePressed,
              ]}
            >
              <View style={[s.radio, selected && s.radioOn]}>
                {selected ? <View style={s.radioDot} /> : null}
              </View>
              <Text style={[s.choiceText, selected && s.choiceTextOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </FieldShell>
  );
}

/**
 * A dropdown, for lists that are long or whose options do not change the form.
 *
 * Looks like a text input with a chevron — the same shape the web's `<select>`
 * has, down to the chevron sitting inside the trailing edge — and opens a sheet
 * from the bottom rather than a picker wheel. A wheel on iOS and a dialog on
 * Android are two different interactions with two different hit targets; a sheet
 * is one, and it is where a thumb already is.
 *
 * The search box appears once the list is long enough to scroll, so a household
 * relationship or a title is typed rather than hunted for.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Please choose',
  hint,
  error,
  optional,
  searchable,
}: {
  label: string;
  value: T | '';
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  /** Defaults to on once the list passes eight. */
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();

  const selected = options.find((o) => o.value === value);
  const withSearch = searchable ?? options.length > 8;

  const shown = useMemo(() => {
    if (!withSearch || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, withSearch]);

  const close = () => { setOpen(false); setQuery(''); };

  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${selected ? selected.label : placeholder}`}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [
          s.selectField,
          error ? s.inputWrapError : null,
          pressed && s.selectPressed,
        ]}
      >
        <Text style={[s.selectValue, !selected && s.selectPlaceholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.slate500} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={close}
        statusBarTranslucent
      >
        {/* The scrim closes on tap, which is the gesture people try first. */}
        <Pressable style={s.scrim} onPress={close} accessibilityLabel="Close" />

        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, space.base) }]}>
          <View style={s.sheetGrip} />

          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>{label}</Text>
            <Pressable onPress={close} hitSlop={12} accessibilityLabel="Close">
              <Icon name="close" size={20} color={colors.inkMute} />
            </Pressable>
          </View>

          {withSearch ? (
            <View style={s.searchWrap}>
              <Icon name="search" size={17} color={colors.slate400} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={colors.slate400}
                style={s.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          ) : null}

          <ScrollView
            style={s.sheetList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {shown.length === 0 ? (
              <Text style={s.sheetEmpty}>Nothing matches “{query.trim()}”.</Text>
            ) : shown.map((option) => {
              const on = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => { onChange(option.value); close(); }}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [s.option, pressed && s.optionPressed]}
                >
                  <Text style={[s.optionText, on && s.optionTextOn]}>{option.label}</Text>
                  {on ? <Icon name="check" size={19} color={colors.brand} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </FieldShell>
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
    columns
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
        {checked ? <Icon name="check" size={15} color={colors.white} strokeWidth={3} /> : null}
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

const ALERT_ICON: Record<AlertTone, IconName> = {
  error: 'alert-circle',
  warning: 'alert-triangle',
  success: 'check-circle',
  info: 'info',
};

/** Matches `.alert`, including the 3px accent border on the leading edge. */
export const Alert = ({ tone = 'info', children }: { tone?: AlertTone; children: ReactNode }) => {
  const t = alertTone[tone];
  return (
    <View style={[s.alert, { backgroundColor: t.bg, borderColor: t.border, borderLeftColor: t.accent }]}>
      <View style={s.alertIcon}>
        <Icon name={ALERT_ICON[tone]} size={17} color={t.accent} />
      </View>
      <Text style={[s.alertText, { color: t.fg }]}>{children}</Text>
    </View>
  );
};

/** Matches `.badge`. */
export const Badge = ({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) => {
  const t = badgeTone[tone];
  return (
    <View style={[s.badge, { backgroundColor: t.bg, borderColor: t.border }]}>
      <View style={[s.badgeDot, { backgroundColor: t.fg }]} />
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

/**
 * A grey block standing in for content that has not arrived.
 *
 * The web has `ui/Skeleton.jsx` for the same job. A spinner says "something is
 * happening"; a skeleton says "a list is coming and it will be about this big",
 * which stops the screen jumping when it lands.
 */
export const Skeleton = ({ height = 16, width = '100%', style }: {
  height?: number; width?: number | `${number}%`; style?: ViewStyle;
}) => <View style={[s.skeleton, { height, width }, style]} />;

export function EmptyState({
  icon, title, body, action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyMark}>
        <Icon name={icon} size={26} color={colors.slate400} strokeWidth={1.75} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
      {action ? <View style={s.emptyAction}>{action}</View> : null}
    </View>
  );
}

export const Divider = () => <View style={s.divider} />;

/** Right-aligned action row at the foot of a form, matching `.form-actions`. */
export const Actions = ({ children }: { children: ReactNode }) => <View style={s.actions}>{children}</View>;

// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  screenContent: { padding: space.base, paddingBottom: space.xxl * 2 },

  h1: {
    fontSize: type.h1, fontFamily: font.bold, color: colors.ink,
    letterSpacing: tracking.heading, marginBottom: space.xs,
  },
  h2: {
    fontSize: type.h2, fontFamily: font.semibold, color: colors.ink,
    letterSpacing: tracking.heading, marginBottom: space.sm,
  },

  sectionTitleWrap: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: space.md,
    marginBottom: space.lg,
  },
  sectionTitle: {
    flex: 1, fontSize: type.sectionTitle, fontFamily: font.semibold,
    color: colors.ink, letterSpacing: tracking.heading,
  },

  overline: {
    fontSize: type.overline, fontFamily: font.bold,
    textTransform: 'uppercase', letterSpacing: tracking.overline,
  },

  muted: { fontSize: type.label, fontFamily: font.regular, color: colors.inkMute, lineHeight: 21 },
  hint: { marginTop: space.xs, fontSize: type.hint, fontFamily: font.regular, color: colors.inkMute, lineHeight: 18 },
  hintWarn: { color: colors.warning },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: space.xs },
  error: { flex: 1, fontSize: type.hint, fontFamily: font.medium, color: colors.danger, lineHeight: 18 },

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
  btnText: { color: colors.white, fontSize: type.body, fontFamily: font.semibold },
  btnTextSmall: { fontSize: type.label },
  btnTextMuted: { color: colors.inkSoft },

  // --- Fields --------------------------------------------------------------
  group: { marginBottom: space.base },
  label: { fontSize: type.label, fontFamily: font.semibold, color: colors.slate700, marginBottom: space.sm },
  optional: { fontFamily: font.regular, color: colors.inkMute },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: control.height,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  // The web's focus ring is a box-shadow, which RN has no equivalent for on a
  // bordered box — so focus is carried by the border colour plus a soft brand
  // wash, which reads at a glance without faking a shadow that would clip.
  inputWrapFocused: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  inputWrapError: { borderColor: colors.danger },
  inputWrapMultiline: { alignItems: 'flex-start', paddingVertical: space.sm },
  prefix: { fontSize: type.input, fontFamily: font.medium, color: colors.inkMute, marginRight: space.sm },
  input: {
    flex: 1,
    paddingVertical: space.md,
    color: colors.ink,
    fontSize: type.input,
    fontFamily: font.regular,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },

  choices: { gap: space.sm },
  choicesRow: { flexDirection: 'row' },
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
  choiceColumn: { flex: 1 },
  choiceOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  choicePressed: { opacity: 0.7 },
  choiceText: { flex: 1, fontSize: type.body, fontFamily: font.regular, color: colors.ink },
  choiceTextOn: { fontFamily: font.semibold },

  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.lineStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: colors.brand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },

  // --- Select --------------------------------------------------------------
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: control.height,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  selectPressed: { backgroundColor: colors.slate50, borderColor: colors.slate400 },
  selectValue: { flex: 1, fontSize: type.input, fontFamily: font.regular, color: colors.ink },
  selectPlaceholder: { color: colors.slate400 },

  scrim: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: space.base,
    paddingTop: space.sm,
    // Bounded so a long list cannot grow past the screen and hide its own
    // scroll — the sheet keeps the scrim visible above it as a way out.
    maxHeight: '78%',
    ...shadow.md,
  },
  sheetGrip: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: radius.pill,
    backgroundColor: colors.slate300, marginBottom: space.md,
  },
  sheetHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: space.md, paddingBottom: space.md,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  sheetTitle: { flex: 1, fontSize: type.h3, fontFamily: font.semibold, color: colors.ink },
  sheetList: { marginTop: space.xs },
  sheetEmpty: {
    fontSize: type.label, fontFamily: font.regular, color: colors.inkMute,
    paddingVertical: space.lg, textAlign: 'center',
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    marginTop: space.md,
    paddingHorizontal: space.md,
    minHeight: control.heightSmall + 6,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    backgroundColor: colors.slate50,
  },
  searchInput: { flex: 1, paddingVertical: space.sm, fontSize: type.body, fontFamily: font.regular, color: colors.ink },

  option: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    minHeight: 52, paddingVertical: space.md,
    borderBottomWidth: 1, borderBottomColor: colors.slate100,
  },
  optionPressed: { backgroundColor: colors.slate50 },
  optionText: { flex: 1, fontSize: type.body, fontFamily: font.regular, color: colors.ink, lineHeight: 22 },
  optionTextOn: { fontFamily: font.semibold, color: colors.brand },

  // --- Checkbox ------------------------------------------------------------
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
  checkLabel: { fontSize: type.body, fontFamily: font.regular, color: colors.ink, lineHeight: 22 },

  // --- Feedback ------------------------------------------------------------
  alert: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    marginBottom: space.base,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: radius.md,
  },
  alertIcon: { paddingTop: 2 },
  alertText: { flex: 1, fontSize: type.label, fontFamily: font.regular, lineHeight: 21 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: type.small, fontFamily: font.bold, letterSpacing: 0.2 },

  loading: { padding: space.xxl, alignItems: 'center', gap: space.md },

  skeleton: { backgroundColor: colors.slate200, borderRadius: radius.sm, marginBottom: space.sm },

  empty: { alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.base },
  emptyMark: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.slate100,
    borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space.base,
  },
  emptyTitle: { fontSize: type.h3, fontFamily: font.semibold, color: colors.ink, textAlign: 'center' },
  emptyBody: {
    fontSize: type.label, fontFamily: font.regular, color: colors.inkMute,
    textAlign: 'center', lineHeight: 21, marginTop: space.xs, maxWidth: 300,
  },
  emptyAction: { marginTop: space.lg, alignSelf: 'stretch' },

  divider: { height: 1, backgroundColor: colors.line, marginVertical: space.base },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm, marginTop: space.lg },
  flex: { flex: 1 },
});
