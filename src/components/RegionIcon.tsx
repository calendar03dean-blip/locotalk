// src/components/RegionIcon.tsx
// SPOTA — Compact typographic monogram tile for inline region indicators.
//
// Usage:
//   <RegionIcon id="mapo" size={14} color={Colors.primary} />
//   <RegionIcon id="seoul" size={20} color={Colors.dark} />

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { KOREAN_MONOGRAM } from '../constants/regions';

interface Props {
  id: string;
  size?: number;
  color?: string;
}

// Convert hex color + alpha (0-1) into rgba.
function withAlpha(color: string, alpha: number): string {
  const h = color.replace('#', '');
  if (h.length !== 6) return color;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function RegionIcon({ id, size = 16, color = '#1C1C1E' }: Props) {
  const mono = KOREAN_MONOGRAM[id];
  if (!mono) return null;

  // ≤ 18px → single character for legibility.
  // Otherwise show both characters of the 2-char short form.
  const compact = size <= 18;
  const text = compact ? mono[0] : mono;
  const fontSize = compact ? size * 0.62 : size * 0.42;

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: withAlpha(color, 0.14),
        },
      ]}
    >
      <Text
        allowFontScaling={false}
        style={{
          color,
          fontSize,
          fontWeight: '800',
          letterSpacing: compact ? -0.4 : -0.6,
          // Optical centering — Hangul glyphs sit slightly low in their box.
          paddingBottom: compact ? 0 : 1,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
