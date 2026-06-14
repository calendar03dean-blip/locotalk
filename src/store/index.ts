import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import { hashPhone } from '../utils/phonehash';

export type Lang = 'ko' | 'en';

/** Detect device locale once at startup. */
function detectLang(): Lang {
  try {
    let locale = 'ko';
    if (Platform.OS === 'ios') {
      locale =
        (NativeModules.SettingsManager?.settings?.AppleLocale as string) ||
        ((NativeModules.SettingsManager?.settings?.AppleLanguages as string[])?.[0]) ||
        'ko';
    } else if (Platform.OS === 'android') {
      locale = (NativeModules.I18nManager?.localeIdentifier as string) || 'ko';
    }
    return locale.startsWith('en') ? 'en' : 'ko';
  } catch {
    return 'ko';
  }
}

// ─── 채팅 세션 지속성 (앱 재시작 후 재진입용) ─────────────────────
const SESSION_KEY = 'locotalk_session_v1';

export interface SavedSession {
  peer  : Peer;
  roomId: string;
  savedAt: number;   // epoch ms
}

export async function saveChatSession(peer: Peer, roomId: string): Promise<void> {
  const data: SavedSession = { peer, roomId, savedAt: Date.now() };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export async function loadChatSession(): Promise<SavedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedSession;
  } catch { return null; }
}

export async function clearChatSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

interface User {
  id: string;
  nickname: string;
  interests: string[];  // 최대 3개
  regionGu: string;
  regionLabel: string;  // "마포구 · 서교동" 형태
  email?: string;
  phone?: string;
  name?: string;           // 실명 (본인인증 시 입력)
  gender?: 'male' | 'female' | null;
  birthYear?: number | null;
  isVerified?: boolean;    // 본인인증 완료
  verifiedAt?: string | null;
}

interface Peer {
  nick: string;
  interests: string[];
  region: string;
  roomId: string;
  distanceKm?: number | null;  // 프리미엄 전용 — 상대방과의 거리 (km)
  isVerified?: boolean;        // 본인인증 여부
  gender?: 'male' | 'female' | null;    // 프리미엄만 볼 수 있음
  birthYear?: number | null;            // 프리미엄만 볼 수 있음
}

export type AuthProvider = 'google' | 'kakao' | 'naver' | 'email' | 'apple';

interface AppState {
  // 언어
  lang: Lang;
  setLang: (lang: Lang) => void;

  // 소셜/이메일 인증
  hasAuth: boolean;
  authProvider: AuthProvider | null;
  authEmail: string | null;
  authUserId: string | null;   // 서버 DB 사용자 ID
  authToken: string | null;    // 서버 발급 신뢰 JWT (provider 검증 통과 시) — 핸드셰이크/HTTP 인증용
  setAuth: (provider: AuthProvider, email?: string, userId?: string, token?: string | null) => void;
  clearAuth: () => void;
  // 본인인증=로그인: 신규 유저 온보딩이 isVerified/성별/생년을 채우도록 전달하는 임시 보관값
  pendingVerified: { gender?: 'male' | 'female'; birthYear?: number; phone?: string; name?: string } | null;
  setPendingVerified: (info: { gender?: 'male' | 'female'; birthYear?: number; phone?: string; name?: string } | null) => void;

  // 프로필 설정 완료
  isLoggedIn: boolean;
  user: User | null;
  setLoggedIn: (user: User) => void;
  setLoggedOut: () => void;
  updateRegion: (gu: string, label: string) => void;
  updateInterests: (interests: string[]) => void;
  // 코드네임(표시명) 갱신 — 오프라인 진입 후 flush 중 충돌(409) 재배정 시 클라/서버 일치 동기화용
  updateNickname: (nickname: string) => void;
  setVerified: (gender: 'male'|'female', birthYear: number) => void;
  setPhoneVerified: (phone: string, name?: string, birthYear?: number, gender?: 'male' | 'female') => void;
  updateEmail: (email: string) => void;

  // 매칭
  peer: Peer | null;
  roomId: string | null;
  setPeer: (peer: Peer | null) => void;
  setRoomId: (id: string | null) => void;

  // 빈채팅 화면 '매칭 시작하기' → 홈 이동 후 자동 매칭 트리거 (증가 카운터)
  autoMatchTrigger: number;
  requestAutoMatch: () => void;

  // 패시브 매칭 (채팅 받기)
  acceptsChat: boolean;
  setAcceptsChat: (v: boolean) => void;

  // 차단
  blockedUsers: string[];
  blockUser: (nick: string) => void;

  // 매칭 히스토리 (재매칭 감지용)
  matchHistory: string[];
  addToMatchHistory: (nick: string) => void;

  // ── 유료화 ──────────────────────────────────────────────────────
  isPremium: boolean;
  setPremium: (v: boolean) => void;

  // 지인 매칭 피하기 (프리미엄) — 연락처 전화번호 해시로 지인 매칭 제외
  avoidContacts: boolean;
  contactHashes: string[];      // 내 연락처 번호 해시 목록 (원본 번호 저장 안 함)
  myPhoneHash: string | null;   // 내 본인인증 번호 해시 (매칭 식별용)
  setAvoidContacts: (v: boolean) => void;
  setContactHashes: (h: string[]) => void;
  setMyPhoneHash: (h: string | null) => void;

  // 매칭 횟수 (1시간 단위 제한: 무료 10회 / 유료 30회)
  matchCountThisHour: number;
  matchCountResetAt: number;   // epoch ms — 이 시각 이후 카운트 초기화
  consumeMatchSlot: () => boolean;  // true: 사용 가능 / false: 한도 초과
  resetMatchCountIfNeeded: () => void;

  // 유료 전용 지역 설정
  customRegionGu: string;
  customRegionLabel: string;
  setCustomRegion: (gu: string, label: string) => void;

  // GPS 좌표 (매칭 거리 계산용)
  userLat: number | null;
  userLng: number | null;
  setUserCoords: (lat: number, lng: number) => void;

  // 위치기반서비스 이용약관 동의 (위치정보법) — 서버 location_consent 와 동기화
  locationConsent: boolean;
  setLocationConsent: (v: boolean) => void;

  // OS 런타임 위치 권한 상태 (legal consent 와 분리) — null: 미확인, true: 허용, false: 거부
  // ⚠️ locationConsent(법적 동의 이력)와 절대 한 플래그로 묶지 말 것
  locationPermission: boolean | null;
  setLocationPermission: (v: boolean | null) => void;
}

export const useStore = create<AppState>()(persist((set, get) => ({
  lang: detectLang(),
  setLang: (lang) => set({ lang }),

  hasAuth: false,
  authProvider: null,
  authEmail: null,
  authUserId: null,
  authToken: null,
  setAuth: (provider, email, userId, token) => set({ hasAuth: true, authProvider: provider, authEmail: email ?? null, authUserId: userId ?? null, authToken: token ?? null }),
  clearAuth: () => set({ hasAuth: false, authProvider: null, authEmail: null, authUserId: null, authToken: null }),
  pendingVerified: null,
  setPendingVerified: (info) => set({ pendingVerified: info }),

  isLoggedIn: false,
  user: null,
  setLoggedIn: (user) => set({ isLoggedIn: true, user }),
  setLoggedOut: () => {
    clearChatSession().catch(() => {});
    // 로그아웃 시 소켓 정리 → 재로그인 시 새 소켓이 새 userId 로 핸드셰이크 재연결.
    // (안 끊으면 connectSocket 이 기존 연결 재사용 → 서버 socket.userId 가 이전 유저로 고착)
    try { (require('../services/socket') as typeof import('../services/socket')).disconnectSocket(); } catch {}
    set({ hasAuth: false, authProvider: null, authEmail: null, authToken: null, pendingVerified: null, isLoggedIn: false, user: null, peer: null, roomId: null });
  },
  setVerified: (gender, birthYear) =>
    set((s) => ({ user: s.user ? { ...s.user, isVerified: true, verifiedAt: new Date().toISOString(), gender, birthYear } : null })),
  setPhoneVerified: (phone, name, birthYear, gender) => {
    set((s) => ({
      user: s.user ? {
        ...s.user,
        phone,
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        ...(name      !== undefined && { name }),
        ...(birthYear !== undefined && { birthYear }),
        ...(gender    !== undefined && { gender }),
      } : s.user,
    }));
    // 지인 매칭 식별용 내 번호 해시 계산 (비동기)
    hashPhone(phone).then(h => set({ myPhoneHash: h || null })).catch(() => {});
  },
  updateEmail: (email) =>
    set((s) => ({ user: s.user ? { ...s.user, email } : null })),
  updateRegion: (gu, label) =>
    set((s) => ({ user: s.user ? { ...s.user, regionGu: gu, regionLabel: label } : null })),
  updateInterests: (interests) =>
    set((s) => ({ user: s.user ? { ...s.user, interests } : null })),
  updateNickname: (nickname) =>
    set((s) => ({ user: s.user ? { ...s.user, nickname } : null })),

  peer: null,
  roomId: null,
  setPeer: (peer) => {
    set({ peer });
    if (!peer) { clearChatSession().catch(() => {}); }
    else {
      const roomId = get().roomId;
      if (roomId) saveChatSession(peer, roomId).catch(() => {});
    }
  },
  autoMatchTrigger: 0,
  requestAutoMatch: () => set((s) => ({ autoMatchTrigger: s.autoMatchTrigger + 1 })),

  setRoomId: (id) => {
    set({ roomId: id });
    if (!id) { clearChatSession().catch(() => {}); }
    else {
      const peer = get().peer;
      if (peer) saveChatSession(peer, id).catch(() => {});
    }
  },

  acceptsChat: true,
  setAcceptsChat: (v) => set({ acceptsChat: v }),

  blockedUsers: [],
  blockUser: (nick) =>
    set((s) => ({
      blockedUsers: s.blockedUsers.includes(nick)
        ? s.blockedUsers
        : [...s.blockedUsers, nick],
    })),

  matchHistory: [],
  addToMatchHistory: (nick) =>
    set((s) => ({
      matchHistory: s.matchHistory.includes(nick)
        ? s.matchHistory
        : [...s.matchHistory, nick],
    })),

  // ── 유료화 ──────────────────────────────────────────────────────
  isPremium: false,
  setPremium: (v) => {
    set({ isPremium: v });
    AsyncStorage.setItem('locotalk_premium', v ? '1' : '0').catch(() => {});
  },

  avoidContacts: false,
  contactHashes: [],
  myPhoneHash: null,
  setAvoidContacts: (v) => {
    set({ avoidContacts: v });
    AsyncStorage.setItem('locotalk_avoid_contacts', v ? '1' : '0').catch(() => {});
  },
  setContactHashes: (h) => {
    set({ contactHashes: h });
    AsyncStorage.setItem('locotalk_contact_hashes', JSON.stringify(h)).catch(() => {});
  },
  setMyPhoneHash: (h) => set({ myPhoneHash: h }),

  matchCountThisHour: 0,
  matchCountResetAt: 0,

  resetMatchCountIfNeeded: () => {
    const { matchCountResetAt } = get();
    if (Date.now() >= matchCountResetAt) {
      const nextReset = Date.now() + 60 * 60 * 1000; // 1시간 후
      set({ matchCountThisHour: 0, matchCountResetAt: nextReset });
      AsyncStorage.setItem('locotalk_match_reset', String(nextReset)).catch(() => {});
      AsyncStorage.setItem('locotalk_match_count', '0').catch(() => {});
    }
  },

  consumeMatchSlot: () => {
    const { isPremium, matchCountThisHour, matchCountResetAt } = get();
    const limit = isPremium ? 30 : 10;

    // 리셋 시간 지났으면 초기화
    if (Date.now() >= matchCountResetAt) {
      const nextReset = Date.now() + 60 * 60 * 1000;
      set({ matchCountThisHour: 1, matchCountResetAt: nextReset });
      AsyncStorage.setItem('locotalk_match_reset', String(nextReset)).catch(() => {});
      AsyncStorage.setItem('locotalk_match_count', '1').catch(() => {});
      return true;
    }

    if (matchCountThisHour >= limit) return false; // 한도 초과

    const next = matchCountThisHour + 1;
    set({ matchCountThisHour: next });
    AsyncStorage.setItem('locotalk_match_count', String(next)).catch(() => {});
    return true;
  },

  customRegionGu: '',
  customRegionLabel: '',
  setCustomRegion: (gu, label) => {
    set({ customRegionGu: gu, customRegionLabel: label });
    AsyncStorage.setItem('locotalk_custom_region', JSON.stringify({ gu, label })).catch(() => {});
  },

  userLat: null,
  userLng: null,
  setUserCoords: (lat, lng) => set({ userLat: lat, userLng: lng }),

  locationConsent: false,
  setLocationConsent: (v) => set({ locationConsent: v }),

  locationPermission: null,
  setLocationPermission: (v) => set({ locationPermission: v }),

}), {
  // 자동 로그인 — 같은 기기에서 한 번 로그인하면 재실행 시 세션 복원.
  //   인증/로그인/프리미엄/위치동의만 영속(전이 상태 peer/roomId/pendingVerified 등 제외).
  //   ⚠️ 초기값(hasAuth/isLoggedIn=false)은 위 정의 그대로 — rehydrate 전엔 false, 저장된 세션 있으면 복원.
  name: 'locotalk_auth_v1',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (s) => ({
    hasAuth: s.hasAuth,
    authProvider: s.authProvider,
    authEmail: s.authEmail,
    authUserId: s.authUserId,
    authToken: s.authToken,
    isLoggedIn: s.isLoggedIn,
    user: s.user,
    isPremium: s.isPremium,
    locationConsent: s.locationConsent,
  }),
}));
