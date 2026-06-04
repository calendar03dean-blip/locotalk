/**
 * userApi.ts — 사용자 프로필 서버 DB 연동
 */
const BASE = 'https://locotalk-production.up.railway.app';

export interface UserProfile {
  id: string;
  nickname: string;
  email?: string;
  gender?: 'male' | 'female' | null;
  birthYear?: number | null;
  interests: string[];
  regionGu: string;
  regionLabel: string;
  isPremium: boolean;
}

export interface LoginResult {
  userId: string;
  isNew: boolean;
  isComplete: boolean;   // 닉네임/성별/생년 입력 완료 여부
  user: UserProfile | null;
}

/** 소셜 로그인 후 서버에 등록/확인 */
export async function serverLogin(
  provider: string,
  authId: string,
  email?: string,
): Promise<LoginResult> {
  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, authId, email }),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    // 서버 오류 시 로컬 fallback
    return { userId: `${provider}:${authId}`, isNew: true, isComplete: false, user: null };
  }
}

/** 프로필 저장 (회원가입 완료 시) */
export async function saveUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
  try {
    await fetch(`${BASE}/users/${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
  } catch (e) {
    console.warn('[userApi] saveProfile 실패:', e);
  }
}

/** 프로필 불러오기 */
export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${BASE}/users/${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** 프리미엄 상태 동기화 */
export async function syncPremiumStatus(userId: string, isPremium: boolean): Promise<void> {
  try {
    await fetch(`${BASE}/users/${encodeURIComponent(userId)}/premium`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPremium }),
    });
  } catch { /* silent */ }
}
