// @locotalk/auth-kit — 공용 타입/인터페이스
// 모든 외부 의존(env·SDK)은 주입식 — 하드코딩 금지.

export type Provider = 'apple' | 'google' | 'kakao';

/** 클라 소셜 로그인 결과(공통 형태). providerToken 은 서버검증용 증명. */
export interface SocialResult {
  provider: Provider;
  authId: string;          // provider 고유 sub/id (서버가 sub===authId 검증)
  providerToken?: string;  // apple: identityToken / google: idToken / kakao: access token
  email?: string;
}

// ── JWT ──────────────────────────────────────────────────────────────────
export interface JwtConfig {
  /** HMAC-SHA256 서명 비밀(필수, 주입). 절대 하드코딩 금지. */
  secret: string;
  /** 토큰 수명(초). 기본 30일. */
  ttlSec?: number;
  /** 슬라이딩 재발급 임계(초): 남은 수명이 이 값 미만이면 refresh 가 새 토큰 발급. 기본 7일. */
  refreshThresholdSec?: number;
}

export interface JwtClaims {
  sub: string;       // 서버 결정 userId
  adult: boolean;    // 성인여부(서버 판정값)
  iat: number;
  exp: number;
}

export interface AuthKitJwt {
  issue(sub: string, opts?: { adult?: boolean }): string;
  verify(token: string | null | undefined): JwtClaims | null;
  /** 유효하고 만료 임박이면 새 토큰, 아니면 null(원본 유지). 만료/무효면 null. */
  refreshIfNeeded(token: string | null | undefined): string | null;
}

// ── provider 토큰 서버검증 ─────────────────────────────────────────────────
export interface ProviderVerifyConfig {
  appleBundleId: string;          // Apple aud = 앱 번들ID
  googleClientIds: string[];      // Google aud 후보(iOS/web 클라ID)
  appleIssuer?: string;           // 기본 https://appleid.apple.com
  googleIssuers?: string[];       // 기본 accounts.google.com (+https)
  kakaoApiBase?: string;          // 기본 https://kapi.kakao.com
  timeoutMs?: number;             // 기본 5000
}

export interface VerifyResult {
  ok: boolean;
  sub?: string;
  reason?: string;
}

// ── 주입식 SDK 최소 인터페이스(RN 모듈을 직접 import 하지 않기 위함) ──────────
export interface AppleSdk {
  signInAsync(opts: any): Promise<{ user?: string | null; identityToken?: string | null; email?: string | null }>;
  AppleAuthenticationScope?: any;
}
export interface GoogleSdk {
  hasPlayServices(opts?: any): Promise<boolean>;
  signIn(): Promise<any>;
  getTokens?(): Promise<{ idToken?: string | null; accessToken?: string | null }>;
}
export interface KakaoSdk {
  isKakaoTalkLoginAvailable?(): Promise<boolean>;
  login(opts?: any): Promise<{ accessToken?: string | null } | any>;
  me(): Promise<{ id?: string | number; kakaoAccount?: { email?: string | null } } | any>;
}
