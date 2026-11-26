/**
 * Motiba Unified Design System
 * Royal Maroon (#970F18), Heritage Gold (#D9A52E) & Organic Green (#28633B)
 * Warm Ivory (#FFF8E9), Soft Wheat (#F1DDAF), Earthy Brown (#493027), Pure White (#FFFFFF), Soft Beige (#E9E0D2)
 */

// ─── COLOR TOKENS ───────────────────────────────────────────────
export const Colors = {
  // Brand Colours
  primary: '#970F18',         // Royal Maroon (Primary brand colour)
  primaryDark: '#7A0A12',     // Deep Royal Maroon
  primaryLight: '#FDF1F1',    // Light Royal Maroon Tint
  primaryMid: '#B8141F',      // Medium Maroon
  primaryTint: '#FCE8E9',     // Soft Maroon Tint
  primarySoft: '#FFF5F5',     // Softest Maroon
  primarySubtle: '#FDF1F1',   // Subtle Maroon Tint

  // Accent & Highlights
  accent: '#D9A52E',          // Heritage Gold (Accent & Highlights)
  gold: '#D9A52E',            // Heritage Gold
  goldLight: '#FBF4E4',       // Soft Gold Highlight
  goldDark: '#B8861E',        // Deep Heritage Gold
  goldTint: '#F6E6C4',        // Wheat / Gold Tint

  // Secondary Brand Colour
  secondary: '#28633B',       // Organic Green (Secondary brand colour)
  secondaryLight: '#EBF3ED',  // Soft Organic Green Tint
  secondaryDark: '#1E4B2D',   // Deep Forest Green
  secondaryTint: '#DFEFE4',   // Fresh Green Tint

  // Surfaces & Backgrounds
  background: '#FAF7F2',      // Smoky Pearl Base (Matching Admin Panel)
  surface: '#FFFFFF',         // Pure White (Cards and surfaces)
  surfaceSecondary: '#F8F4ED',// Soft Pearl / Secondary background
  surfaceTertiary: '#FFFDF8', // Pure Ivory Surface
  softWheat: '#F1DDAF',       // Soft Wheat Accent
  warmIvory: '#FAF7F2',       // Smoky Warm Ivory
  card: '#FFFFFF',            // Pure White Card
  cardElevated: '#FFFFFF',    // Pure White Elevated
  overlay: 'rgba(73, 48, 39, 0.5)', // Earthy Brown overlay

  // Typography
  text: '#493027',            // Earthy Brown (Headings and text)
  textPrimary: '#493027',     // Earthy Brown (Primary text)
  textSecondary: '#795B50',   // Muted Earthy Brown
  textTertiary: '#A3887E',    // Subtle Earthy Brown
  textLight: '#BCA59C',       // Light Earthy Brown
  textInverse: '#FFFFFF',     // Pure White on Maroon/Green
  textAccent: '#970F18',      // Royal Maroon Accent Text
  textGold: '#D9A52E',        // Heritage Gold Text

  // Borders & Dividers
  border: '#E9E0D2',          // Soft Beige (Borders and dividers)
  borderLight: '#F3EDE3',     // Light Soft Beige
  borderSubtle: '#F8F4ED',    // Very Subtle Beige
  borderFocus: '#970F18',     // Royal Maroon Active Focus
  borderMedium: '#D5C8B4',    // Medium Beige Divider
  borderStrong: '#D5C8B4',    // Strong Beige Divider
  borderGold: '#D9A52E',      // Heritage Gold Border

  // Status & Alerts
  success: '#28633B',         // Organic Green (Success messages & positive indicators)
  successLight: '#EBF3ED',    // Organic Green Tint
  successBg: '#F5FAF6',       // Soft Green Background
  warning: '#D9A52E',         // Heritage Gold (Warning / Attention)
  warningLight: '#FDF6E2',    // Gold Tint
  warningBg: '#FFFDF2',       // Light Gold Background
  error: '#970F18',           // Royal Maroon (Error / Alert)
  errorLight: '#FDF1F1',      // Soft Maroon Light
  errorBg: '#FFF5F5',         // Soft Maroon Background
  danger: '#970F18',          // Royal Maroon / Danger
  dangerLight: '#FDF1F1',     // Light Danger
  info: '#28633B',            // Organic Green / Trust Indicator
  infoLight: '#EBF3ED',       // Light Green Info
  infoBg: '#F5FAF6',          // Soft Info Background

  // Delivery & Order Status Indicators
  statusAssigned: '#D9A52E',  // Heritage Gold (Assigned / In Queue)
  statusInTransit: '#B8861E', // Deep Heritage Gold (In Transit)
  statusDelivered: '#28633B', // Organic Green (Delivered / Completed)
  statusPartial: '#970F18',   // Royal Maroon (Partially Delivered)
  statusFailed: '#970F18',    // Royal Maroon (Failed / Rejected)

  // Neutrals & Heritage Accents
  white: '#FFFFFF',           // Pure White
  black: '#1D130E',
  gray50: '#FAF8F5',
  gray100: '#F4EFE6',
  gray200: '#E9E0D2',         // Soft Beige
  gray300: '#D5C8B4',
  gray400: '#A3887E',
  gray500: '#795B50',
  gray600: '#5C4137',
  gray700: '#493027',         // Earthy Brown
  gray800: '#332019',
  gray900: '#1D130E',

  // Heritage Metric Accents
  blue: '#28633B',            // Organic Green
  blueLight: '#EBF3ED',
  purple: '#970F18',          // Royal Maroon
  purpleLight: '#FDF1F1',
  orange: '#D9A52E',          // Heritage Gold
  orangeLight: '#FDF6E2',
  teal: '#28633B',            // Organic Green
  tealLight: '#EBF3ED',
  rose: '#970F18',            // Royal Maroon
  roseLight: '#FDF1F1',
  amber: '#D9A52E',           // Heritage Gold
  amberLight: '#FDF6E2',
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

  // Headings (Delivery naming convention)
  heading1: { fontSize: 24, fontWeight: '700' as const, color: Colors.text },
  heading2: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },
  heading3: { fontSize: 16, fontWeight: '600' as const, color: Colors.text },

  // Body
  body: { fontSize: 14, fontWeight: '400' as const, color: Colors.text },
  bodyMedium: { fontSize: 14, fontWeight: '500' as const, color: Colors.text },
  bodyBold: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMd: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  bodySm: { fontSize: 13, fontWeight: '400' as const, lineHeight: 19 },

  // Labels
  labelLg: { fontSize: 14, fontWeight: '600' as const, lineHeight: 18 },
  labelMd: { fontSize: 13, fontWeight: '600' as const, lineHeight: 17 },
  labelSm: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },

  // Captions
  caption: { fontSize: 12, fontWeight: '400' as const, color: Colors.textSecondary },
  captionBold: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
  tiny: { fontSize: 10, fontWeight: '500' as const, color: Colors.textSecondary },
  captionLg: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  captionMd: { fontSize: 11, fontWeight: '500' as const, lineHeight: 15 },
  captionSm: { fontSize: 10, fontWeight: '500' as const, lineHeight: 14 },

  // Numbers / Metrics
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
  xxl: 24,
  '2xl': 24,
  xxxl: 32,
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

export const BorderRadius = Radius;

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
    shadowColor: '#493027',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#493027',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#493027',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#493027',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 5,
  },
  xl: {
    shadowColor: '#493027',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
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
