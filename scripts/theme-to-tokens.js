/**
 * scripts/theme-to-tokens.js
 *
 * Spota theme.ts → tokens.json (Token Studio / W3C Design Token 포맷)
 *
 * 사용법: node scripts/theme-to-tokens.js
 * 결과물: tokens/tokens.json  ← Figma Token Studio에서 바로 import 가능
 */

const fs = require('fs');
const path = require('path');

// ─── theme.ts 값을 직접 반영 (TypeScript import 없이) ────────────────────────

const Colors = {
  // Brand
  primary:      '#34C77E',
  primaryD:     '#0F6E47',
  primaryDk:    '#0A5235',
  primaryTint:  '#E0F5EC',
  primaryMuted: '#A7E8C8',

  // Surfaces
  bg:        '#F2F2F7',
  sf:        '#FFFFFF',
  bgPlain:   '#FFFFFF',

  // Fills
  fillPrimary:    'rgba(120,120,128,0.20)',
  fillSecondary:  'rgba(120,120,128,0.16)',
  fillTertiary:   'rgba(118,118,128,0.12)',
  fillQuaternary: 'rgba(118,118,128,0.08)',

  // Grays
  g1:   '#F2F2F7',
  g2:   '#E5E5EA',
  g3:   '#C7C7CC',
  g4:   '#8E8E93',
  dark: '#1C1C1E',

  // Separators
  separator:       'rgba(60,60,67,0.29)',
  separatorOpaque: '#C6C6C8',

  // iOS system colors
  red:    '#FF3B30',
  orange: '#FF9500',
  yellow: '#FFCC00',
  green:  '#34C759',
  mint:   '#00C7BE',
  teal:   '#30B0C7',
  cyan:   '#32ADE6',
  blue:   '#007AFF',
  indigo: '#5856D6',
  purple: '#AF52DE',
  pink:   '#FF2D55',
  brown:  '#A2845E',

  // Status
  danger:       '#FF3B30',
  dangerLight:  '#FFE5E3',
  warning:      '#FF9500',
  warningLight: '#FFF3E0',
  success:      '#34C759',

  // Social
  kakao:     '#FEE500',
  kakaoDark: '#3C1E1E',
  naver:     '#03C75A',
  naverText: '#FFFFFF',
};

const Typography = {
  caption2:   11,
  caption1:   12,
  footnote:   13,
  subhead:    15,
  callout:    16,
  body:       17,
  headline:   17,
  title3:     20,
  title2:     22,
  title1:     28,
  largeTitle: 34,
};

const FontWeight = {
  regular: '400',
  medium:  '500',
  semibold:'600',
  bold:    '700',
  heavy:   '800',
  black:   '900',
};

const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  xxxl: 36,
};

const Radius = {
  xs:   6,
  sm:   10,
  md:   14,
  lg:   16,
  xl:   24,
  xxl:  28,
  pill: 999,
};

const Shadow = {
  card: {
    color:   '#000000',
    x:       0,
    y:       2,
    blur:    10,
    spread:  0,
    opacity: 0.06,
  },
  glass: {
    color:   '#000000',
    x:       0,
    y:       12,
    blur:    40,
    spread:  0,
    opacity: 0.14,
  },
  fab: {
    color:   '#34C77E',
    x:       0,
    y:       14,
    blur:    30,
    spread:  0,
    opacity: 0.40,
  },
  button: {
    color:   '#34C77E',
    x:       0,
    y:       8,
    blur:    24,
    spread:  0,
    opacity: 0.30,
  },
};

const ControlHeight = {
  sm:    32,
  md:    44,
  lg:    50,
  xl:    56,
  input: 50,
  tabBar:62,
};

const Duration = {
  fast: 150,
  base: 250,
  slow: 400,
};

// ─── Token Studio 포맷으로 변환 ──────────────────────────────────────────────

function makeToken(value, type, description = '') {
  const token = { value: String(value), type };
  if (description) token.description = description;
  return token;
}

function colorsToTokens(colorObj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(colorObj)) {
    result[key] = makeToken(value, 'color');
  }
  return result;
}

function spacingToTokens(spacingObj) {
  const result = {};
  for (const [key, value] of Object.entries(spacingObj)) {
    result[key] = makeToken(value, 'spacing');
  }
  return result;
}

function radiusToTokens(radiusObj) {
  const result = {};
  for (const [key, value] of Object.entries(radiusObj)) {
    result[key] = makeToken(value, 'borderRadius');
  }
  return result;
}

function typographyToTokens(typObj) {
  const result = {};
  for (const [key, value] of Object.entries(typObj)) {
    result[key] = makeToken(value, 'fontSizes');
  }
  return result;
}

function weightToTokens(weightObj) {
  const result = {};
  for (const [key, value] of Object.entries(weightObj)) {
    result[key] = makeToken(value, 'fontWeights');
  }
  return result;
}

function shadowToTokens(shadowObj) {
  const result = {};
  for (const [key, shadow] of Object.entries(shadowObj)) {
    result[key] = {
      value: {
        color:  shadow.color,
        x:      String(shadow.x),
        y:      String(shadow.y),
        blur:   String(shadow.blur),
        spread: String(shadow.spread),
        type:   'dropShadow',
      },
      type: 'boxShadow',
    };
  }
  return result;
}

function durationToTokens(durationObj) {
  const result = {};
  for (const [key, value] of Object.entries(durationObj)) {
    result[key] = makeToken(`${value}ms`, 'duration');
  }
  return result;
}

function heightToTokens(heightObj) {
  const result = {};
  for (const [key, value] of Object.entries(heightObj)) {
    result[key] = makeToken(value, 'sizing');
  }
  return result;
}

// ─── 최종 tokens.json 구성 ────────────────────────────────────────────────

const tokens = {
  // 브랜드 색상
  color: {
    brand: {
      primary:      makeToken(Colors.primary,      'color', 'Spota 메인 브랜드 색상'),
      primaryD:     makeToken(Colors.primaryD,     'color', 'tinted 배경 위 텍스트'),
      primaryDk:    makeToken(Colors.primaryDk,    'color', 'filled 배경 위 텍스트'),
      primaryTint:  makeToken(Colors.primaryTint,  'color', '15% 투명도 배경'),
      primaryMuted: makeToken(Colors.primaryMuted, 'color', '연한 브랜드 색상'),
    },
    surface: {
      bg:      makeToken(Colors.bg,      'color', 'iOS grouped 배경'),
      sf:      makeToken(Colors.sf,      'color', 'iOS 카드/시트 배경'),
      bgPlain: makeToken(Colors.bgPlain, 'color', '일반 배경 (채팅 등)'),
    },
    fill: {
      primary:    makeToken(Colors.fillPrimary,    'color', 'iOS fill primary'),
      secondary:  makeToken(Colors.fillSecondary,  'color', 'iOS fill secondary'),
      tertiary:   makeToken(Colors.fillTertiary,   'color', 'iOS fill tertiary'),
      quaternary: makeToken(Colors.fillQuaternary, 'color', 'iOS fill quaternary'),
    },
    gray: {
      g1:   makeToken(Colors.g1,   'color', '최밝은 회색 / 배경'),
      g2:   makeToken(Colors.g2,   'color', '구분선'),
      g3:   makeToken(Colors.g3,   'color', 'tertiary 레이블'),
      g4:   makeToken(Colors.g4,   'color', 'secondary 레이블'),
      dark: makeToken(Colors.dark, 'color', '기본 텍스트'),
    },
    separator: {
      default: makeToken(Colors.separator,       'color', '투명 구분선'),
      opaque:  makeToken(Colors.separatorOpaque, 'color', '불투명 구분선'),
    },
    system: {
      red:    makeToken(Colors.red,    'color'),
      orange: makeToken(Colors.orange, 'color'),
      yellow: makeToken(Colors.yellow, 'color'),
      green:  makeToken(Colors.green,  'color'),
      mint:   makeToken(Colors.mint,   'color'),
      teal:   makeToken(Colors.teal,   'color'),
      cyan:   makeToken(Colors.cyan,   'color'),
      blue:   makeToken(Colors.blue,   'color'),
      indigo: makeToken(Colors.indigo, 'color'),
      purple: makeToken(Colors.purple, 'color'),
      pink:   makeToken(Colors.pink,   'color'),
      brown:  makeToken(Colors.brown,  'color'),
    },
    status: {
      danger:       makeToken(Colors.danger,       'color'),
      dangerLight:  makeToken(Colors.dangerLight,  'color'),
      warning:      makeToken(Colors.warning,      'color'),
      warningLight: makeToken(Colors.warningLight, 'color'),
      success:      makeToken(Colors.success,      'color'),
    },
    social: {
      kakao:     makeToken(Colors.kakao,     'color'),
      kakaoDark: makeToken(Colors.kakaoDark, 'color'),
      naver:     makeToken(Colors.naver,     'color'),
      naverText: makeToken(Colors.naverText, 'color'),
    },
  },

  // 타이포그래피
  typography: {
    size: typographyToTokens(Typography),
    weight: weightToTokens(FontWeight),
    font: {
      ios:     makeToken('SF Pro Text', 'fontFamilies'),
      android: makeToken('Roboto',      'fontFamilies'),
    },
  },

  // 간격
  spacing: spacingToTokens(Spacing),

  // 모서리 반경
  borderRadius: radiusToTokens(Radius),

  // 그림자
  shadow: shadowToTokens(Shadow),

  // 제어 높이
  sizing: heightToTokens(ControlHeight),

  // 애니메이션
  duration: durationToTokens(Duration),
};

// ─── 파일 저장 ───────────────────────────────────────────────────────────────

const outputPath = path.join(__dirname, '../tokens/tokens.json');
fs.writeFileSync(outputPath, JSON.stringify(tokens, null, 2), 'utf-8');

// 통계 출력
const colorCount  = Object.values(tokens.color).reduce((acc, group) => acc + Object.keys(group).length, 0);
const spacingCount = Object.keys(tokens.spacing).length;
const radiusCount  = Object.keys(tokens.borderRadius).length;
const shadowCount  = Object.keys(tokens.shadow).length;

console.log('\n✅ tokens.json 생성 완료!');
console.log(`📁 경로: ${outputPath}`);
console.log('');
console.log('📊 토큰 통계:');
console.log(`   색상  : ${colorCount}개`);
console.log(`   간격  : ${spacingCount}개`);
console.log(`   반경  : ${radiusCount}개`);
console.log(`   그림자: ${shadowCount}개`);
console.log('');
console.log('📌 다음 단계:');
console.log('   1. Figma → Token Studio 플러그인 실행');
console.log('   2. Settings → Import → tokens/tokens.json 선택');
console.log('   3. "Apply to Figma" 클릭 → 스타일 자동 생성');
