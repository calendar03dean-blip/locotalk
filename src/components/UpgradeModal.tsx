import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, Radius, Typography, Spacing } from '../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  reason?: 'limit' | 'region' | 'history' | string;
}

function IcoStar({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#FFD700">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

function IcoCheck({ color = '#34C77E' }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5"
        stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IcoClose() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12"
        stroke={Colors.g4} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

const FEATURES = [
  { icon: '⚡', text: '매칭 30회/시간 (무료의 3배)' },
  { icon: '📍', text: '원하는 동네 자유 설정' },
  { icon: '💬', text: '채팅 내역 저장 (최대 200개)' },
  { icon: '📏', text: '상대방과의 거리 표시' },
  { icon: '🎯', text: '매칭 큐 우선 배치' },
];

export default function UpgradeModal({ visible, onClose, reason }: Props) {
  const reasonMsg =
    reason === 'limit'  ? '이번 시간 매칭 횟수를 모두 사용했어요.' :
    reason === 'region' ? '커스텀 지역 설정은 프리미엄 전용이에요.' :
    reason === 'history'? '채팅 내역 저장은 프리미엄 전용이에요.' :
    null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* 닫기 버튼 */}
          <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <IcoClose />
          </TouchableOpacity>

          {/* 헤더 */}
          <View style={s.header}>
            <IcoStar size={36} />
            <Text style={s.title}>Locotalk Premium</Text>
            <Text style={s.price}>₩5,900 / 월</Text>
            {reasonMsg && <Text style={s.reasonMsg}>{reasonMsg}</Text>}
          </View>

          {/* 기능 목록 */}
          <View style={s.featureList}>
            {FEATURES.map(f => (
              <View key={f.text} style={s.featureRow}>
                <Text style={s.featureIcon}>{f.icon}</Text>
                <Text style={s.featureTxt}>{f.text}</Text>
                <IcoCheck />
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity style={s.ctaBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={s.ctaTxt}>⭐ 프리미엄 시작하기</Text>
          </TouchableOpacity>

          <Text style={s.notice}>
            언제든 취소 가능 · App Store 결제
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.sf,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: 20,
    paddingBottom: 40,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.g1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#034A93',
  },
  reasonMsg: {
    fontSize: 13,
    color: Colors.g4,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  featureList: {
    gap: 12,
    marginBottom: 28,
    backgroundColor: Colors.g1,
    borderRadius: Radius.lg,
    padding: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    fontSize: 16,
    width: 24,
  },
  featureTxt: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark,
  },
  ctaBtn: {
    backgroundColor: '#034A93',
    borderRadius: Radius.pill,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#034A93',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  notice: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.g3,
    marginTop: 12,
  },
});
