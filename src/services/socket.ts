/**
 * Locotalk Socket Service
 *
 * Dev URL 자동 감지:
 *   - Expo Go가 Metro 서버에 접속할 때 쓰는 호스트 IP를 Constants에서 읽어
 *     소켓 서버 URL을 자동으로 구성합니다.
 *   - 시뮬레이터: 127.0.0.1:4000
 *   - 실기기 (같은 WiFi): 192.168.x.x:4000  ← 자동 감지
 *   - 프로덕션: PROD_URL
 */

import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Application from 'expo-application';

// 통신비밀보호법: 기기 식별값(IDFV/AndroidId) — 접속로그용. 비식별 단말 식별자(개인정보 아님).
let _deviceId: string | null = null;
(async () => {
  try {
    _deviceId = Platform.OS === 'ios'
      ? await Application.getIosIdForVendorAsync()
      : ((Application as any).getAndroidId?.() ?? (Application as any).androidId ?? null);
  } catch { _deviceId = null; }
})();

const SOCKET_PORT = 4000;
const PROD_URL    = 'https://locotalk-production.up.railway.app';

// ─── 개발 서버 URL 자동 감지 ─────────────────────────────────────
function getDevServerUrl(): string {
  // Expo Go: Constants.manifest.debuggerHost = "192.168.1.171:8081"
  // Dev build: Constants.expoConfig.hostUri  = "192.168.1.171:8081"
  const raw =
    (Constants.manifest  as any)?.debuggerHost ??
    (Constants.expoConfig as any)?.hostUri      ??
    '127.0.0.1:8081';

  const host = raw.split(':')[0] || '127.0.0.1';
  return `http://${host}:${SOCKET_PORT}`;
}

export const SERVER_URL = __DEV__ ? getDevServerUrl() : PROD_URL;

// ─── Singleton ────────────────────────────────────────────────────
let _socket: Socket | null = null;

/**
 * 소켓 연결 (이미 연결됐으면 재사용, 끊겼으면 같은 인스턴스 재연결).
 *
 * ⚠️  소켓을 재생성하면 AppTabs 에 등록된 match_request/passive_match_found
 *     리스너가 구 소켓에 묶여 이벤트를 수신할 수 없게 됩니다.
 *     항상 같은 Socket 객체를 재사용해야 리스너가 유지됩니다.
 */
export function connectSocket(): Socket {
  if (_socket?.connected) return _socket;

  if (!_socket) {
    // 최초 생성
    console.log('[socket] creating socket →', SERVER_URL);
    _socket = io(SERVER_URL, {
      transports          : ['websocket'],
      reconnection        : true,
      reconnectionDelay   : 1500,
      reconnectionAttempts: 10,
      timeout             : 10000,
      // 핸드셰이크에 userId/deviceId 탑재(재연결마다 재평가) → 서버가 connect 시점부터
      // socket.userId 확보 → list_conversations/get_chat_history 가 join 없이도 인증됨.
      auth: (cb: (data: Record<string, any>) => void) => {
        let userId: string | null = null;
        let token: string | null = null;
        try {
          const { useStore } = require('../store');
          const st = useStore.getState();
          userId = st.user?.id || st.authUserId || null;
          token  = st.authToken || null;   // 서버검증 신뢰 JWT(있으면) → 서버 io.use 가 검증해 userVerified 설정.
        } catch { /* onboarding 등 */ }
        // token 없으면 서버가 claim(userId) 폴백 → build 38 등 무중단.
        cb({ userId, deviceId: _deviceId, token });
      },
    });

    // 매칭 emit(join_queue/join_standby)에 '지인 매칭 피하기' 식별자 자동 주입
    // (전화번호 해시 — 원본 번호는 절대 전송하지 않음)
    const _origEmit = (_socket.emit as any).bind(_socket);
    (_socket as any).emit = (event: any, ...args: any[]) => {
      if ((event === 'join_queue' || event === 'join_standby') && args[0] && typeof args[0] === 'object') {
        try {
          const { useStore } = require('../store');
          const st = useStore.getState();
          const on = !!(st.isPremium && st.avoidContacts);
          args[0] = {
            // 기본값은 store 에서, 단 payload 가 이미 가진 값이 우선(덮어쓰지 않음)
            phoneHash    : st.myPhoneHash || null,
            avoidContacts: on,
            contactHashes: on ? (st.contactHashes || []) : [],
            // 법령준수: 성인인증 가드(userId) + 접속로그(deviceId) + 위치수집방식 식별자
            userId        : st.user?.id || st.authUserId || null,
            deviceId      : _deviceId,
            locationMethod: 'GPS',
            // JWT Stage B: 신뢰 토큰 동봉 → 서버 shouldBlockUnverified/인가가 토큰으로도 검증.
            //   (모든 join 호출부 — HomeScreen/RootNavigator/ChatScreen — 무수정으로 중앙 주입)
            authToken     : st.authToken || null,
            ...args[0],
          };
        } catch { /* onboarding 단계 등 — 무시 */ }
      }
      return _origEmit(event, ...args);
    };

    _socket.on('connect', () => {
      console.log('[socket] ✅ connected', _socket?.id);
      try {
        const { getPushToken } = require('./notifications');
        const { useStore }     = require('../store');
        const st    = useStore.getState();
        const token = getPushToken();
        const nick  = st.user?.nickname;
        if (token && nick && _socket) {
          // userId 동봉 → 서버가 push_tokens 에 userId 기준 영속(재배포 생존 + 닉 충돌 제거)
          _socket.emit('register_push_token', {
            token, nick,
            userId: st.user?.id || st.authUserId || null,
            platform: Platform.OS,
          });
        }
      } catch { /* onboarding 단계엔 무시 */ }
    });
    _socket.on('disconnect',    (r) => console.log('[socket] ❌ disconnected', r));
    _socket.on('connect_error', (e) => console.log('[socket] ⚠️  error', e.message));
  } else {
    // 기존 소켓 재연결 — removeAllListeners 없이 재사용 (리스너 보존)
    console.log('[socket] reconnecting (preserving listeners)');
    _socket.connect();
  }

  return _socket;
}

export function getSocket(): Socket | null { return _socket; }

export function disconnectSocket(): void {
  _socket?.removeAllListeners();
  _socket?.disconnect();
  _socket = null;
}

export function isConnected(): boolean {
  return _socket?.connected ?? false;
}
