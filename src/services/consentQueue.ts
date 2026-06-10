/**
 * consentQueue.ts — 약관 동의 이력 영속 보강(증빙 유실 방지)
 *
 * 문제: 동의는 진입 게이트(allAgreed 체크박스)로 강제되지만, 서버 영속(recordConsents)은
 *   기존에 fire-and-forget(.catch(()=>{}))였고 호출부가 res.ok=false(서버 거부)도 버려서
 *   네트워크/서버 장애 시 '동의 증빙'이 흔적 없이 사라질 수 있었다(법령 리스크).
 *
 * 설계(차단 없는 신뢰성):
 *   1. 동의 시점에 로컬 큐(AsyncStorage)에 '먼저' 적재 → 이 로컬 기록이 1차 증빙.
 *   2. recordConsentsWithRetry(지수백오프, res.ok=false도 실패로 취급)로 서버 영속 시도.
 *   3. 성공 시 큐에서 제거 / 실패 시 잔류 → 다음 로그인·앱 포그라운드·네트워크 복귀 시 flush.
 *   4. 진입은 절대 막지 않음(동의 게이트가 이미 UX를 강제). 모든 동작은 best-effort 백그라운드.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordConsentsWithRetry } from './userApi';
import type { TermsDoc } from '../constants/terms';

const PENDING_KEY = 'locotalk_pending_consents';

export interface PendingConsent {
  userId: string;
  consents: { doc: TermsDoc['id']; version: string }[];
  ts: number; // epoch ms — 동의 시점(로컬 증빙 타임스탬프)
}

async function readQueue(): Promise<PendingConsent[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(q: PendingConsent[]): Promise<void> {
  try {
    if (q.length === 0) await AsyncStorage.removeItem(PENDING_KEY);
    else await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(q));
  } catch {
    /* silent — 다음 적재/flush 때 재시도 */
  }
}

/** 동의 시점 로컬 적재(1차 증빙). 같은 userId+버전셋은 최신 1건으로 갱신(중복 누적 방지). */
async function enqueue(entry: PendingConsent): Promise<void> {
  const q = await readQueue();
  const sig = (e: PendingConsent) =>
    `${e.userId}|${e.consents.map(c => `${c.doc}:${c.version}`).sort().join(',')}`;
  const target = sig(entry);
  const next = q.filter(e => sig(e) !== target);
  next.push(entry);
  await writeQueue(next);
}

// 동시 flush 방지(앱 포그라운드 + 로그인이 겹칠 때 큐 경합 회피)
let flushing = false;

/** 큐에 남은 동의 이력을 서버에 영속 시도. 성공분만 제거, 실패분은 잔류시켜 다음 기회에 재시도. */
export async function flushPendingConsents(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const q = await readQueue();
    if (q.length === 0) return;
    const remaining: PendingConsent[] = [];
    for (const entry of q) {
      // entry.ts(보존된 실제 동의 순간)를 함께 전달 → 서버 agreed_at 드리프트 봉합(오프라인 동의→flush)
      const ok = await recordConsentsWithRetry(entry.userId, entry.consents, entry.ts);
      if (!ok) remaining.push(entry); // res.ok=false/네트워크 실패 → 잔류
    }
    await writeQueue(remaining);
  } catch {
    /* silent — 큐는 보존됨 */
  } finally {
    flushing = false;
  }
}

/**
 * 동의 영속(보강된 진입점). 로컬 큐에 '먼저' 적재한 뒤 즉시 flush 트리거.
 *   - 적재 자체가 1차 증빙이므로 flush 가 실패해도 증빙은 로컬에 남는다.
 *   - 진입을 막지 않도록 호출부는 await 하지 않아도 된다(내부에서 적재→flush 순서 보장).
 */
export async function recordConsentWithQueue(
  userId: string,
  consents: { doc: TermsDoc['id']; version: string }[],
): Promise<void> {
  if (!userId || !consents || consents.length === 0) return;
  await enqueue({ userId, consents, ts: Date.now() });
  await flushPendingConsents();
}
