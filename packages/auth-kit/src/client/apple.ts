// @locotalk/auth-kit — Apple 로그인 어댑터 (SDK 주입식, RN 미import)
// Locotalk LoginScreen.handleApple 추출: credential.user=authId, identityToken=providerToken.
import type { AppleSdk, SocialResult } from '../types';

// base64url(JWT payload) 디코드 — identityToken 에서 email 보강(첫 인증만 credential.email 제공).
function emailFromAppleToken(idToken?: string | null): string | undefined {
  if (!idToken) return undefined;
  try {
    const part = idToken.split('.')[1];
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
    const payload = JSON.parse(json);
    return payload && typeof payload.email === 'string' ? payload.email : undefined;
  } catch {
    return undefined;
  }
}

/** 주입한 expo-apple-authentication SDK 로 Apple 로그인 → 공통 SocialResult. 취소/실패 시 null. */
export function makeAppleSignIn(sdk: AppleSdk) {
  return async function signInApple(): Promise<SocialResult | null> {
    const scopes = sdk.AppleAuthenticationScope
      ? [sdk.AppleAuthenticationScope.EMAIL, sdk.AppleAuthenticationScope.FULL_NAME]
      : [];
    const credential = await sdk.signInAsync({ requestedScopes: scopes });
    if (!credential || !credential.user) return null;
    return {
      provider: 'apple',
      authId: credential.user,
      providerToken: credential.identityToken || undefined,
      email: credential.email || emailFromAppleToken(credential.identityToken) || undefined,
    };
  };
}
