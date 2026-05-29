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
}

interface AppState {
  // 언어
  lang: Lang;
  setLang: (lang: Lang) => void;

  // 인증
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
}

export const useStore = create<AppState>((set, get) => ({
  lang: detectLang(),
  setLang: (lang) => set({ lang }),

  isLoggedIn: false,
  user: null,
  setLoggedIn: (user) => set({ isLoggedIn: true, user }),
  setLoggedOut: () => {
    clearChatSession().catch(() => {});
    set({ isLoggedIn: false, user: null, peer: null, roomId: null });
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
}));
