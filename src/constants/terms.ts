/**
 * terms.ts — 약관 메타(문서 ID · 버전 · 보기 URL)
 *
 * 서비스 이용 전 동의 = 출시 법적 필수. 진입(LoginScreen)에서 본인인증 PII 수집 '전'에 동의받는다.
 * 동의 이력(누가·어느 버전·언제)은 본인인증으로 userId 확정 후 서버에 영속(증빙).
 *
 * ⚠️ 약관 본문은 현행 초안(변호사 검토 전). version 은 초안 태그이며, 최종본 확정 시
 *    문구 교체 + version 갱신(예: '1.0') → 기존 동의자에게 재동의 유도.
 *    버전 문자열은 서버 user_consents.version 에 그대로 저장되므로 클라/서버 합의값.
 */

const BASE = 'https://locotalk-production.up.railway.app';

export interface TermsDoc {
  id: 'privacy' | 'service' | 'location';
  version: string;
  url: string;
}

/** 동의 필수 약관 3종 (개인정보처리방침 · 서비스이용약관 · 위치기반서비스이용약관) */
export const TERMS: Record<TermsDoc['id'], TermsDoc> = {
  privacy:  { id: 'privacy',  version: '2026-06-11-draft', url: `${BASE}/privacy` },
  service:  { id: 'service',  version: '2026-06-11-draft', url: `${BASE}/terms` },
  location: { id: 'location', version: '2026-06-11-draft', url: `${BASE}/location-terms` },
};

/** 동의 필수 순서 목록 */
export const REQUIRED_TERMS: TermsDoc[] = [TERMS.privacy, TERMS.service, TERMS.location];

/** 서버 전송용 동의 레코드(문서+버전) 생성 */
export function consentPayload(): { doc: TermsDoc['id']; version: string }[] {
  return REQUIRED_TERMS.map(d => ({ doc: d.id, version: d.version }));
}
