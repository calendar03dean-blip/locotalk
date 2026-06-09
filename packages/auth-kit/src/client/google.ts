// @locotalk/auth-kit — Google 로그인 어댑터 (SDK 주입식, RN 미import)
// Locotalk LoginScreen.handleGoogle 추출: user.id=authId, idToken(getTokens 폴백)=providerToken.
import type { GoogleSdk, SocialResult } from '../types';

/** 주입한 @react-native-google-signin SDK 로 Google 로그인 → 공통 SocialResult. 취소 시 null. */
export function makeGoogleSignIn(sdk: GoogleSdk) {
  return async function signInGoogle(): Promise<SocialResult | null> {
    await sdk.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response: any = await sdk.signIn();
    if (response && response.type === 'cancelled') return null;
    const email = response?.data?.user?.email;
    const googleId = response?.data?.user?.id ?? email ?? '';
    if (!googleId) return null;
    // idToken: signIn 응답에 있으면 사용, 없으면 getTokens() 폴백
    let idToken: string | undefined;
    try {
      idToken = response?.data?.idToken
        ?? (sdk.getTokens ? (await sdk.getTokens())?.idToken : undefined)
        ?? undefined;
    } catch {
      idToken = undefined;
    }
    return { provider: 'google', authId: String(googleId), providerToken: idToken || undefined, email: email || undefined };
  };
}
