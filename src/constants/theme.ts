// src/constants/theme.ts
// SPOTA — iOS 26 Design System (Liquid Glass)
// 이 파일을 기존 src/constants/theme.ts에 덮어쓰면 됩니다.

import { Platform } from 'react-native';

// ───────── Colors ─────────────────────────────────────────────
// Apple system palette + Spota brand emerald (tuned to iOS system green).
export const Colors = {
  // Brand (emerald) — tuned to sit next to iOS system colors
  primary:      '#40D3B6',   // accent
  primaryD:     '#077060',   // primary on tinted bg (text)
  primaryDk:    '#055448',   // primary on filled bg (text)
  primaryTint:  '#DFFAF6',   // tinted bg (15% mix)
  primaryMuted: '#9FE8DE',

  // iOS system surfaces (light mode)
  bg:                 '#F2F2F7',   // ios-bg-grouped
  sf:                 '#FFFFFF',   // ios-bg-grouped-secondary (cards)
  bgPlain:            '#FFFFFF',   // ios-bg (chat, plain backgrounds)

  // iOS fills (overlay on surface — translucent in real iOS)
  fillPrimary:        'rgba(120,120,128,0.20)',
  fillSecondary:      'rgba(120,120,128,0.16)',
  fillTertiary:       'rgba(118,118,128,0.12)',
  fillQuaternary:     'rgba(118,118,128,0.08)',

  // Gray scale (mapped from iOS labels)
  g1:   '#F2F2F7',
  g2:   '#E5E5EA',   // separator-ish
  g3:   '#C7C7CC',   // label-tertiary
  g4:   '#8E8E93',   // label-secondary
  dark: '#1C1C1E',   // label

  // Separator (use 0.5px borders)
  separator:          'rgba(60,60,67,0.29)',
  separatorOpaque:    '#C6C6C8',

  // iOS system colors (light)
  red:      '#FF3B30',
  orange:   '#FF9500',
  yellow:   '#FFCC00',
  green:    '#34C759',
  mint:     '#00C7BE',
  teal:     '#30B0C7',
  cyan:     '#32ADE6',
  blue:     '#007AFF',
  indigo:   '#5856D6',
  purple:   '#AF52DE',
  pink:     '#FF2D55',
  brown:    '#A2845E',

  // Status (semantic)
  danger:       '#FF3B30',
  dangerLight:  '#FFE5E3',
  warning:      '#FF9500',
  warningLight: '#FFF3E0',
  success:      '#34C759',

  // Social
  kakao:        '#FEE500',
  kakaoDark:    '#3C1E1E',
  naver:        '#03C75A',
  naverText:    '#FFFFFF',
} as const;

// ───────── Typography ────────────────────────────────────────
// SF Pro Text / SF Pro Display — iOS uses Display ≥ 20pt, Text < 20pt.
// On RN we just use system font with explicit weights + tracking.

export const FontFamily = Platform.select({
  ios:     'System',
  android: 'sans-serif',
  default: 'System',
}) as string;

export const Typography = {
  // Sizes — iOS dynamic-type-ish (regular content size)
  caption2: 11,
  caption1: 12,
  footnote: 13,
  subhead:  15,
  callout:  16,
  body:     17,
  headline: 17,   // body weight = 600
  title3:   20,
  title2:   22,
  title1:   28,
  largeTitle: 34,

  // Aliases used in existing SPOTA codebase
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   22,
  xxl:  28,

  // Weights
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
  heavy:   '800' as const,
  black:   '900' as const,

  // Letter spacing (tracking) — for SF Pro feel
  trackingDisplay:  -1.1,   // large titles, hero
  trackingHeadline: -0.43,  // body/headline (iOS default)
  trackingBody:     -0.24,
  trackingCaption:  -0.08,
} as const;

// ───────── Spacing ───────────────────────────────────────────
// 4-pt base grid (Apple HIG recommends 4/8).
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 28,
  xxxl: 36,
} as const;

// ───────── Radius ────────────────────────────────────────────
// iOS uses **concentric corners**: inner radius = outer - inset.
// In SwiftUI: Rectangle().clipShape(.rect(cornerRadius: 16))
//             with sublayers at corner = outer - margin.
// Common iOS 26 values:
export const Radius = {
  xs:      6,    // small inline chips
  sm:      10,   // list rows, list groups
  md:      14,   // text fields, inputs
  lg:      16,   // cards, modals (inner)
  xl:      24,   // hero cards, bottom sheets
  xxl:     28,   // glass cards
  pill:    999,
  full:    999,
} as const;

// ───────── Shadows ───────────────────────────────────────────
// iOS shadows are very subtle — use sparingly. Mostly used for
// floating chrome (Liquid Glass, FABs, modal sheets).
export const Shadow = {
  card: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  10,
    elevation:     2,
  },
  glass: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius:  40,
    elevation:     12,
  },
  fab: {
    shadowColor:   '#40D3B6',
    shadowOffset:  { width: 0, height: 14 },
    shadowOpacity: 0.40,
    shadowRadius:  30,
    elevation:     8,
  },
  button: {
    shadowColor:   '#40D3B6',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius:  24,
    elevation:     6,
  },
} as const;

// ───────── Animation ─────────────────────────────────────────
// iOS standard curves
export const Easing = {
  standard:    [0.4, 0.0, 0.2, 1] as const,  // ease-in-out
  decel:       [0.0, 0.0, 0.2, 1] as const,
  accel:       [0.4, 0.0, 1.0, 1] as const,
  spring:      [0.34, 1.56, 0.64, 1] as const, // overshoot
} as const;

export const Duration = {
  fast:    150,
  base:    250,
  slow:    400,
} as const;

// ───────── Heights (touch targets) ───────────────────────────
// HIG minimum 44pt; SPOTA uses 50pt for primary CTAs.
export const ControlHeight = {
  sm:    32,
  md:    44,
  lg:    50,   // primary CTA buttons (capsule)
  xl:    56,
  input: 50,
  tabBar:62,
} as const;

// ───────── Nickname avatar palette ───────────────────────────
// 12-color palette tuned to iOS pastel surfaces.
export const AVATAR_PALETTE = [
  { bg: '#DFFAF6', fg: '#077060' },  // mint
  { bg: '#EAE6FE', fg: '#4F2DC4' },  // purple
  { bg: '#FFF1CC', fg: '#8A5A00' },  // amber
  { bg: '#FFE0E5', fg: '#A8133D' },  // pink
  { bg: '#D9EAFE', fg: '#0F3E9B' },  // blue
  { bg: '#E8FBE6', fg: '#1F6B22' },  // green
  { bg: '#FFE7D6', fg: '#933000' },  // orange
  { bg: '#F0EBFF', fg: '#3D1989' },  // violet
  { bg: '#FFF8C9', fg: '#5A3A00' },  // yellow
  { bg: '#CFF3F8', fg: '#0A4A5E' },  // cyan
  { bg: '#FCD9E8', fg: '#8A0D49' },  // rose
  { bg: '#FFD7D7', fg: '#7C1010' },  // red
] as const;

export function getNickColor(nick: string) {
  if (!nick) return AVATAR_PALETTE[0];
  let h = 0;
  for (const c of nick) h = (h * 31 + c.charCodeAt(0)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[h];
}

export function getNickFontSize(nick: string, size: number): number {
  const len = [...nick].length;
  if (len <= 1) return Math.floor(size * 0.50);
  if (len <= 2) return Math.floor(size * 0.36);
  if (len <= 3) return Math.floor(size * 0.30);
  if (len <= 4) return Math.floor(size * 0.25);
  return Math.floor(size * 0.20);
}

// ───────── Tinted helper ─────────────────────────────────────
// Returns rgba(color, alpha) — for "tinted" iOS surfaces.
// In RN we can't use color-mix(), so we use opacity overlays.
export function tinted(hex: string, alpha = 0.10): string {
  // hex → rgba
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
