/**
 * LtIcon — Locotalk 리디자인 라인 아이콘 세트 (Wanted/Toss × iOS 26)
 * 디자인 핸드오프(lt-ui.js)의 SVG path 를 그대로 포팅 — react-native-svg SvgXml 사용.
 * <LtIcon name="pin" size={16} color="#0E9E86" sw={1.8} />
 */
import React from 'react';
import { SvgXml } from 'react-native-svg';

// viewBox 0 0 24 24, stroke=currentColor (color prop 로 주입)
const P: Record<string, string> = {
  home: '<path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M5.5 10v9.5h13V10"/>',
  chat: '<path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-5A8 8 0 1 1 21 11.5Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20c0-3.9 3.4-6 7.5-6s7.5 2.1 7.5 6"/>',
  pin: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
  shield: '<path d="M12 3 5 6v5.5c0 4.3 3 7.6 7 9.5 4-1.9 7-5.2 7-9.5V6l-7-3Z"/><path d="m9 11.7 2.2 2.2L15 9.8"/>',
  wind: '<path d="M3 9h11a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 14h15a2.5 2.5 0 1 1-2.5 2.5"/><path d="M3 19h9"/>',
  map: '<path d="m9 5-6 2.2v12L9 17l6 2 6-2.2v-12L15 7"/><path d="M9 5v12M15 7v12"/>',
  send: '<path d="M21 4 3 11l7 2.5L13 21l8-17Z"/><path d="m10 13.5 3-2.5"/>',
  chevL: '<path d="m14.5 5-6 7 6 7"/>',
  chevR: '<path d="m9.5 5 6 7-6 7"/>',
  more: '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  edit: '<path d="M5 19h3l9-9-3-3-9 9v3Z"/><path d="m13 5 3 3"/>',
  ban: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
  bell: '<path d="M6 16V10a6 6 0 0 1 12 0v6l1.5 2.5h-15L6 16Z"/><path d="M10 19.5a2.2 2.2 0 0 0 4 0"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 2.4 14.6 0 17M12 3.5c-2.4 2.4-2.4 14.6 0 17"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  logout: '<path d="M14 5H6v14h8"/><path d="m13 12h8M18 8l3 4-3 4"/>',
  crown: '<path d="M4 8l3.5 3 4.5-6 4.5 6L20 8l-1.5 10h-13L4 8Z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  sparkle: '<path d="M12 3.5 13.7 9 19 11l-5.3 2L12 18.5 10.3 13 5 11l5.3-2L12 3.5Z"/>',
  refresh: '<path d="M5 12a7 7 0 0 1 12-5l2 2"/><path d="M19 5v4h-4"/><path d="M19 12a7 7 0 0 1-12 5l-2-2"/><path d="M5 19v-4h4"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="3"/><path d="m4.5 7 7.5 6 7.5-6"/>',
  /* 관심사 */
  coffee: '<path d="M5 8h11v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z"/><path d="M16 9h2.2a2.3 2.3 0 0 1 0 4.6H16"/><path d="M8 3.5c-.5.7-.5 1.3 0 2M11.5 3.5c-.5.7-.5 1.3 0 2"/>',
  run: '<circle cx="15" cy="5.5" r="1.8"/><path d="m6 21 3-5 3 1.5V21M9 16l-1.5-4 4-2.5 3 3 2.5.5"/><path d="m12.5 7-3 1.5"/>',
  book: '<path d="M5 4.5h9a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5H5V4.5Z"/><path d="M5 4.5v13"/>',
  plane: '<path d="M11 3.5c.7-.7 1.8-.7 2.4 0 .6.6.6 1.7 0 2.4l-3.2 3.2 1 6.4-1.7 1.7-2-5-3 3 .2 2.2L3.4 18l-1.2-3-3-1.2 1.6-1.6 2.2.2 3-3-5-2 1.7-1.7 6.4 1 3.2-3.2Z"/>',
  dumbbell: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
  utensils: '<path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10"/><path d="M16 3c-1.5 1-2 2.5-2 5 0 2 1 3 2 3v10"/>',
  music: '<circle cx="7" cy="17" r="2.6"/><circle cx="17" cy="15" r="2.6"/><path d="M9.6 17V6l10-2v11"/>',
  tent: '<path d="m12 4 8 16H4l8-16Z"/><path d="M12 4v16M12 20l4-6"/>',
  chef: '<path d="M8 13v6.5h8V13"/><path d="M8 13a4 4 0 0 1-1-7.8 4 4 0 0 1 7.6-1 4 4 0 0 1 2.4 8.8"/><path d="M8 16h8"/>',
  film: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M8 4.5v15M16 4.5v15M3.5 12h17M3.5 8.3h4.5M16 8.3h4.5M3.5 15.7h4.5M16 15.7h4.5"/>',
  car: '<path d="M4 16v-3.5l2-5h12l2 5V16"/><path d="M3.5 16h17v2.5h-3V16M6.5 18.5V16"/><circle cx="7.5" cy="16" r="1.3"/><circle cx="16.5" cy="16" r="1.3"/>',
  mountain: '<path d="m3 19 6.5-12 4 7 2-3 5.5 8H3Z"/>',
  paw: '<circle cx="7" cy="10" r="1.8"/><circle cx="12" cy="7.5" r="1.9"/><circle cx="17" cy="10" r="1.8"/><path d="M12 12c-2.6 0-4.5 2-4.5 4.3 0 1.6 1.3 2.4 2.6 2 1.2-.4 2.6-.4 3.8 0 1.3.4 2.6-.4 2.6-2C16.5 14 14.6 12 12 12Z"/>',
  gamepad: '<rect x="2.5" y="7.5" width="19" height="9" rx="4.5"/><path d="M7 11v2M6 12h2M15.5 11.5h.01M18 13.5h.01"/>',
  gradcap: '<path d="m12 4 9 4-9 4-9-4 9-4Z"/><path d="M6.5 10v4.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V10"/><path d="M21 8v5"/>',
  bike: '<circle cx="6" cy="16.5" r="3"/><circle cx="18" cy="16.5" r="3"/><path d="M6 16.5 10 8h5l-2.5 8.5M10 8 8 8M14 8l3 8.5"/>',
  leaf: '<path d="M20 4c-9 0-15 4-15 11 0 2 1 4 1 4M5 19C12 19 19 14 19 5"/>',
  chatdots: '<path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-5A8 8 0 1 1 21 11.5Z"/><circle cx="8.5" cy="11.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="11.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="11.5" r="1" fill="currentColor" stroke="none"/>',
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3.3"/>',
  palette: '<path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2 0-1.5 1-2 2.5-2H18a3 3 0 0 0 3-3c0-5-4-9-9-9Z"/><circle cx="7.5" cy="11" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="16" cy="11" r="1.1" fill="currentColor" stroke="none"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
  soccer: '<circle cx="12" cy="12" r="8.5"/><path d="m12 7 3 2.2-1.1 3.6h-3.8L9 9.2 12 7Z"/>',
  tennis: '<circle cx="12" cy="12" r="8.5"/><path d="M5 6.5c3.5 2.5 3.5 8.5 0 11M19 6.5c-3.5 2.5-3.5 8.5 0 11"/>',
  waves: '<path d="M2.5 8c2-2 3.5-2 5.5 0s3.5 2 5.5 0 3.5-2 5.5 0M2.5 13c2-2 3.5-2 5.5 0s3.5 2 5.5 0 3.5-2 5.5 0M2.5 18c2-2 3.5-2 5.5 0s3.5 2 5.5 0 3.5-2 5.5 0"/>',
  beer: '<path d="M6 8h9v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8Z"/><path d="M15 10h2.5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H15"/><path d="M6 8c0-2 1.5-3 3-3 .5-1.5 3-1.5 3.5 0 1.8 0 2.5 1.5 2.5 3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
  shirt: '<path d="m8 4-5 3 2 3 2-1v8h10v-8l2 1 2-3-5-3a3 3 0 0 1-6 0Z"/>',
  trend: '<path d="m4 15 5-5 3 3 6-7"/><path d="M21 6v4h-4"/>',
  badminton: '<path d="m3 21 6-6"/><path d="m10 14 6-6a2.8 2.8 0 1 1 4 4l-6 6-4-4Z"/><path d="m9 15 2 2"/>',
};

// 앱 관심사 id → LtIcon 이름 매핑 (온보딩/프로필 칩)
export const INTEREST_ICON: Record<string, string> = {
  run: 'run', coffee: 'coffee', book: 'book', travel: 'plane', gym: 'dumbbell',
  food: 'utensils', music: 'music', camp: 'tent', yoga: 'waves', cook: 'chef',
  movie: 'film', drive: 'car', hike: 'mountain', pet: 'paw', game: 'gamepad',
  study: 'gradcap', bike: 'bike', plant: 'leaf', chat: 'chatdots', photo: 'camera',
  art: 'palette', coding: 'code', soccer: 'soccer', tennis: 'tennis', swim: 'waves',
  beer: 'beer', karaoke: 'mic', fashion: 'shirt', invest: 'trend', badminton: 'badminton',
};

interface Props { name: string; size?: number; color?: string; sw?: number; }

export default function LtIcon({ name, size = 24, color = '#191F28', sw = 1.8 }: Props) {
  const inner = P[name] || '';
  const xml =
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} color={color} />;
}
