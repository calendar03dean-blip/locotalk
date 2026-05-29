/**
 * Locotalk Push Notification Service
 *
 * - expo-notifications 로 Expo Push Token 취득
 * - 서버에 `register_push_token` 이벤트로 등록
 * - 포그라운드 알림 핸들러 설정
 * - 알림 탭 → 채팅 화면 이동 처리
 *
 * ⚠️  실제 백그라운드 푸시는 EAS 빌드(실 기기) 에서만 작동해요.
 *    Expo Go 는 포그라운드 로컬 알림만 지원합니다.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { getSocket } from './socket';

// 채팅 화면이 포커스 상태인지 추적 (포커스 중엔 중복 배너 방지)
let _chatFocused = false;
export const setChatFocused = (focused: boolean) => { _chatFocused = focused; };

/**
 * 알림 핸들러 — 앱이 포그라운드(active)이고 채팅 화면이 열려 있을 때만 배너 생략.
 *
 * ⚠️  _contentAvailable push 로 앱이 백그라운드에서 깨어나면
 *     AppState.currentState 가 'background' 이므로 suppress 조건이 false →
 *     배너가 항상 표시됩니다 (화면 꺼짐, 앱 종료 모두 포함).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => {
    // 앱이 실제로 foreground(active) 상태일 때만 suppress 적용
    const isActiveNow = AppState.currentState === 'active';
    const suppress    = _chatFocused && isActiveNow;
    return {
      shouldShowAlert : !suppress,
      shouldPlaySound : !suppress,
      shouldSetBadge  : false,
      shouldShowBanner: !suppress,
      shouldShowList  : true,
    };
  },
});

let _expoPushToken: string | null = null;

/** 푸시 권한 요청 + 토큰 반환. 실기기 전용 (시뮬레이터는 토큰 없음). */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[notifications] 시뮬레이터 — 푸시 토큰 생략');
    return null;
  }

  // Android 채널 설정
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name          : 'default',
      importance    : Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor    : '#1BAE84',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[notifications] 권한 거부됨');
    return null;
  }

  try {
    // SDK 50+ 에서 projectId 를 명시해야 올바른 토큰이 발급됩니다.
    // EAS 빌드: app.json extra.eas.projectId / Expo Go: Constants 에서 자동 탐지
    const projectId: string | undefined =
      (Constants.expoConfig?.extra as any)?.eas?.projectId ??
      (Constants.manifest2 as any)?.extra?.expoClient?.extra?.eas?.projectId ??
      undefined;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    _expoPushToken = tokenData.data;
    console.log('[notifications] 토큰:', _expoPushToken);
    return _expoPushToken;
  } catch (e) {
    console.warn('[notifications] 토큰 취득 실패', e);
    return null;
  }
}

/**
 * 소켓 서버에 푸시 토큰 등록.
 * nick 을 함께 보내야 앱 종료 후에도 서버가 토큰을 찾을 수 있어요.
 * 소켓이 아직 연결 중이면 connect 이벤트 후 자동 전송합니다.
 */
export function sendPushTokenToServer(token: string, nick: string): void {
  const socket = getSocket();
  if (socket?.connected) {
    socket.emit('register_push_token', { token, nick });
    return;
  }
  // 소켓이 연결 중이거나 아직 없음 → 연결되면 등록
  try {
    // socket.ts 의 connect 핸들러가 getPushToken()+nick 으로 재등록하지만,
    // 온보딩 직후처럼 nick이 store에 없을 수 있으므로 직접 once 등록
    const { connectSocket } = require('./socket') as typeof import('./socket');
    const s = connectSocket();
    const emit = () => s.emit('register_push_token', { token, nick });
    if (s.connected) emit();
    else s.once('connect', emit);
  } catch { /* 무시 */ }
}

/** 캐시된 토큰 반환 */
export function getPushToken(): string | null {
  return _expoPushToken;
}
