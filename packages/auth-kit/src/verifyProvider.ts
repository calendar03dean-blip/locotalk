// @locotalk/auth-kit — provider 토큰 서버검증 (Apple/Google JWKS RS256 + Kakao 인트로스펙션)
// Locotalk server/authVerify.js 를 env 주입식으로 추출. 통과 시에만 신뢰 발급(호출부 책임).
// jose 는 동적 import(소비 앱이 설치). throw 없이 {ok,sub,reason} 으로 흡수.

import type { Provider, ProviderVerifyConfig, VerifyResult } from './types';

let _josePromise: Promise<any> | null = null;
function getJose(): Promise<any> {
  if (!_josePromise) _josePromise = import('jose');
  return _josePromise;
}

export function createProviderVerifier(config: ProviderVerifyConfig) {
  const appleIssuer   = config.appleIssuer || 'https://appleid.apple.com';
  const googleIssuers = config.googleIssuers || ['accounts.google.com', 'https://accounts.google.com'];
  const kakaoApiBase  = config.kakaoApiBase || 'https://kapi.kakao.com';
  const timeoutMs     = config.timeoutMs ?? 5000;

  let appleJwks: any = null;
  let googleJwks: any = null;

  async function verifyApple(idToken: string, authId: string): Promise<VerifyResult> {
    const jose = await getJose();
    if (!appleJwks) appleJwks = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
    const { payload } = await jose.jwtVerify(idToken, appleJwks, { issuer: appleIssuer, audience: config.appleBundleId });
    if (!payload.sub || String(payload.sub) !== String(authId)) return { ok: false, reason: 'sub_mismatch' };
    return { ok: true, sub: String(payload.sub) };
  }

  async function verifyGoogle(idToken: string, authId: string): Promise<VerifyResult> {
    const jose = await getJose();
    if (!googleJwks) googleJwks = jose.createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
    const { payload } = await jose.jwtVerify(idToken, googleJwks, { issuer: googleIssuers, audience: config.googleClientIds });
    if (!payload.sub || String(payload.sub) !== String(authId)) return { ok: false, reason: 'sub_mismatch' };
    return { ok: true, sub: String(payload.sub) };
  }

  async function verifyKakao(accessToken: string, authId: string): Promise<VerifyResult> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let r: Response;
    try {
      r = await fetch(`${kakaoApiBase}/v2/user/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!r.ok) return { ok: false, reason: `kakao_http_${r.status}` };
    const data: any = await r.json().catch(() => null);
    if (!data || data.id == null) return { ok: false, reason: 'kakao_no_id' };
    if (String(data.id) !== String(authId)) return { ok: false, reason: 'id_mismatch' };
    return { ok: true, sub: String(data.id) };
  }

  /** providerToken 검증. ok=true 일 때만 호출부가 신뢰 발급. throw 없음. */
  return async function verifyProviderToken(
    args: { provider: Provider; authId: string; providerToken?: string }
  ): Promise<VerifyResult> {
    const { provider, authId, providerToken } = args || ({} as any);
    if (!provider || !authId) return { ok: false, reason: 'missing_args' };
    if (!providerToken) return { ok: false, reason: 'no_provider_token' };
    try {
      switch (provider) {
        case 'apple':  return await verifyApple(providerToken, authId);
        case 'google': return await verifyGoogle(providerToken, authId);
        case 'kakao':  return await verifyKakao(providerToken, authId);
        default:       return { ok: false, reason: 'unsupported_provider' };
      }
    } catch (e: any) {
      return { ok: false, reason: (e && (e.code || e.name || e.message)) || 'verify_error' };
    }
  };
}
