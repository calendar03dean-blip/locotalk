/**
 * LocationConsentModal — 위치기반서비스 이용약관 동의 (위치정보법 준수)
 *
 * 위치정보법상 위치정보 수집·이용·제공에는 '위치기반서비스 이용약관'에 대한
 * 명시적 동의가 필요. 동의 시 서버(location_consent)에 기록하고, 동의해야
 * 위치 기반 매칭(GPS 거리)이 활성화됨.
 */
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { useT } from '../i18n';
import { setLocationConsent as saveConsent } from '../services/userApi';

const PRIVACY_URL = 'https://locotalk-production.up.railway.app/privacy';

interface Props {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onAgree: () => void;   // 동의 저장 성공 시 호출 (매칭 계속)
}

export default function LocationConsentModal({ visible, userId, onClose, onAgree }: Props) {
  const t = useT();
  const [saving, setSaving] = useState(false);

  const agree = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // 서버 기록 (userId 없으면 로컬 동의만 — 게스트). 실패해도 진행은 막지 않되 재시도 가능.
      if (userId) await saveConsent(userId, true);
      onAgree();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <SafeAreaView style={s.sheet} edges={['bottom']}>
          <View style={s.handle} />
          <Text style={s.title}>{t('loc_consent_title')}</Text>
          <Text style={s.sub}>{t('loc_consent_sub')}</Text>

          <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 8 }}>
            <Text style={s.h}>{t('loc_consent_h1')}</Text>
            <Text style={s.p}>{t('loc_consent_p1')}</Text>
            <Text style={s.h}>{t('loc_consent_h2')}</Text>
            <Text style={s.p}>{t('loc_consent_p2')}</Text>
            <Text style={s.h}>{t('loc_consent_h3')}</Text>
            <Text style={s.p}>{t('loc_consent_p3')}</Text>

            <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
              <Text style={s.link}>{t('loc_consent_policy_link')}</Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity style={s.agreeBtn} onPress={agree} disabled={saving} activeOpacity={0.85}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.agreeTxt}>{t('loc_consent_agree')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={s.cancelTxt}>{t('loc_consent_cancel')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: Colors.sf, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.lg, maxHeight: '85%' },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.g2, alignSelf: 'center', marginBottom: 14 },
  title:     { fontSize: Typography.title3, fontWeight: '800', color: Colors.dark, textAlign: 'center' },
  sub:       { fontSize: Typography.footnote, color: Colors.g4, textAlign: 'center', marginTop: 6, marginBottom: 14 },
  body:      { maxHeight: 320, backgroundColor: Colors.g1, borderRadius: Radius.lg, padding: Spacing.md },
  h:         { fontSize: Typography.subhead, fontWeight: '700', color: Colors.dark, marginTop: 10 },
  p:         { fontSize: Typography.footnote, color: Colors.g4, lineHeight: 20, marginTop: 4 },
  link:      { fontSize: Typography.footnote, color: Colors.primary, fontWeight: '600', marginTop: 16, textDecorationLine: 'underline' },
  agreeBtn:  { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
  agreeTxt:  { color: '#fff', fontSize: Typography.headline, fontWeight: '700' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  cancelTxt: { color: Colors.g3, fontSize: Typography.footnote, fontWeight: '600' },
});
