/**
 * PortOneVerifyModal — 포트원 V2 통신사 본인인증 모달
 *
 * 공식 @portone/react-native-sdk 의 IdentityVerification 컴포넌트 사용.
 * (커스텀 WebView 는 iOS WKWebView 의 교차출처 차단으로 prepare fetch 가
 *  "Load failed" 되어 작동 불가 → 공식 SDK 가 WebView 를 직접 호스팅하여 해결)
 *
 * 서버 /auth/portone-verify 가 identityVerificationId 로 V2 인증결과를 조회.
 */
import React, { useMemo, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IdentityVerification } from '@portone/react-native-sdk';

const BASE = 'https://locotalk-production.up.railway.app';

// 포트원 V2 식별값 (콘솔에서 확인 — 클라이언트 공개 가능 값)
const PORTONE_STORE_ID    = process.env.PORTONE_STORE_ID    || 'store-0cedce90-6165-447b-8694-40fb67ec7481';
// NHN(KCP) 본인확인 채널
const PORTONE_CHANNEL_KEY = process.env.PORTONE_CHANNEL_KEY || 'channel-key-27a776e9-50e0-4e1a-9713-d3fbc110b239';

interface VerifiedInfo {
  name: string;
  birth: string;       // YYYYMMDD
  gender: 'male' | 'female';
  phone: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onVerified: (info: VerifiedInfo) => void;
  userId: string;
}

export default function PortOneVerifyModal({ visible, onClose, onVerified, userId }: Props) {
  const [loading, setLoading] = useState(false);

  // 인증ID 는 모달이 열릴 때 한 번만 생성 (visible 토글마다 갱신)
  // ⚠️ KCP 는 이 값을 ordr_idxx(주문번호)로 사용 → 짧은 영숫자만 허용(하이픈/길이 제한).
  //    userId 는 서버 POST 에 따로 전달하므로 ID 에 넣지 않는다.
  const identityVerificationId = useMemo(
    () => `idv${Date.now().toString(36)}${Math.floor(Math.random() * 1679616).toString(36)}`,
    [visible],
  );

  // 인증 완료 → 서버에서 실제 사용자 정보 조회
  const handleComplete = async (response: any) => {
    // code 가 있으면 실패/취소
    if (response?.code) {
      const code = String(response.code);
      if (!/CANCEL|USER_CANCEL/i.test(code)) {
        Alert.alert('본인인증 실패', response.message || '잠시 후 다시 시도해주세요.');
      }
      onClose();
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${BASE}/auth/portone-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityVerificationId: response?.identityVerificationId || identityVerificationId,
          userId,
        }),
      });
      const result = await res.json();

      if (result.success) {
        onVerified({
          name:   result.name,
          birth:  result.birth,
          gender: result.gender,
          phone:  result.phone,
        });
      } else {
        Alert.alert('인증 실패', result.error || '잠시 후 다시 시도해주세요.');
        onClose();
      }
    } catch {
      Alert.alert('오류', '인증 처리 중 오류가 발생했습니다.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error: Error) => {
    Alert.alert('본인인증 오류', error?.message || '본인인증을 시작할 수 없습니다.', [
      { text: '확인', onPress: onClose },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={st.safe}>
        <View style={st.header}>
          <TouchableOpacity onPress={onClose} style={st.closeBtn}>
            <Text style={st.close}>✕</Text>
          </TouchableOpacity>
          <Text style={st.title}>통신사 본인인증</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1 }}>
          {visible && (
            <IdentityVerification
              request={{
                storeId: PORTONE_STORE_ID,
                identityVerificationId,
                channelKey: PORTONE_CHANNEL_KEY,
              }}
              onComplete={handleComplete}
              onError={handleError}
              // WKWebView 기본 UA 는 "Safari" 표기가 없어 일부 PG/본인인증 서버가
              // 모바일 채널을 못 찾는 경우가 있음 → 완전한 모바일 Safari UA 지정
              userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
              style={{ flex: 1 }}
            />
          )}
          {loading && (
            <View style={st.loadingOverlay}>
              <ActivityIndicator size="large" color="#40D3B6" />
              <Text style={st.loadingTxt}>인증 확인 중...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const st = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#fff' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  closeBtn:       { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  close:          { fontSize: 18, color: '#666' },
  title:          { fontSize: 17, fontWeight: '700', color: '#111' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 10, gap: 12 },
  loadingTxt:     { fontSize: 14, color: '#888' },
});
