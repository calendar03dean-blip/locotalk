// server/authVerify.js
// ─────────────────────────────────────────────────────────────────────────────
// Locotalk — 소셜 로그인 provider 토큰 "서버검증" (Stage A)
//
// 목적: 로그인 시 클라가 보낸 provider 증명(Apple/Google idToken·Kakao access token)을
//       서버가 직접 검증해, payload.sub === 클라 주장 authId 임을 확인한 경우에만
//       호출부에서 신뢰 JWT(legal.issueSessionToken)를 발급하도록 한다.
//
// 설계 원칙(롤아웃 안전):
//   · 본 모듈은 "검증 결과"만 반환({ ok, sub, reason }). 토큰 발급/차단은 호출부 책임.
//   · 검증 실패는 예외를 던지지 않고 { ok:false, reason } 으로 흡수 → 로그인 흐름 무중단.
//   · providerToken 미동봉(build 38/현행 클라)·jose 미설치 → ok:false(폴백, 미검증).
//
// 의존성: jose (RS256/JWKS 검증 전용). jose v5는 ESM → CommonJS에서 동적 import() 사용.
//   Apple  JWKS: https://appleid.apple.com/auth/keys   (iss=https://appleid.apple.com, aud=번들ID)
//   Google JWKS: https://www.googleapis.com/oauth2/v3/certs (iss=accounts.google.com, aud=OAuth 클라ID)
//   Kakao : access token → GET https://kapi.kakao.com/v2/user/me (Bearer) → 응답 id===authId
//
// ⚠️ aud/클라이언트ID/번들ID는 실제 앱 설정값. env로 덮어쓸 수 있게 하되 기본값은 확인된 실값.
//   APPLE_BUNDLE_ID         (기본 com.palosanto.spotchat)
//   GOOGLE_OAUTH_CLIENT_IDS (쉼표구분; 기본 iOS 클라ID)
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

// ── 실제 앱 설정값(확인됨) — env 우선, 없으면 기본값 ─────────────────────────
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || 'com.palosanto.spotchat';
const GOOGLE_CLIENT_IDS = (process.env.GOOGLE_OAUTH_CLIENT_IDS
  || '1016344798203-pnugcb1l44ee4aokjsboh4acrh3d61fd.apps.googleusercontent.com')
  .split(',').map(s => s.trim()).filter(Boolean);

const APPLE_ISS  = 'https://appleid.apple.com';
const GOOGLE_ISS = ['accounts.google.com', 'https://accounts.google.com'];

// ── jose 지연 로드(ESM 동적 import) + JWKS 캐시 ──────────────────────────────
let _josePromise = null;
function getJose() {
  // import() 는 CommonJS 에서도 동작(Node ≥ 12.17). 미설치/로드 실패는 호출부에서 흡수.
  if (!_josePromise) _josePromise = import('jose');
  return _josePromise;
}

let _appleJwks = null, _googleJwks = null;
async function appleJwks() {
  const jose = await getJose();
  if (!_appleJwks) _appleJwks = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
  return _appleJwks;
}
async function googleJwks() {
  const jose = await getJose();
  if (!_googleJwks) _googleJwks = jose.createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
  return _googleJwks;
}

// ── Apple identityToken 검증 (RS256, JWKS) ───────────────────────────────────
async function verifyApple(idToken, authId) {
  const jose = await getJose();
  const jwks = await appleJwks();
  const { payload } = await jose.jwtVerify(idToken, jwks, {
    issuer: APPLE_ISS,
    audience: APPLE_BUNDLE_ID,          // = 앱 번들ID. 다르면 jose가 throw.
  });
  if (!payload.sub || String(payload.sub) !== String(authId)) {
    return { ok: false, reason: 'sub_mismatch' };
  }
  return { ok: true, sub: String(payload.sub) };
}

// ── Google idToken 검증 (RS256, JWKS) ────────────────────────────────────────
async function verifyGoogle(idToken, authId) {
  const jose = await getJose();
  const jwks = await googleJwks();
  const { payload } = await jose.jwtVerify(idToken, jwks, {
    issuer: GOOGLE_ISS,
    audience: GOOGLE_CLIENT_IDS,        // = 앱 Google OAuth 클라ID(들).
  });
  if (!payload.sub || String(payload.sub) !== String(authId)) {
    return { ok: false, reason: 'sub_mismatch' };
  }
  return { ok: true, sub: String(payload.sub) };
}

// ── Kakao access token 검증 (토큰 인트로스펙션: /v2/user/me) ──────────────────
async function verifyKakao(accessToken, authId) {
  // 카카오 API 지연이 로그인을 매달지 않게 4s 타임아웃 → 초과 시 abort(throw) → 호출부에서 ok:false 폴백.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  let r;
  try {
    r = await fetch('https://kapi.kakao.com/v2/user/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) return { ok: false, reason: `kakao_http_${r.status}` };
  const data = await r.json().catch(() => null);
  if (!data || data.id == null) return { ok: false, reason: 'kakao_no_id' };
  if (String(data.id) !== String(authId)) return { ok: false, reason: 'id_mismatch' };
  return { ok: true, sub: String(data.id) };
}

/**
 * provider 증명 검증.
 * @param {{ provider:string, authId:string, providerToken?:string }} p
 *   - apple  : providerToken = identityToken(JWT)
 *   - google : providerToken = idToken(JWT)
 *   - kakao  : providerToken = access token
 *   - naver/email/그 외 : 본 모듈 비대상(naver-callback·verify-otp가 별도 서버검증) → ok:false
 * @returns {Promise<{ ok:boolean, sub?:string, reason?:string }>}
 *   ok=true 일 때만 호출부가 신뢰 JWT 발급. 절대 throw 하지 않음(흐름 무중단).
 */
async function verifyProviderToken({ provider, authId, providerToken } = {}) {
  if (!provider || !authId) return { ok: false, reason: 'missing_args' };
  if (!providerToken)       return { ok: false, reason: 'no_provider_token' }; // 현행/구버전 클라 → 폴백
  try {
    switch (provider) {
      case 'apple':  return await verifyApple(providerToken, authId);
      case 'google': return await verifyGoogle(providerToken, authId);
      case 'kakao':  return await verifyKakao(providerToken, authId);
      default:       return { ok: false, reason: 'unsupported_provider' };
    }
  } catch (e) {
    // jose 미설치/서명불일치/aud·iss 불일치/만료/네트워크 → 모두 흡수
    return { ok: false, reason: (e && e.code) || (e && e.message) || 'verify_error' };
  }
}

module.exports = { verifyProviderToken, APPLE_BUNDLE_ID, GOOGLE_CLIENT_IDS };
