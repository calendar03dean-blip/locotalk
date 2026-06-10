/**
 * profileQueue.ts — 코드네임(프로필) 영속 오프라인 봉합
 *
 * 문제: 온보딩 코드네임 확정은 서버 영속 성공을 '요구'해 클라/서버 불일치는 막았으나,
 *   네트워크 단절(status 0)·서버 일시오류(5xx) 시 진입 자체가 하드 차단됐다(오프라인=진입불가).
 *   동의 증빙이 consentQueue 로 오프라인 봉합된 것과 동일한 신뢰성 패턴이 코드네임엔 없었다.
 *
 * 설계(차단 없는 신뢰성 — consentQueue 와 동형):
 *   1. 온라인 1차 시도(OnboardingScreen)에서 성공하면 큐 미사용(기존 경로 그대로, 409는 즉시 재생성).
 *   2. 네트워크/5xx 로 실패하면 프로필을 로컬 큐(AsyncStorage)에 적재 → 진입 허용(하드 차단 제거).
 *   3. flush(다음 로그인·앱 포그라운드·재연결)에서 서버 영속 재시도.
 *      - 늦은 충돌(409)이면 hex 재생성 후 재시도하고, 성공 시 store 표시 닉을 동기화(클라/서버 일치 유지).
 *      - 400(형식 위반 — 생성 코드네임에선 사실상 불가)은 영구 실패로 드롭(무한루프 방지).
 *   4. auth 미영속이므로 앱 재시작 시 LoginScreen 을 반드시 거친다 → 그 시점 flush 가 재연결을 책임진다.
 *      (POST /users/:id 는 requireAuth 미적용 — 토큰 없는 다음 세션 flush 도 영속 가능.)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveUserProfile, type UserProfile } from './userApi';
import { rerollHex } from '../constants/codename';

const PENDING_KEY = 'locotalk_pending_profiles';

export interface PendingProfile {
  userId: string;
  profile: Partial<UserProfile> & { nickname: string };
  ts: number; // epoch ms — 코드네임 확정(진입) 시점
}

async function readQueue(): Promise<PendingProfile[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(q: PendingProfile[]): Promise<void> {
  try {
    if (q.length === 0) await AsyncStorage.removeItem(PENDING_KEY);
    else await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(q));
  } catch {
    /* silent — 다음 적재/flush 때 재시도 */
  }
}

/** 같은 userId 는 최신 1건으로 갱신(중복 누적 방지 — 마지막 확정 프로필만 영속 대상). */
async function enqueue(entry: PendingProfile): Promise<void> {
  const q = await readQueue();
  const next = q.filter(e => e.userId !== entry.userId);
  next.push(entry);
  await writeQueue(next);
}

/** 늦은 충돌 재배정으로 hex 가 바뀌었으면 현재 로그인 유저의 표시 닉을 동기화(클라/서버 일치). */
function reconcileNickname(userId: string, nickname: string): void {
  try {
    const { useStore } = require('../store');
    const st = useStore.getState();
    if (st.user && st.user.id === userId && st.user.nickname !== nickname) {
      st.updateNickname(nickname);
    }
  } catch { /* store 미가용 — 무시(다음 로그인 시 서버 프로필로 복원됨) */ }
}

// 동시 flush 방지(앱 포그라운드 + 로그인 + 온보딩 직후 트리거가 겹칠 때 큐 경합 회피)
let flushing = false;

/** 큐에 남은 프로필을 서버에 영속 시도. 성공분만 제거, 일시 실패분은 잔류시켜 다음 기회에 재시도. */
export async function flushPendingProfiles(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const q = await readQueue();
    if (q.length === 0) return;
    const remaining: PendingProfile[] = [];
    for (const entry of q) {
      let nickname = entry.profile.nickname;
      let resolved = false; // 영속 완료 또는 영구 실패(드롭) — 큐에서 제거
      for (let attempt = 0; attempt < 4; attempt++) {
        const r = await saveUserProfile(entry.userId, { ...entry.profile, nickname });
        if (r.ok) {
          resolved = true;
          if (nickname !== entry.profile.nickname) reconcileNickname(entry.userId, nickname);
          break;
        }
        if (r.status === 409) { nickname = rerollHex(nickname); continue; } // 충돌 → 재생성 후 재시도
        if (r.status === 400) { resolved = true; break; }                    // 형식 위반(영구) → 드롭
        break; // 0(네트워크)/5xx → 잔류 후 다음 기회 재시도
      }
      if (!resolved) remaining.push({ ...entry, profile: { ...entry.profile, nickname } });
    }
    await writeQueue(remaining);
  } catch {
    /* silent — 큐는 보존됨 */
  } finally {
    flushing = false;
  }
}

/**
 * 오프라인 봉합 진입점 — 온라인 영속 실패(네트워크/5xx) 시 호출.
 *   로컬 큐에 '먼저' 적재(진입 허용의 근거)한 뒤 즉시 flush 트리거.
 *   호출부는 적재까지만 await 하면 됨(flush 는 백그라운드 best-effort).
 */
export async function recordProfileWithQueue(
  userId: string,
  profile: Partial<UserProfile> & { nickname: string },
): Promise<void> {
  if (!userId || !profile || !profile.nickname) return;
  await enqueue({ userId, profile, ts: Date.now() });
  flushPendingProfiles(); // fire-and-forget — 진입을 막지 않음
}
