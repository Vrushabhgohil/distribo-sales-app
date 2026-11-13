/**
 * Distribo Sales — Premium Design System
 * Inspired by professional FMCG/Food ordering UI kits
 * Complete visual language: colors, typography, spacing, shadows, radii
 */

// ─── COLOR TOKENS ───────────────────────────────────────────────
export const Colors = {
  // Brand
  primary: '#A8D83D',
  primaryDark: '#294D32',
  primaryLight: '#F1F8E8',
  primaryMid: '#7CB342',
  primaryTint: '#E8F5D6',
  primarySoft: '#F6FCEB',

  // Surfaces
  background: '#F7F8F5',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F5EE',
  surfaceTertiary: '#FAFCF7',
  overlay: 'rgba(32, 40, 32, 0.5)',

  // Text
  textPrimary: '#202820',
  textSecondary: '#6B7266',
  textTertiary: '#9BA396',
  textInverse: '#FFFFFF',
  textAccent: '#294D32',

  // Borders
  border: '#E9EDE5',
  borderLight: '#F1F4ED',
  borderFocus: '#A8D83D',
  borderStrong: '#D0D6CA',

  // Status
  success: '#2E7D4F',
  successLight: '#E8F5EE',
  successBg: '#F0FAF4',
  warning: '#C67E1A',
  warningLight: '#FFF4E0',
  warningBg: '#FFFBF0',
  error: '#C43B3B',
  errorLight: '#FDECEC',
  errorBg: '#FEF5F5',
  info: '#2563EB',
  infoLight: '#EFF6FF',
  infoBg: '#F5F8FF',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#FAFAFA',
  gray100: '#F3F4F1',
  gray200: '#E5E7E2',
  gray300: '#D1D5CC',
  gray400: '#9CA39A',
  gray500: '#6B7268',
  gray600: '#4B5248',
  gray700: '#374133',
  gray800: '#1F2A1C',
  gray900: '#111811',

  // Accent Colors for metric cards
  blue: '#2563EB',
  blueLight: '#EFF6FF',
  purple: '#7C3AED',
  purpleLight: '#F3EEFF',
  orange: '#EA580C',
  orangeLight: '#FFF4ED',
  teal: '#0D9488',
  tealLight: '#F0FDFA',
  rose: '#E11D48',
  roseLight: '#FFF1F2',
  amber: '#D97706',
  amberLight: '#FFFBEB',
};

// ─── TYPOGRAPHY ─────────────────────────────────────────────────
export const Typography = {
  // Display / Hero
  displayLg: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.8, lineHeight: 40 },
  displayMd: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.6, lineHeight: 36 },
  displaySm: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.4, lineHeight: 32 },

  // Headings
  h1: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3, lineHeight: 28 },
  h2: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.2, lineHeight: 24 },
  h3: { fontSize: 16, fontWeight: '700' as const, letterSpacing: -0.1, lineHeight: 22 },
  h4: { fontSize: 15, fontWeight: '600' as const, letterSpacing: 0, lineHeight: 20 },

  // Body
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMd: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  bodySm: { fontSize: 13, fontWeight: '400' as const, lineHeight: 19 },

  // Labels
  labelLg: { fontSize: 14, fontWeight: '600' as const, lineHeight: 18 },
  labelMd: { fontSize: 13, fontWeight: '600' as const, lineHeight: 17 },
  labelSm: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },

  // Captions
  captionLg: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  captionMd: { fontSize: 11, fontWeight: '500' as const, lineHeight: 15 },
  captionSm: { fontSize: 10, fontWeight: '500' as const, lineHeight: 14 },

  // Numbers
  statXl: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5, lineHeight: 34 },
  statLg: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3, lineHeight: 28 },
  statMd: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.2, lineHeight: 24 },
  statSm: { fontSize: 15, fontWeight: '700' as const, letterSpacing: -0.1, lineHeight: 20 },

  // Button
  buttonLg: { fontSize: 16, fontWeight: '700' as const, letterSpacing: 0.2, lineHeight: 20 },
  buttonMd: { fontSize: 14, fontWeight: '700' as const, letterSpacing: 0.1, lineHeight: 18 },
  buttonSm: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.1, lineHeight: 16 },

  // Overline / Pill
  overline: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.8, lineHeight: 14 },
};

// ─── SPACING ────────────────────────────────────────────────────
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

// ─── BORDER RADIUS ──────────────────────────────────────────────
export const Radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  full: 9999,
};

// ─── SHADOWS ────────────────────────────────────────────────────
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#1A2E1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#1A2E1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A2E1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1A2E1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 5,
  },
  xl: {
    shadowColor: '#1A2E1A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
};

// ─── ICON SIZES ─────────────────────────────────────────────────
export const IconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
};

// ─── HIT SLOP ───────────────────────────────────────────────────
export const HitSlop = {
  sm: { top: 6, bottom: 6, left: 6, right: 6 },
  md: { top: 10, bottom: 10, left: 10, right: 10 },
  lg: { top: 14, bottom: 14, left: 14, right: 14 },
};

// ─── BACKWARD COMPAT (deprecated — use Colors/Spacing/Radius directly) ──
export const BorderRadius = Radius;
