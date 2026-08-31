import { Platform, StyleSheet } from 'react-native';

/**
 * Design tokens — single source of truth for colors, spacing, radius, type, shadow.
 * Page bg uses a warm off-white (米白) with off-black text. Primary is a desaturated
 * leaf green (CTA, progress, success). Accent is a cool blue reserved for text links
 * and link-style actions. Never use accent as a filled button.
 *
 * Typography uses a single family — Noto Sans SC — for Chinese, English and mixed
 * CJK/Latin text. Editorial feel comes from size hierarchy, weight contrast,
 * italic emphasis, and tracked UPPERCASE labels, NOT from a serif/sans pair
 * (mixed families looked inconsistent across the app). Fonts are loaded once in
 * `src/app/_layout.tsx` via `useFonts` from expo-font with assets from
 * `@expo-google-fonts/noto-sans-sc`.
 */

export const colors = {
  // Surfaces
  bg: '#F3F5F2',           // page background (米白)
  surface: '#FFFFFF',      // card / input / sheet
  surfaceMuted: '#FAFBF8', // subtle background (chips, bubbles)

  // Text — off-black primary, warm grays for hierarchy
  text: '#1A1A1A',
  textMuted: '#6B6B66',
  textSubtle: '#9B9B95',

  // Borders / dividers — single token; previous code used 5+ grays
  border: '#E5E5DF',
  borderStrong: '#D4D4CD',

  // Brand
  primary: '#7CB342',
  primaryPressed: '#6FA13A',
  primaryText: '#FFFFFF',

  // Accent (links / link-style actions only — never filled CTA)
  accent: '#208AEF',

  // Status
  gold: '#F5B400',         // star rating
  danger: '#C0392B',
  warning: '#B8860B',

  // Overlays
  backdrop: 'rgba(0, 0, 0, 0.45)',
  overlay: 'rgba(0, 0, 0, 0.55)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const shadow = {
  // Warm tinted shadow for cards on the cream page bg
  card: {
    shadowColor: '#5A4F3A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  // Floating UI (FAB, drawer, menu, modal)
  floating: {
    shadowColor: '#5A4F3A',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  // Subtle elevation (timeline cards, list rows)
  subtle: {
    shadowColor: '#5A4F3A',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
} as const;

/**
 * Post-script names registered with useFonts. Match these to the weight token
 * so React Native picks the right face. Single-family system — Sans covers
 * Chinese (SC subset) and Latin glyphs, so no per-language fallback chain.
 *
 * Noto Sans SC ships these weights: 100, 300, 400, 500, 700, 900. No 600
 * SemiBold. We use 500 Medium as the "strong" weight between 400 (body) and
 * 700 (display). For 11px UPPERCASE tracked labels the heavier weight reads
 * better, so label uses Bold.
 */
export const fontFamily = {
  sansRegular: 'NotoSansSC_400Regular',
  sansMedium: 'NotoSansSC_500Medium',
  sansBold: 'NotoSansSC_700Bold',
} as const;

export const typography = {
  /** Hero text — calendar month, big stats. Size + weight carry the hierarchy. */
  display: {
    fontFamily: fontFamily.sansBold,
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  /** Section / card header — book detail title, sub-screen headers */
  title: {
    fontFamily: fontFamily.sansBold,
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  /** In-card title — list rows, sheet headers. Medium (not Bold) so it sits
   *  lighter than title and heavier than body. */
  heading: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 26,
  },
  /** Sans subhead — dialog titles, button labels where weight carries */
  subheading: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  /** Reading body — note content, comments. Generous line-height for editorial feel */
  body: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 26, // 1.625 ratio
  },
  /** Inline emphasis inside body — titles, link text in cards */
  bodyStrong: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  /** Secondary text — dates, metadata, helper */
  caption: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 19,
  },
  /** Micro labels — chips, badges. Sans medium so digits remain tabular */
  micro: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  /** Editorial section label — UPPERCASE, tracked. Bold at small size reads
   *  as a sharp editorial divider. */
  label: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    fontWeight: '700' as const,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  /** Italic emphasis — for quoted passages inside notes. Italic sans keeps the
   *  family consistent while still flagging quoted / cited text. */
  emphasis: {
    fontFamily: fontFamily.sansRegular,
    fontStyle: 'italic' as const,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 26,
  },
} as const;

/** Hairline divider — single-pixel bottom border at the page's border tone */
export const hairline = StyleSheet.create({
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
