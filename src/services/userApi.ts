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
  token?: string | null; // 서버 발급 신뢰 JWT (provider 검증 통과 시에만; 실패/구버전=null)
}

/** 저장된 신뢰 JWT 로 Authorization 헤더 생성(없으면 생략). 순환참조 방지 위해 지연 require. */
function authHeader(): Record<string, string> {
  try {
    const { useStore } = require('../store');
    const t = useStore.getState().authToken;
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch { return {}; }
}
function jsonAuthHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', ...authHeader() };
}

/** 소셜 로그인 후 서버에 등록/확인. providerToken(Apple identityToken/Google idToken/Kakao access token)
 *  동봉 시 서버가 검증 → 통과하면 응답 token(신뢰 JWT) 반환. 미동봉/실패면 token=null(로그인은 유지). */
export async function serverLogin(
  provider: string,
  authId: string,
  email?: string,
  providerToken?: string,
): Promise<LoginResult> {
  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, authId, email, providerToken }),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    // 서버 오류 시 로컬 fallback (토큰 없음 = 미검증)
    return { userId: `${provider}:${authId}`, isNew: true, isComplete: false, user: null, token: null };
  }
}

/** 프로필 저장 (회원가입 완료 시) */
export async function saveUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
  try {
    await fetch(`${BASE}/users/${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: jsonAuthHeaders(),
      body: JSON.stringify(profile),
    });
  } catch (e) {
    console.warn('[userApi] saveProfile 실패:', e);
  }
}

/** 프로필 불러오기 */
export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${BASE}/users/${encodeURIComponent(userId)}`, { headers: authHeader() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** 회원 탈퇴 — 서버에서 계정·프로필 영구 삭제 */
export async function deleteUserAccount(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/users/${encodeURIComponent(userId)}`, { method: 'DELETE', headers: authHeader() });
    return res.ok;
  } catch {
    return false;
  }
}

/** 위치기반서비스 이용약관 동의/철회 저장 (위치정보법) */
export async function setLocationConsent(userId: string, agreed: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/users/${encodeURIComponent(userId)}/location-consent`, {
      method: 'POST',
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ agreed }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch { return false; }
}

/** 프리미엄 상태 동기화 */
export async function syncPremiumStatus(userId: string, isPremium: boolean): Promise<void> {
  try {
    await fetch(`${BASE}/users/${encodeURIComponent(userId)}/premium`, {
      method: 'PATCH',
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ isPremium }),
    });
  } catch { /* silent */ }
}

// [제거] verifyIdentity — 레거시 self-verify(PATCH /users/:id/verify) 호출부. 서버 라우트와 함께 삭제.
//   검증 권위는 PortOne CI(/auth/portone-verify) 단일.
