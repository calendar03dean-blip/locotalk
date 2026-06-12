/**
 * LocationPermissionGate — OS 위치 권한 필수 게이트(진입 차단형)
 *
 * 로코톡은 위치 기반 서비스라 OS 위치 권한 없이는 매칭이 불가 → 홈/온보딩 진입 '전' 필수 관문.
 * 법적 동의(locationConsent, 위치기반서비스 약관 체크박스)와는 별개인 'OS 런타임 권한'을 여기서 강제한다.
 *
 *  - 이미 허용된 권한이면 UI 없이 즉시 onGranted()(플래시 없음 — 재방문/사전허용 사용자).
 *  - 미정 상태면 안내(📍 카피) 후 권한 요청 → 허용 시에만 onGranted()(진입 허용).
 *  - 거부 시 닫기 불가: 안내 + iOS 설정 이동 + 재확인만 제공 → 홈 진입 차단.
 *
 * onGranted() 는 호출부(LoginScreen)가 setAuth/applyLoginResult/setLoggedIn(진입)을
 * 실행하는 시점이다. 따라서 권한 거부 시 onGranted 가 호출되지 않아 진입 자체가 막힌다.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { useT } from '../i18n';
import { useStore } from '../store';

interface Props {
  visible: boolean;
  onGranted: () => void;   // 권한 허용 시에만 호출(=진입 허용)
}

export default function LocationPermissionGate({ visible, onGranted }: Props) {
  const t = useT();
  const setLocationPermission = useStore(s => s.setLocationPermission);
  // 'check' 동안은 UI 미노출 — 이미 허용된 사용자에게 카피가 깜빡이지 않게 한다.
  const [phase, setPhase] = useState<'check' | 'intro' | 'denied'>('check');
  const [busy, setBusy] = useState(false);

  // visible 진입 시 현재 권한 상태 확인 — 이미 허용이면 통과, 아니면 안내.
  useEffect(() => {
    if (!visible) { setPhase('check'); return; }
    let cancelled = false;
    (async () => {
      try {
        const Location = await import('expo-location');
        const { status } = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        if (status === 'granted') { setLocationPermission(true); onGranted(); return; }
        setPhase('intro');
      } catch {
        if (!cancelled) setPhase('intro'); // 모듈 오류 시에도 안내는 노출(차단 유지)
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // 권한 요청(미정 → OS 다이얼로그 / 이미 거부 → 즉시 거부 반환).
  const request = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setLocationPermission(granted);
      if (granted) onGranted(); else setPhase('denied');
    } catch {
      setPhase('denied');
    } finally {
      setBusy(false);
    }
  };

  // iOS 설정에서 허용 후 돌아왔을 때 재확인(이미 거부 상태는 재요청 다이얼로그가 안 뜸).
  const recheck = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.getForegroundPermissionsAsync();
      const granted = status === 'granted';
      setLocationPermission(granted);
      if (granted) onGranted();
    } catch {
      /* 무시 — 거부 화면 유지 */
    } finally {
      setBusy(false);
    }
  };

  if (!visible || phase === 'check') return null;

  const denied = phase === 'denied';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => { /* 닫기 차단 */ }}>
      <View style={s.backdrop}>
        <View style={[s.card, Shadow.glass]}>
          {!denied && (
            <View style={s.progressChip}>
              <Text style={s.progressTxt}>{t('locperm_intro_extra')}</Text>
            </View>
          )}
          <Text style={s.title}>{denied ? t('locperm_denied_title') : t('locperm_title')}</Text>
          <Text style={s.body}>{denied ? t('locperm_denied_body') : t('locperm_body')}</Text>

          {denied ? (
            <>
              <TouchableOpacity style={s.primaryBtn} onPress={() => Linking.openSettings()} activeOpacity={0.85}>
                <Text style={s.primaryTxt}>{t('locperm_open_settings')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.secondaryBtn} onPress={recheck} disabled={busy} activeOpacity={0.7}>
                {busy ? <ActivityIndicator color={Colors.primary} /> : <Text style={s.secondaryTxt}>{t('locperm_recheck')}</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={s.primaryBtn} onPress={request} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryTxt}>{t('locperm_allow')}</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  card:         { width: '100%', maxWidth: 360, backgroundColor: Colors.sf, borderRadius: Radius.xxl, padding: Spacing.xl },
  progressChip: { alignSelf: 'center', backgroundColor: Colors.primaryTint, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
  progressTxt:  { fontSize: Typography.footnote, fontWeight: '700', color: Colors.primary },
  title:        { fontSize: Typography.title3, fontWeight: '800', color: Colors.dark, textAlign: 'center' },
  body:         { fontSize: Typography.subhead, color: Colors.g4, lineHeight: 22, textAlign: 'center', marginTop: 12, marginBottom: 20 },
  primaryBtn:   { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 15, alignItems: 'center' },
  primaryTxt:   { color: '#fff', fontSize: Typography.headline, fontWeight: '700' },
  secondaryBtn: { paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  secondaryTxt: { color: Colors.primary, fontSize: Typography.footnote, fontWeight: '700' },
});
