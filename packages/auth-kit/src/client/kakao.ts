// @locotalk/auth-kit — Kakao 로그인 어댑터 (SDK 주입식, RN 미import)
// Locotalk LoginScreen.handleKakao 추출: me().id=authId, login() accessToken=providerToken.
import type { KakaoSdk, SocialResult } from '../types';

/** 주입한 @react-native-kakao/user SDK 로 Kakao 로그인 → 공통 SocialResult. */
export function makeKakaoSignIn(sdk: KakaoSdk) {
  return async function signInKakao(): Promise<SocialResult | null> {
    let talkAvailable = false;
    try { talkAvailable = sdk.isKakaoTalkLoginAvailable ? await sdk.isKakaoTalkLoginAvailable() : false; } catch { /* noop */ }
    const tokenInfo: any = await sdk.login(talkAvailable ? {} : { useKakaoAccountLogin: true });

    let kakaoId = `kakao-${Date.now()}`;
    let email: string | undefined;
    try {
      const me: any = await sdk.me();
      kakaoId = String(me?.id ?? kakaoId);
      email = me?.kakaoAccount?.email ?? undefined;
    } catch { /* me() 실패해도 진행 */ }

    return {
      provider: 'kakao',
      authId: kakaoId,
      providerToken: tokenInfo?.accessToken || undefined,
      email,
    };
  };
}
