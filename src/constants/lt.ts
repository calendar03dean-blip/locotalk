/**
 * LT — Locotalk 리디자인 디자인 토큰
 * Wanted/Toss 그레이 스케일 × iOS 26 Liquid Glass. 틸 브랜드 유지(#40D3B6).
 * 핸드오프 lt.css 의 :root 토큰을 RN 상수로 포팅. (라이트 테마)
 */
export const LT = {
  // brand — refined teal
  brand:       '#40D3B6',
  brandStrong: '#0E9E86',   // 틴트 배경 위 텍스트/아이콘
  brandPress:  '#0B8C77',
  brandTint:   '#E4FAF4',
  brandOn:     '#FFFFFF',
  brandG1:     '#33D6BA',   // gradient
  brandG2:     '#13B197',

  // Toss/Wanted gray scale
  g900: '#191F28', g800: '#333D4B', g700: '#4E5968', g600: '#6B7684',
  g500: '#8B95A1', g400: '#B0B8C1', g300: '#D1D6DB', g200: '#E5E8EB',
  g100: '#F2F4F6', g50: '#F9FAFB', white: '#FFFFFF',

  // semantic
  bg:       '#F2F4F6',
  surface:  '#FFFFFF',
  surface2: '#F9FAFB',
  label:    '#191F28',
  label2:   '#4E5968',
  label3:   '#8B95A1',
  label4:   '#B0B8C1',
  hairline: '#EDEFF2',
  border:   '#E5E8EB',
  danger:   '#F04452',
  gold:     '#F5A623',

  bubblePeer: '#F2F4F6',
  fieldBg:    '#F1F3F5',

  // liquid glass (RN: 반투명 흰색 + 그림자로 근사, blur 는 BlurView 필요)
  glass:       'rgba(255,255,255,0.82)',
  glassBorder: 'rgba(255,255,255,0.75)',
} as const;

// 공용 그림자 (iOS shadow* / Android elevation)
export const LtShadow = {
  card:  { shadowColor: '#111827', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2 },
  glass: { shadowColor: '#111827', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 28, elevation: 12 },
} as const;
