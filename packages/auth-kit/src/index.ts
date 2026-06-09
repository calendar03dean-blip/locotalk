// @locotalk/auth-kit — 공개 API
// 소셜 로그인(Apple/Google/Kakao) + JWT 발급/검증 + provider 토큰 서버검증.
// 모든 외부 의존(env·SDK)은 주입식. PortOne/본인인증·이메일 OTP 는 범위 밖.

export * from './types';
export { createJwt } from './jwt';
export { createProviderVerifier } from './verifyProvider';
export { makeAppleSignIn } from './client/apple';
export { makeGoogleSignIn } from './client/google';
export { makeKakaoSignIn } from './client/kakao';
