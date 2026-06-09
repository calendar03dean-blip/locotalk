// @locotalk/auth-kit — JWT 발급/검증 (HMAC-SHA256, 외부 의존 없음)
// Locotalk server/legal.js 의 issueSessionToken/verifySessionToken 을 env 주입식으로 추출.
// claim {sub, adult, iat, exp} · 기본 30일 · 슬라이딩 재발급.

import * as crypto from 'crypto';
import type { JwtConfig, JwtClaims, AuthKitJwt } from './types';

const DEFAULT_TTL = 60 * 60 * 24 * 30;        // 30일
const DEFAULT_REFRESH = 60 * 60 * 24 * 7;     // 7일

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlJson(obj: unknown): string {
  return b64url(JSON.stringify(obj));
}

/** JWT 모듈 생성. secret 은 호출자가 주입(예: process.env.JWT_SECRET) — 하드코딩 금지. */
export function createJwt(config: JwtConfig): AuthKitJwt {
  if (!config || !config.secret) throw new Error('auth-kit/jwt: secret 필수(주입)');
  const secret = config.secret;
  const ttlSec = config.ttlSec ?? DEFAULT_TTL;
  const refreshThresholdSec = config.refreshThresholdSec ?? DEFAULT_REFRESH;

  function sign(headerB64: string, payloadB64: string): string {
    return b64url(crypto.createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest());
  }

  function issue(sub: string, opts?: { adult?: boolean }): string {
    const now = Math.floor(Date.now() / 1000);
    const header = b64urlJson({ alg: 'HS256', typ: 'JWT' });
    const payload = b64urlJson({ sub, adult: !!(opts && opts.adult), iat: now, exp: now + ttlSec });
    return `${header}.${payload}.${sign(header, payload)}`;
  }

  function verify(token: string | null | undefined): JwtClaims | null {
    try {
      if (!token || typeof token !== 'string') return null;
      const [h, p, s] = token.split('.');
      if (!h || !p || !s) return null;
      const expected = sign(h, p);
      const a = Buffer.from(s);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
      const payload = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()) as JwtClaims;
      if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
      return payload;
    } catch {
      return null;
    }
  }

  function refreshIfNeeded(token: string | null | undefined): string | null {
    const claims = verify(token);
    if (!claims) return null;
    const remaining = claims.exp - Math.floor(Date.now() / 1000);
    if (remaining < refreshThresholdSec) return issue(claims.sub, { adult: claims.adult });
    return null; // 아직 충분 → 재발급 불필요(원본 유지)
  }

  return { issue, verify, refreshIfNeeded };
}
