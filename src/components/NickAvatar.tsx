import React from 'react';
import { View, Text } from 'react-native';

const COLORS = [
  { bg: '#ECFDF5', fg: '#065F46' }, { bg: '#EDE9FE', fg: '#5B21B6' },
  { bg: '#FEF3C7', fg: '#92400E' }, { bg: '#FEE2E2', fg: '#991B1B' },
  { bg: '#E0F2FE', fg: '#075985' }, { bg: '#FCE7F3', fg: '#9D174D' },
];

function getNickColor(nick: string) {
  let h = 0;
  for (const c of nick) h = (h * 31 + c.charCodeAt(0)) % COLORS.length;
  return COLORS[h];
}

interface Props { nick: string; size?: number; style?: object; }

export default function NickAvatar({ nick, size = 40, style }: Props) {
  const c = getNickColor(nick);
  const fs = size * 0.38;
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center',
    }, style]}>
      <Text style={{ fontSize: fs, fontWeight: '800', color: c.fg }}>
        {nick.slice(0, 1)}
      </Text>
    </View>
  );
}
