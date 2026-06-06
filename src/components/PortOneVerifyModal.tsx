/**
 * PortOneVerifyModal — 포트원(아임포트) 통신사 본인인증 모달
 * 
 * 사용 전 필요:
 * 1. portone.io 가맹점 가입 + 본인확인 서비스 신청
 * 2. PORTONE_STORE_ID 환경변수 설정
 * 3. 서버 /auth/portone-verify 엔드포인트 구현
 */
import React, { useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const BASE = 'https://locotalk-production.up.railway.app';
const CERT_PAGE = 'https://calendar03dean-blip.github.io/locotalk/certification.html';

// ⚠️ 포트원 가맹점 식별코드 (portone.io 콘솔에서 확인)
// 실제 배포 시 환경변수로 관리하거나 Railway에 설정
const PORTONE_STORE_ID = process.env.PORTONE_STORE_ID || 'imp18543766';

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
  const [loading, setLoading] = useState(true);
  const webviewRef = useRef<WebView>(null);

  const certUrl =
    `${CERT_PAGE}` +
    `?store_id=${encodeURIComponent(PORTONE_STORE_ID)}` +
    `&merchant_uid=locotalk_${userId}_${Date.now()}`;

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (!data.success) {
        Alert.alert('본인인증 실패', data.error || '인증에 실패했습니다. 다시 시도해주세요.');
        onClose();
        return;
      }

      // 서버에서 imp_uid로 실제 사용자 정보 조회
      setLoading(true);
      const res = await fetch(`${BASE}/auth/portone-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imp_uid: data.imp_uid,
          merchant_uid: data.merchant_uid,
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
          {loading && (
            <View style={st.loadingOverlay}>
              <ActivityIndicator size="large" color="#40D3B6" />
              <Text style={st.loadingTxt}>인증 화면 로딩 중...</Text>
            </View>
          )}
          <WebView
            ref={webviewRef}
            source={{ uri: certUrl }}
            onMessage={handleMessage}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              Alert.alert('본인인증 오류', '인증 화면을 불러올 수 없습니다.\n잠시 후 다시 시도해주세요.', [
                { text: '확인', onPress: onClose },
              ]);
            }}
            onHttpError={() => { setLoading(false); }}
            javaScriptEnabled
            domStorageEnabled
            thirdPartyCookiesEnabled
            originWhitelist={['*']}
            // 통신사 PASS 앱 등 외부 스킴 허용
            onShouldStartLoadWithRequest={(req: any) => {
              const u = req?.url || '';
              if (/^https?:/i.test(u) || u.startsWith('about:')) return true;
              // 외부 앱 스킴(intent:, ispmobile:, kftc-bankpay:, 통신사 PASS 등)은 시스템에 위임
              try { Linking.openURL(u); } catch {}
              return false;
            }}
            style={{ flex: 1 }}
          />
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
