// src/components/ActivityRing.tsx
// SPOTA — Apple-Activity-style ring gauge for region 활동지수
//
// Usage:
//   <ActivityRing value={87} color={Colors.primary} size={42} />

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Typography } from '../constants/theme';

interface Props {
  value: number;             // 0-100
  color: string;             // ring color
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;       // show % in the center (default true)
}

export default function ActivityRing({
  value,
  color,
  size = 42,
  strokeWidth = 4,
  showValue = true,
}: Props) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;

  // Track color = 15% of ring color
  const trackColor = color + '26';

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {showValue && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.center}>
            <Text style={[styles.value, { color, fontSize: size * 0.24 }]}>
              {Math.round(v)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  value: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
