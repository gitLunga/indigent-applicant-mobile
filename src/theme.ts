/**
 * The design system, taken verbatim from the web portal.
 *
 * Every value here is a literal copy of a custom property in the web client's
 * `src/styles/index.css`. Nothing is approximated and nothing is "close enough":
 * the two front ends are the same municipality, and a red that is one shade off
 * on a phone is the kind of thing a resident notices without being able to say
 * why it looks wrong.
 *
 * When the web palette changes, change it here in the same commit.
 */

export const colors = {
  // Brand
  brand: '#c81e26',
  brandStrong: '#a5161d',
  brandSoft: '#fef2f2',
  brandBorder: '#fecaca',

  // Institutional navy
  navy900: '#0b1220',
  navy800: '#131c2e',
  navy700: '#1e2a41',
  navy600: '#2b3a55',

  // Neutrals
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',

  // Semantic
  success: '#15803d',
  successSoft: '#f0fdf4',
  successLine: '#bbf7d0',
  warning: '#b45309',
  warningSoft: '#fffbeb',
  warningLine: '#fde68a',
  danger: '#b91c1c',
  dangerSoft: '#fef2f2',
  dangerLine: '#fecaca',
  info: '#1d4ed8',
  infoSoft: '#eff6ff',
  infoLine: '#bfdbfe',

  // Roles
  canvas: '#f6f7f9',
  surface: '#ffffff',
  line: '#e2e8f0',
  lineStrong: '#cbd5e1',
  ink: '#0f172a',
  inkSoft: '#475569',
  inkMute: '#64748b',

  white: '#ffffff',
  transparent: 'transparent',
} as const;

/**
 * Shape.
 *
 * The web uses 4 / 6 / 10px. Kept identical rather than rounded up to the
 * chunkier radii mobile designs often reach for — this is a government form,
 * and it should read as one on both.
 */
export const radius = {
  sm: 4,
  md: 6,
  lg: 10,
  pill: 999,
} as const;

/**
 * Spacing, in the 4px steps the web CSS works in.
 *
 * The web sets rem values against a 14px base; these are the pixel equivalents
 * of the ones the components actually use.
 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Type scale.
 *
 * The web body is 14px. On a phone held at arm's length that is too small for a
 * form somebody is filling in carefully, and 14px inputs make iOS zoom on focus
 * — so **inputs and body text step up to 16**. Headings keep their relative
 * proportions. This is the one place the mobile app deliberately departs from
 * the web, and it departs upward.
 */
export const type = {
  // Body and controls
  body: 16,
  input: 16,
  label: 14,
  hint: 13,
  small: 12,

  // Headings
  h1: 26,
  h2: 20,
  h3: 17,
  sectionTitle: 17,
} as const;

export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Elevation.
 *
 * React Native has no box-shadow, so the web's shadows are expressed as the
 * nearest iOS shadow plus an Android elevation. `shadowColor` is the web's
 * rgba(15, 23, 42, …) — slate-900 — rather than pure black, which is why the
 * cards read as cool grey rather than dirty.
 */
export const shadow = {
  xs: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sm: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

/**
 * Controls.
 *
 * The web's 38px minimum height is below the 44pt everyone agrees a touch target
 * needs, so controls grow. A button that is hard to hit on a phone is not a
 * faithful port of a button that was easy to click with a mouse.
 */
export const control = {
  height: 48,
  heightSmall: 38,
  minTouch: 44,
} as const;

export type BadgeTone = 'approved' | 'pending' | 'draft' | 'declined' | 'neutral' | 'uploaded';

/** Status colours, matching `.badge-*` in the web stylesheet exactly. */
export const badgeTone: Record<BadgeTone, { bg: string; border: string; fg: string }> = {
  approved: { bg: colors.successSoft, border: colors.successLine, fg: colors.success },
  uploaded: { bg: colors.successSoft, border: colors.successLine, fg: colors.success },
  pending: { bg: colors.warningSoft, border: colors.warningLine, fg: colors.warning },
  draft: { bg: colors.warningSoft, border: colors.warningLine, fg: colors.warning },
  declined: { bg: colors.dangerSoft, border: colors.dangerLine, fg: colors.danger },
  neutral: { bg: colors.slate100, border: colors.slate200, fg: colors.slate600 },
};

export type AlertTone = 'error' | 'info' | 'success' | 'warning';

/** Alert colours, matching `.alert-*` including the darker text colours. */
export const alertTone: Record<AlertTone, { bg: string; border: string; accent: string; fg: string }> = {
  error: { bg: colors.dangerSoft, border: colors.dangerLine, accent: colors.danger, fg: '#7f1d1d' },
  info: { bg: colors.infoSoft, border: colors.infoLine, accent: colors.info, fg: '#1e3a8a' },
  success: { bg: colors.successSoft, border: colors.successLine, accent: colors.success, fg: '#14532d' },
  warning: { bg: colors.warningSoft, border: colors.warningLine, accent: colors.warning, fg: '#78350f' },
};

/** Map an application status to its badge tone, as the web does. */
export function statusTone(status?: string | null): BadgeTone {
  switch (status) {
    case 'APPROVED': return 'approved';
    case 'DECLINED': return 'declined';
    case 'PENDING': return 'pending';
    case 'DRAFT': return 'draft';
    default: return 'neutral';
  }
}
