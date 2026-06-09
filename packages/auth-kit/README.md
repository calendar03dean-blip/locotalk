# @locotalk/auth-kit

재사용 가능한 **소셜 로그인(Apple/Google/Kakao) + JWT 발급/검증 + provider 토큰 서버검증** 모듈.
Locotalk에서 `SOCIAL_LOGIN_ENABLED=false` 뒤로 보존한 소셜 경로 + `legal.js`/`authVerify.js`의 JWT·검증
로직을 **env·SDK 주입식**으로 추출. 차기 앱에 무수정 재사용 목적.

> 범위 밖: PortOne/통신사 본인인증(현 Locotalk 로그인 경로), 이메일 OTP.

## 구성
```
src/
  index.ts          공개 API
  types.ts          공통 타입(SocialResult, JwtConfig, ProviderVerifyConfig, SDK 인터페이스 …)
  jwt.ts            createJwt({secret, ttlSec, refreshThresholdSec}) — HS256, {sub,adult,iat,exp}, 30일 슬라이딩
  verifyProvider.ts createProviderVerifier(config) — Apple/Google JWKS(RS256) + Kakao 인트로스펙션
  client/apple.ts   makeAppleSignIn(sdk)  — expo-apple-authentication 주입
  client/google.ts  makeGoogleSignIn(sdk) — @react-native-google-signin 주입
  client/kakao.ts   makeKakaoSignIn(sdk)  — @react-native-kakao/user 주입
  jose-shim.d.ts    jose 미설치 환경 타입체크용 ambient(런타임은 동적 import)
```

## 서버 — JWT + provider 검증
```ts
import { createJwt, createProviderVerifier } from '@locotalk/auth-kit';

const jwt = createJwt({ secret: process.env.JWT_SECRET! });        // ⚠️ 하드코딩 금지(주입)
const verifyProvider = createProviderVerifier({
  appleBundleId: process.env.APPLE_BUNDLE_ID!,                     // Apple aud
  googleClientIds: (process.env.GOOGLE_OAUTH_CLIENT_IDS || '').split(','), // Google aud(iOS/web)
});

// 로그인: 클라가 보낸 {provider, authId, providerToken} 서버검증 → 통과 시에만 발급
const v = await verifyProvider({ provider, authId, providerToken });
if (v.ok) {
  const token = jwt.issue(v.sub!, { adult: false });
}

// 검증 / 슬라이딩 재발급
const claims = jwt.verify(token);              // {sub, adult, iat, exp} | null
const fresh  = jwt.refreshIfNeeded(token);     // 만료 임박이면 새 토큰, 아니면 null
```

## 클라 — 소셜 로그인(SDK 주입)
```ts
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as KakaoUser from '@react-native-kakao/user';
import { makeAppleSignIn, makeGoogleSignIn, makeKakaoSignIn } from '@locotalk/auth-kit';

const signInApple  = makeAppleSignIn(AppleAuthentication as any);
const signInGoogle = makeGoogleSignIn(GoogleSignin as any);
const signInKakao  = makeKakaoSignIn(KakaoUser as any);

const result = await signInApple();   // { provider, authId, providerToken, email } | null
// → 서버 /auth/login 에 result 전송 → 위 verifyProvider 로 검증 → jwt.issue
```

## 필요한 env
| env | 용도 |
|-----|------|
| `JWT_SECRET` | JWT HMAC 서명(서버, 필수). 강한 랜덤(`openssl rand -hex 32`) |
| `APPLE_BUNDLE_ID` | Apple identityToken `aud` 검증값(앱 번들ID) |
| `GOOGLE_OAUTH_CLIENT_IDS` | Google idToken `aud` 후보(쉼표구분 — iOS/web 클라ID) |

## provider별 키 요구사항
- **Apple**: 앱 번들ID(= aud). identityToken(JWT)을 클라가 전달 → 서버 Apple JWKS 검증.
- **Google**: OAuth 클라이언트ID(iOS, 필요시 web). idToken을 클라가 전달(또는 getTokens) → Google JWKS 검증.
  - ⚠️ 클라가 web 클라ID로 idToken을 받으면 `GOOGLE_OAUTH_CLIENT_IDS`에 web ID도 추가(aud 일치).
- **Kakao**: REST/네이티브 키는 클라 SDK 설정. 서버는 access token으로 `kapi.kakao.com/v2/user/me` 조회(키 불필요).

## 의존성
- 런타임 선택적(peer): `jose`(Apple/Google RS256 검증), 각 provider RN SDK. 미설치 시 해당 경로만 비활성(타입체크는 통과).
- 타입체크: `npm run typecheck` (tsconfig.json, jose-shim 으로 jose 미설치도 통과).

## 무결성 원칙
- 검증 통과 경로에만 발급(검증≠바인딩 금지). userId는 서버가 결정(클라 주장 신뢰 금지).
- secret/aud 등 모든 환경값은 **주입** — 모듈 내 하드코딩 없음.
