/**
 * CodenameAvatar — 코드네임(예: "분홍토끼", "까만판다", "조용한고양이") 프로필 아바타.
 *
 *   형태: 전신(앉은 자세) 라인 캐릭터 + 항상 작은 점눈.
 *   배경: 코드네임 색 그라데이션. 색에 따라 '밝은' 또는 '어두운' 그라데이션.
 *         어두운 배경이면 선은 자동으로 밝은(크림) 색 → 대비 유지.
 *   색 없는 형용사 코드네임(조용한·씩씩한…)은 기본 옅은 그라데이션 + 잉크 선.
 *
 *   동물 라인아트: src/constants/avatarAnimals.ts (전신, currentColor). 미수록 동물은 이니셜 원 폴백.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ANIMAL_MARKUP } from '../constants/avatarAnimals';
import spec from '../../assets/avatar-spec.json';

const ANIMALS: { ko: string; en: string }[] = (spec as any).animals;
const COLOR_WORDS: Record<string, string> = (spec as any).colors;

type Theme = { from: string; to: string; line: string };

// 코드네임 색 단어 → 그라데이션(from→to) + 선 색. 어두운 톤은 선을 밝게.
const THEME: Record<string, Theme> = {
  노란: { from: '#FBF4DC', to: '#F3E1A4', line: '#2B2F36' },
  분홍: { from: '#FCEEF3', to: '#F4CDDC', line: '#2B2F36' },
  붉은: { from: '#FBEAE5', to: '#F4C2B2', line: '#2B2F36' },
  주황: { from: '#FBEFE0', to: '#F4D6A6', line: '#2B2F36' },
  연두: { from: '#EEF6E6', to: '#D5E8BF', line: '#2B2F36' },
  초록: { from: '#E8F2DE', to: '#C6E0A6', line: '#2B2F36' },
  청록: { from: '#E1F5EE', to: '#B5E3D4', line: '#2B2F36' },
  푸른: { from: '#EAF1FB', to: '#C9DCF3', line: '#2B2F36' },
  파란: { from: '#EAF1FB', to: '#C9DCF3', line: '#2B2F36' },
  하얀: { from: '#F6F7F8', to: '#E4E8EC', line: '#2B2F36' },
  은빛: { from: '#F3F5F7', to: '#DFE5EC', line: '#2B2F36' },
  황금: { from: '#FBF3DF', to: '#F1E0B4', line: '#2B2F36' },
  // 어두운 그라데이션 + 밝은 선
  까만: { from: '#3A3F47', to: '#15181E', line: '#F2EFE9' },
  쪽빛: { from: '#243056', to: '#0E1430', line: '#DCE4F2' },
  보라: { from: '#322A58', to: '#14102C', line: '#E6DFF6' },
  새벽: { from: '#2A2E55', to: '#12152E', line: '#E2E6F4' },
};
const DEFAULT_THEME: Theme = { from: '#F3F5F7', to: '#DFE5EC', line: '#2B2F36' };

type Resolved = { animalKo: string; theme: Theme; initial: string } | null;

function resolveCodename(codename?: string | null): Resolved {
  if (!codename) return null;
  const name = codename.trim().replace(/\s*#[0-9A-Fa-f]{4}$/, '').trim(); // 구버전 hex 접미사 제거
  const animal = ANIMALS.find(a => name.endsWith(a.ko));
  if (!animal) return null;
  const mod = name.slice(0, name.length - animal.ko.length); // 형용사 또는 색
  const theme = THEME[mod] ?? DEFAULT_THEME; // 색 단어면 해당 테마, 아니면 기본
  return { animalKo: animal.ko, theme, initial: codename.trim().charAt(0) || '·' };
}

function buildSvg(markup: string, theme: Theme): string {
  return (
    '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="0.85" y2="1">' +
    `<stop offset="0" stop-color="${theme.from}"/><stop offset="1" stop-color="${theme.to}"/>` +
    '</linearGradient></defs>' +
    '<circle cx="100" cy="100" r="100" fill="url(#bg)"/>' +
    '<g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">' +
    markup +
    '</g></svg>'
  ).replace(/currentColor/g, theme.line);
}

// 폴백 이니셜 원 색(닉네임 해시) — 코드네임 아닌 닉/미수록 동물용.
const FALLBACK_COLORS = [
  { bg: '#ECFDF5', fg: '#065F46' }, { bg: '#EDE9FE', fg: '#5B21B6' },
  { bg: '#FEF3C7', fg: '#92400E' }, { bg: '#FEE2E2', fg: '#991B1B' },
  { bg: '#E0F2FE', fg: '#075985' }, { bg: '#FCE7F3', fg: '#9D174D' },
];
function fallbackColor(nick: string) {
  let h = 0;
  for (const c of nick) h = (h * 31 + c.charCodeAt(0)) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[h];
}

export default function CodenameAvatar({
  codename,
  size = 84,
  style,
}: {
  codename?: string | null;
  size?: number;
  style?: object;
}) {
  const r = resolveCodename(codename);
  const markup = r ? ANIMAL_MARKUP[r.animalKo] : undefined;
  const svg = useMemo(
    () => (markup && r ? buildSvg(markup, r.theme) : null),
    [markup, r?.theme.from, r?.theme.line],
  );

  const box = { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' as const };

  if (svg) {
    return (
      <View style={[box, style]}>
        <SvgXml xml={svg} width={size} height={size} />
      </View>
    );
  }

  // 폴백: 닉네임 이니셜 원 (미수록 동물 / 코드네임 아닌 닉네임)
  const nick = (codename ?? '').trim();
  const c = fallbackColor(nick || '·');
  return (
    <View style={[box, s.center, { backgroundColor: c.bg }, style]}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '800', color: c.fg }}>
        {nick.slice(0, 1) || '·'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
