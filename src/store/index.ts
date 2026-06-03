import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

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
}

interface Peer {
  nick: string;
  interests: string[];
  region: string;
  roomId: string;
  distanceKm?: number | null;  // 프리미엄 전용 — 상대방과의 거리 (km)
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
  setAuth: (provider: AuthProvider, email?: string) => void;
  clearAuth: () => void;

  // 프로필 설정 완료
  isLoggedIn: boolean;
  user: User | null;
  setLoggedIn: (user: User) => void;
  setLoggedOut: () => void;
  updateRegion: (gu: string, label: string) => void;
  updateInterests: (interests: string[]) => void;

  // 매칭
  peer: Peer | null;
  roomId: string | null;
  setPeer: (peer: Peer | null) => void;
  setRoomId: (id: string | null) => void;

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
}

export const useStore = create<AppState>((set, get) => ({
  lang: detectLang(),
  setLang: (lang) => set({ lang }),

  hasAuth: false,
  authProvider: null,
  authEmail: null,
  setAuth: (provider, email) => set({ hasAuth: true, authProvider: provider, authEmail: email ?? null }),
  clearAuth: () => set({ hasAuth: false, authProvider: null, authEmail: null }),

  isLoggedIn: false,
  user: null,
  setLoggedIn: (user) => set({ isLoggedIn: true, user }),
  setLoggedOut: () => {
    clearChatSession().catch(() => {});
    set({ hasAuth: false, authProvider: null, authEmail: null, isLoggedIn: false, user: null, peer: null, roomId: null });
  },
  updateRegion: (gu, label) =>
    set((s) => ({ user: s.user ? { ...s.user, regionGu: gu, regionLabel: label } : null })),
  updateInterests: (interests) =>
    set((s) => ({ user: s.user ? { ...s.user, interests } : null })),

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

}));
