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

const SOCKET_PORT = 4000;
const PROD_URL    = 'https://your-production-server.com'; // 출시 전 교체

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
    });

    _socket.on('connect', () => {
      console.log('[socket] ✅ connected', _socket?.id);
      try {
        const { getPushToken } = require('./notifications');
        const { useStore }     = require('../store');
        const token = getPushToken();
        const nick  = useStore.getState().user?.nickname;
        if (token && nick && _socket) {
          _socket.emit('register_push_token', { token, nick });
        }
      } catch { /* onboarding 단계엔 무시 */ }
    });
    _socket.on('disconnect',    (r) => console.log('[socket] ❌ disconnected', r));
    _socket.on('connect_error', (e) => console.warn('[socket] ⚠️  error', e.message));
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
