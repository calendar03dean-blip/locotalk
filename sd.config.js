/**
 * sd.config.js
 * Style Dictionary — tokens/tokens.json → src/constants/theme.ts 자동 생성
 *
 * 사용법: npm run tokens:build
 * (Figma에서 토큰을 수정하고 GitHub Sync 후 이 명령 실행)
 */

const StyleDictionary = require('style-dictionary');

// ─── 커스텀 포맷: Spota theme.ts 생성 ────────────────────────────────────────
StyleDictionary.registerFormat({
  name: 'spota/theme-ts',
  formatter: ({ dictionary }) => {
    const all = dictionary.allTokens;

    // 카테고리별 분류
    const pick = (category, sub) =>
      all.filter(t => t.path[0] === category && (!sub || t.path[1] === sub));

    // 객체로 조립
    const toObj = (tokens, startDepth = 2) =>
      tokens.reduce((acc, t) => {
        const key = t.path.slice(startDepth).join('_') || t.path[t.path.length - 1];
        acc[key] = t.value;
        return acc;
      }, {});

    const brandColors   = toObj(pick('color', 'brand'));
    const surfaceColors = toObj(pick('color', 'surface'));
    const fillColors    = toObj(pick('color', 'fill'));
    const grayColors    = toObj(pick('color', 'gray'));
    const sepColors     = toObj(pick('color', 'separator'));
    const sysColors     = toObj(pick('color', 'system'));
    const statusColors  = toObj(pick('color', 'status'));
    const socialColors  = toObj(pick('color', 'social'));

    const sizes   = toObj(pick('typography', 'size'));
    const weights = toObj(pick('typography', 'weight'));

    const spacing = toObj(pick('spacing'), 1);
    const radius  = toObj(pick('borderRadius'), 1);
    const sizing  = toObj(pick('sizing'), 1);
    const duration = toObj(pick('duration'), 1);

    // 그림자는 별도 처리
    const shadows = {};
    pick('shadow').forEach(t => {
      const key = t.path[1];
      shadows[key] = t.value;
    });

    const colorStr = JSON.stringify({
      ...brandColors,
      ...surfaceColors,
      ...fillColors,
      ...grayColors,
      separator:       sepColors['default'] || sepColors['separator_default'],
      separatorOpaque: sepColors['opaque']  || sepColors['separator_opaque'],
      ...sysColors,
      ...statusColors,
      ...socialColors,
    }, null, 2).replace(/"([^"]+)":/g, '$1:');

    const spacingStr = JSON.stringify(
      Object.fromEntries(Object.entries(spacing).map(([k,v]) => [k, Number(v)])),
      null, 2
    ).replace(/"([^"]+)":/g, '$1:');

    const radiusStr = JSON.stringify(
      Object.fromEntries(Object.entries(radius).map(([k,v]) => [k, Number(v)])),
      null, 2
    ).replace(/"([^"]+)":/g, '$1:');

    const sizingStr = JSON.stringify(
      Object.fromEntries(Object.entries(sizing).map(([k,v]) => [k, Number(v)])),
      null, 2
    ).replace(/"([^"]+)":/g, '$1:');

    const typSizeStr = JSON.stringify(
      Object.fromEntries(Object.entries(sizes).map(([k,v]) => [k, Number(v)])),
      null, 2
    ).replace(/"([^"]+)":/g, '$1:');

    return `// src/constants/theme.ts
// ⚠️  이 파일은 자동 생성됩니다. 직접 수정하지 마세요.
// 수정 방법: Figma Token Studio → tokens/tokens.json → npm run tokens:build
// Generated: ${new Date().toISOString()}

import { Platform } from 'react-native';

export const Colors = ${colorStr} as const;

export const FontFamily = Platform.select({
  ios:     'System',
  android: 'sans-serif',
  default: 'System',
}) as string;

export const Typography = ${typSizeStr} as const;

export const Spacing = ${spacingStr} as const;

export const Radius = ${radiusStr} as const;

export const Shadow = {
  card: {
    shadowColor:   '${shadows.card?.color || '#000'}',
    shadowOffset:  { width: ${shadows.card?.x || 0}, height: ${shadows.card?.y || 2} },
    shadowOpacity: ${shadows.card?.opacity || 0.06},
    shadowRadius:  ${shadows.card?.blur || 10},
    elevation:     2,
  },
  glass: {
    shadowColor:   '${shadows.glass?.color || '#000'}',
    shadowOffset:  { width: ${shadows.glass?.x || 0}, height: ${shadows.glass?.y || 12} },
    shadowOpacity: ${shadows.glass?.opacity || 0.14},
    shadowRadius:  ${shadows.glass?.blur || 40},
    elevation:     12,
  },
  fab: {
    shadowColor:   '${shadows.fab?.color || '#34C77E'}',
    shadowOffset:  { width: ${shadows.fab?.x || 0}, height: ${shadows.fab?.y || 14} },
    shadowOpacity: ${shadows.fab?.opacity || 0.40},
    shadowRadius:  ${shadows.fab?.blur || 30},
    elevation:     8,
  },
  button: {
    shadowColor:   '${shadows.button?.color || '#34C77E'}',
    shadowOffset:  { width: ${shadows.button?.x || 0}, height: ${shadows.button?.y || 8} },
    shadowOpacity: ${shadows.button?.opacity || 0.30},
    shadowRadius:  ${shadows.button?.blur || 24},
    elevation:     6,
  },
} as const;

export const ControlHeight = ${sizingStr} as const;

export const Duration = ${JSON.stringify(
  Object.fromEntries(Object.entries(duration).map(([k,v]) => [k, Number(String(v).replace('ms',''))])),
  null, 2
).replace(/"([^"]+)":/g, '$1:')} as const;

// ───────── 유틸리티 (자동 생성 제외 — 변경 불필요) ──────────────────────────
export const AVATAR_PALETTE = [
  { bg: '#E0F5EC', fg: '#0F6E47' },
  { bg: '#EAE6FE', fg: '#4F2DC4' },
  { bg: '#FFF1CC', fg: '#8A5A00' },
  { bg: '#FFE0E5', fg: '#A8133D' },
  { bg: '#D9EAFE', fg: '#0F3E9B' },
  { bg: '#E8FBE6', fg: '#1F6B22' },
  { bg: '#FFE7D6', fg: '#933000' },
  { bg: '#F0EBFF', fg: '#3D1989' },
  { bg: '#FFF8C9', fg: '#5A3A00' },
  { bg: '#CFF3F8', fg: '#0A4A5E' },
  { bg: '#FCD9E8', fg: '#8A0D49' },
  { bg: '#FFD7D7', fg: '#7C1010' },
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

export function tinted(hex: string, alpha = 0.10): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return \`rgba(\${r},\${g},\${b},\${alpha})\`;
}
`;
  }
});

// ─── Style Dictionary 설정 ────────────────────────────────────────────────────
module.exports = {
  source: ['tokens/tokens.json'],
  platforms: {
    reactNative: {
      transformGroup: 'js',
      buildPath: 'src/constants/',
      files: [
        {
          destination: 'theme.ts',
          format: 'spota/theme-ts',
        }
      ]
    }
  }
};
