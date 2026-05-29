// src/components/RegionBadge.tsx
// SPOTA — Large card-style region badge: Korean monogram + romanized caption.
//
// The romanized caption uses syllable-aware breaking so long names like
// GEUMCHEON or DONGDAEMUN render on two lines without truncation.
//
// Usage:
//   <RegionBadge id="mapo"   size={64} color={Colors.primary} />
//   <RegionBadge id="gangnam" size={48} color={Colors.indigo} />

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  KOREAN_MONOGRAM,
  ENGLISH_NAME,
  ENGLISH_SYLLABLES,
} from '../constants/regions';

interface Props {
  id: string;
  size?: number;
  color?: string;
  style?: object;
}

function withAlpha(color: string, alpha: number): string {
  const h = color.replace('#', '');
  if (h.length !== 6) return color;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function RegionBadge({
  id,
  size = 64,
  color = '#34C77E',
  style,
}: Props) {
  const mono = KOREAN_MONOGRAM[id] || '??';
  const syllables = ENGLISH_SYLLABLES[id] || [ENGLISH_NAME[id] || ''];
  const isMultiLine = syllables.length > 1;

  // Multi-line captions shrink a hair so two lines + the Korean monogram
  // all fit inside the tile comfortably.
  const engFontSize = isMultiLine
    ? Math.max(7, Math.min(9.5, size * 0.135))
    : Math.max(8, Math.min(11, size * 0.16));

  const koFontSize = isMultiLine ? size * 0.33 : size * 0.36;

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size * 0.24,
          backgroundColor: withAlpha(color, 0.16),
          borderColor: withAlpha(color, 0.35),
          borderWidth: 0.5,
          paddingHorizontal: size * 0.08,
          gap: size * 0.04,
        },
        style,
      ]}
    >
      <Text
        allowFontScaling={false}
        style={{
          color,
          fontSize: koFontSize,
          fontWeight: '800',
          letterSpacing: -0.7,
        }}
      >
        {mono}
      </Text>

      {/* English caption — one row per syllable */}
      <View style={styles.captionColumn}>
        {syllables.map((s, i) => (
          <Text
            key={i}
            allowFontScaling={false}
            numberOfLines={1}
            style={{
              color,
              opacity: 0.62,
              fontSize: engFontSize,
              fontWeight: '700',
              letterSpacing: 0.7,
              lineHeight: engFontSize * 1.05,
            }}
          >
            {s}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  captionColumn: {
    alignItems: 'center',
  },
});
