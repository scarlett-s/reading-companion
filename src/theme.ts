/**
 * Design tokens — single source of truth for colors, spacing, radius, type, shadow.
 * Page bg uses a warm off-white (米白) with off-black text. Primary is a desaturated
 * leaf green (CTA, progress, success). Accent is a cool blue reserved for text links
 * and link-style actions. Never use accent as a filled button.
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

export const typography = {
  display: { fontSize: 28, fontWeight: '700', lineHeight: 36 },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  heading: { fontSize: 17, fontWeight: '600', lineHeight: 24 },
  subheading: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, lineHeight: 24 },          // ~1.6
  bodyStrong: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  caption: { fontSize: 13, lineHeight: 19 },
  micro: { fontSize: 11, fontWeight: '500', lineHeight: 14 },
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
