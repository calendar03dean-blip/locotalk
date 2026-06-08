/**
 * LoginScreen — Google / Kakao / Naver / Email 로그인
 *
 * 소셜 로그인 실제 연동:
 *   Google : console.cloud.google.com → iOS OAuth Client ID → GOOGLE_CLIENT_ID
 *   Kakao  : developers.kakao.com     → REST API Key       → KAKAO_REST_KEY
 *   Naver  : developers.naver.com     → Client ID          → NAVER_CLIENT_ID
 *
 * Client ID가 설정되지 않은 경우 → 앱 내에서 바로 진행(개발 모드)
 * 이메일 OTP → 클라이언트에서 생성, 실제 발송은 서버 /auth/send-otp 필요
 *               서버 없을 시 → 화면에 코드 직접 표시
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Animated, Easing, Alert, Image,
} from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { login as kakaoLogin } from '@react-native-kakao/user';
import { useStore } from '../store';
import { useT } from '../i18n';
import { Colors, Typography, Radius } from '../constants/theme';
import { LT } from '../constants/lt';
import { serverLogin } from '../services/userApi';

WebBrowser.maybeCompleteAuthSession();

// Google Sign-In 초기화
GoogleSignin.configure({
  iosClientId: '1016344798203-pnugcb1l44ee4aokjsboh4acrh3d61fd.apps.googleusercontent.com',
});

// ── 소셜 로그인 설정 ────────────────────────────────────────────────
const GOOGLE_CLIENT_ID  = '1016344798203-pnugcb1l44ee4aokjsboh4acrh3d61fd.apps.googleusercontent.com';
const KAKAO_REST_KEY     = '82edb8d683fa5171e2e05991ef52225d'; // REST API 키 (콘솔 확인)
const KAKAO_REDIRECT_URI = 'kakao3a28c2894d331f12450cec5f37c3c578://oauth'; // 카카오 표준 스킴
const NAVER_CLIENT_ID    = '4amvZv8LfW4vE277jo8n';
const REDIRECT_URI       = 'com.palosanto.spotchat://oauth';  // Google용
const NAVER_REDIRECT_URI = 'https://calendar03dean-blip.github.io/locotalk/oauth.html'; // Naver 콘솔 등록 URL

// OTP 만료 시간(초)
const OTP_EXPIRE_SEC = 180;

// ── SVG 아이콘 ───────────────────────────────────────────────────────
function IcoGoogle({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </Svg>
  );
}

function IcoKakao({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.618 5.076 4.08 6.48L5.1 21l4.98-2.22A11.4 11.4 0 0012 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z"
        fill="#3C1E1E"
      />
    </Svg>
  );
}

function IcoNaver({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" fill="#FFFFFF"/>
    </Svg>
  );
}

function IcoEmail({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M22 6l-10 7L2 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

// ── OTP 생성 ─────────────────────────────────────────────────────────
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const API_BASE = 'https://locotalk-production.up.railway.app';

// 서버로 OTP 발송 요청. 성공(이메일 발송됨) 여부 반환. 12초 타임아웃으로 행 방지.
async function sendOtpToServer(email: string, code: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;  // 타임아웃/네트워크/서버오류 → 폴백
  }
}

// ── 이메일 유효성 ────────────────────────────────────────────────────
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// ── base64 디코더 (atob 폴리필) — Apple identityToken(JWT) payload 해석용 ──
function decodeBase64(b64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const str = b64.replace(/=+$/, '');
  let out = '';
  let bc = 0, bs = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = chars.indexOf(str.charAt(i));
    if (idx === -1) continue;
    bs = bc % 4 ? bs * 64 + idx : idx;
    if (bc++ % 4) out += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
  }
  return out;
}

// Apple identityToken(JWT)의 payload에서 email 추출.
// Apple은 credential.email을 "첫 인증" 때만 채워주므로, 토큰에 있으면 폴백으로 사용.
function emailFromAppleToken(idToken?: string | null): string | undefined {
  if (!idToken) return undefined;
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return undefined;
    let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const obj = JSON.parse(decodeBase64(b64));
    return typeof obj?.email === 'string' && obj.email ? obj.email : undefined;
  } catch { return undefined; }
}

// ── 소셜 로그인 실패 로그 헬퍼 (콘솔 전용 — 사용자에겐 친절 문구만 노출) ──
function diag(e: any): string {
  if (e == null) return 'error 객체 없음(undefined/null)';
  const parts: string[] = [];
  if (e.code !== undefined && e.code !== null) parts.push(`code=${e.code}`);
  if (e.name) parts.push(`name=${e.name}`);
  if (e.domain) parts.push(`domain=${e.domain}`);
  const msg = e.message ?? (typeof e === 'string' ? e : '');
  if (msg) parts.push(`msg=${msg}`);
  if (parts.length === 0) { try { return JSON.stringify(e); } catch { return String(e); } }
  return parts.join('\n');
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────
type Step = 'main' | 'email_input' | 'email_otp';

export default function LoginScreen() {
  const t       = useT();
  const [fontsLoaded] = useFonts({ 'JUA-Regular': require('../../assets/fonts/JUA-Regular.ttf') });
  const setAuth      = useStore(s => s.setAuth);
  const setLoggedIn  = useStore(s => s.setLoggedIn);
  const setPremium   = useStore(s => s.setPremium);
  const setLocationConsent = useStore(s => s.setLocationConsent);

  const [authLoading, setAuthLoading] = useState(false); // 로그인 진행 중 중복 방지
  const [step,     setStep]     = useState<Step>('main');
  const [email,    setEmail]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [otpCode,  setOtpCode]  = useState('');   // 실제 생성된 코드
  const [loading,  setLoading]  = useState(false);
  const [timer,    setTimer]    = useState(OTP_EXPIRE_SEC);
  const [timerOn,  setTimerOn]  = useState(false);
  const [emailErr, setEmailErr] = useState('');
  const [otpErr,   setOtpErr]   = useState('');

  const otpRef  = useRef<TextInput>(null);
  const diagRef = useRef('');   // 서버 단계 실패 사유 저장 (console.warn 용)
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  // 입장 애니메이션
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const animateIn = useCallback(() => {
    fadeAnim.setValue(0); slideAnim.setValue(18);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  // OTP 카운트다운
  useEffect(() => {
    if (!timerOn) return;
    if (timer <= 0) { setTimerOn(false); return; }
    const id = setInterval(() => setTimer(v => v - 1), 1000);
    return () => clearInterval(id);
  }, [timerOn, timer]);

  // ── 서버 로그인 결과 적용 (성공 시에만 페이지 이동) ──────────────
  const applyLoginResult = (provider: string, result: any, email?: string): boolean => {
    if (!result?.userId) return false;
    // JWT Stage B: provider 검증 통과 시 서버가 준 신뢰 JWT 저장(실패/구버전=null=폴백)
    setAuth(provider as any, email ?? result.email, result.userId, result.token ?? null);

    // 기존 완성된 프로필이 있으면 바로 홈으로
    if (!result.isNew && result.isComplete && result.user) {
      const u = result.user;
      // interests 방어: 서버가 배열/JSON문자열/null 어느 것으로 줘도 항상 배열로.
      // (문자열이면 .filter() 호출 시 "undefined is not a function" → HomeScreen 크래시)
      let interests: string[] = [];
      if (Array.isArray(u.interests)) interests = u.interests;
      else if (typeof u.interests === 'string') {
        try { const p = JSON.parse(u.interests); if (Array.isArray(p)) interests = p; } catch {}
      }
      setLoggedIn({
        id: result.userId,
        nickname: u.nickname || '',
        interests,
        regionGu: u.region_gu || u.regionGu || '',
        regionLabel: u.region_label || u.regionLabel || '',
        email: u.email,
        gender: u.gender,
        birthYear: u.birth_year || u.birthYear,
        // 법령준수: 기존 인증/동의 상태 복원 — 재로그인 시 재인증·재동의 강요 방지
        isVerified: u.is_verified === true || u.adult_verified === true,
      });
      // 위치기반서비스 약관 동의 상태 복원
      setLocationConsent(u.location_consent === true);
    }
    return true;
  };

  // ── 소셜 로그인 후 DB 등록 공통 처리 ───────────────────────────
  const handleSocialLogin = async (provider: string, authId: string, email?: string, providerToken?: string): Promise<boolean> => {
    try {
      const result = await serverLogin(provider, authId, email, providerToken);
      diagRef.current = `[서버 단계] userId=${result?.userId ?? '없음'} isNew=${result?.isNew} isComplete=${result?.isComplete}`;
      if (!result?.userId) return false;
      // ── 크래시 수정 (BUG: 소셜 로그인 후 앱 충돌) ───────────────────────
      // 소셜 인증 네이티브 UI(ASWebAuthenticationSession/ASAuthorizationController)의
      // dismiss 애니메이션이 끝나기 전에 화면 전환(RootNavigator)이 시작되면,
      // react-native-screens 전환 스냅샷(resizableSnapshotView)이 사라지는 인증 뷰와
      // 겹쳐 네이티브 NSException(turbomodule void) → terminate 가 발생한다(타이밍 레이스).
      // 인증 UI가 완전히 닫힐 시간을 준 뒤 전환하여 레이스를 제거한다.
      await new Promise<void>(r => setTimeout(r, 650));
      return applyLoginResult(provider, result, email);
    } catch (e: any) {
      diagRef.current = '[서버 단계] serverLogin 예외:\n' + diag(e);
      return false;
    }
  };

  // ── Apple 로그인 ────────────────────────────────────────────────
  const handleApple = async () => {
    if (authLoading) return;
    setAuthLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });
      if (!credential?.user) {
        Alert.alert(t('login_failed'));
        return;
      }
      // Apple은 credential.email을 첫 인증 때만 줌 → 없으면 identityToken(JWT)에서 보강
      const appleEmail = credential.email ?? emailFromAppleToken(credential.identityToken) ?? undefined;
      // providerToken = Apple identityToken(JWT) → 서버가 Apple JWKS 로 검증
      const ok = await handleSocialLogin('apple', credential.user, appleEmail, credential.identityToken ?? undefined);
      if (!ok) { console.warn('[apple] 로그인 실패:', diagRef.current); Alert.alert(t('login_failed')); }
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return; // 사용자 취소 — 조용히 종료
      console.warn('[apple] 예외:', diag(e));
      Alert.alert(t('login_failed'));
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Google 로그인 ────────────────────────────────────────────────
  const handleGoogle = async () => {
    if (authLoading) return;
    setAuthLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      // 최신 google-signin 은 취소 시 throw 하지 않고 { type: 'cancelled' } 를 반환 → 조용히 종료
      if ((response as any)?.type === 'cancelled') return;
      const email    = response.data?.user?.email;
      const googleId = response.data?.user?.id ?? email ?? '';
      if (!googleId) { console.warn('[google] googleId/email 없음:', diag(response)); Alert.alert(t('login_failed')); return; }
      // providerToken = Google idToken(JWT) → 서버가 Google JWKS 로 검증(aud=iOS 클라ID).
      // idToken: signIn 응답에 있으면 사용, 없으면 getTokens() 로 취득(타입 스텁 미선언 → as any). 실패=폴백.
      let googleIdToken: string | undefined;
      try {
        googleIdToken = (response.data as any)?.idToken
          ?? (await (GoogleSignin as any).getTokens())?.idToken
          ?? undefined;
      } catch {}
      const ok = await handleSocialLogin('google', googleId, email ?? undefined, googleIdToken);
      if (!ok) { console.warn('[google] 로그인 실패:', diagRef.current); Alert.alert(t('login_failed')); }
    } catch (e: any) {
      // 사용자 취소는 조용히 종료. (iOS는 취소 코드가 문자열/숫자 -5 또는 웹세션
      //  취소로 제각각 → Kakao 처럼 message 에 'cancel' 포함 여부도 함께 검사)
      const code = String(e?.code ?? '');
      const msg  = String(e?.message ?? '').toLowerCase();
      if (code === 'SIGN_IN_CANCELLED' || code === '-5' || code === 'ERR_REQUEST_CANCELED'
          || msg.includes('cancel')) return;
      console.warn('[google] 예외:', diag(e));
      Alert.alert(t('login_failed'));
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Kakao 로그인 (카카오톡 앱 우선, 미설치 시 웹 계정) ──────────
  const handleKakao = async () => {
    if (authLoading) return;
    setAuthLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const KakaoUser = require('@react-native-kakao/user');
      // 카카오톡 앱이 설치돼 있으면 앱 로그인(로그인된 계정 사용), 없으면 웹 계정 로그인
      let talkAvailable = false;
      try { talkAvailable = await KakaoUser.isKakaoTalkLoginAvailable(); } catch {}
      // login() 은 KakaoLoginToken({ accessToken, ... }) 반환 → providerToken 으로 사용
      const kakaoToken = await (KakaoUser.login as any)(talkAvailable ? {} : { useKakaoAccountLogin: true });

      let kakaoId    = `kakao-${Date.now()}`;
      let kakaoEmail: string | undefined = undefined;
      try {
        const kakaoUser = await KakaoUser.me();
        kakaoId    = String(kakaoUser?.id ?? kakaoId);
        kakaoEmail = kakaoUser?.kakaoAccount?.email ?? undefined;
      } catch { /* me() 실패해도 진행 */ }

      // providerToken = Kakao access token → 서버가 kapi /v2/user/me 로 검증(응답 id===authId)
      const ok = await handleSocialLogin('kakao', kakaoId, kakaoEmail, kakaoToken?.accessToken ?? undefined);
      if (!ok) { console.warn('[kakao] 로그인 실패:', diagRef.current); Alert.alert(t('login_failed')); }
    } catch (e: any) {
      if (e?.code === 'CANCELED' || e?.message?.includes('cancel')) return; // 사용자 취소
      console.warn('[kakao] 예외:', diag(e));
      Alert.alert(t('login_failed'));
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Naver 로그인 (서버 토큰 교환 방식) ──────────────────────────
  const handleNaver = async () => {
    if (authLoading) return;
    setAuthLoading(true);
    try {
      const state   = Math.random().toString(36).substring(7);
      const authUrl =
        `https://nid.naver.com/oauth2.0/authorize` +
        `?client_id=${NAVER_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(NAVER_REDIRECT_URI)}` +
        `&response_type=code&state=${state}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'locotalk://oauth');

      if (result.type !== 'success' || !result.url) { return; } // 취소/실패 — 조용히 종료

      // 콜백 URL에서 code 추출
      const m     = result.url.match(/[?&]code=([^&]+)/);
      const rawCode = m ? decodeURIComponent(m[1]) : '';
      if (!rawCode) { console.warn('[naver] 인증 코드 없음:', result.url); Alert.alert(t('login_failed')); return; }

      // 서버에서 토큰 교환 + 프로필 조회
      const res = await fetch('https://locotalk-production.up.railway.app/auth/naver-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: rawCode, state }),
      });
      const data = await res.json();
      if (!res.ok || !data.userId) {
        console.warn('[naver] 서버 콜백 실패:', res.status, data.error || diag(data));
        Alert.alert(t('login_failed'));
        return;
      }
      // 인증 UI dismiss 후 전환 (위 handleSocialLogin과 동일한 크래시 레이스 방지)
      await new Promise<void>(r => setTimeout(r, 650));
      applyLoginResult('naver', data, data.email);
    } catch (e: any) {
      console.warn('[naver] 예외:', diag(e));
      Alert.alert(t('login_failed'));
    } finally {
      setAuthLoading(false);
    }
  };

  // ── 이메일 OTP ────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!isValidEmail(email)) { setEmailErr(t('email_invalid')); return; }
    setEmailErr('');
    setLoading(true);

    const code = generateOtp();
    setOtpCode(code);

    const serverSent = await sendOtpToServer(email.trim(), code);

    setLoading(false);

    if (!serverSent) {
      // 서버 발송 실패 시 (도메인 미인증 등) 직접 코드 표시
      Alert.alert(
        '인증코드',
        `${email}\n\n코드: ${code}\n\n(이메일 발송 실패 — 위 코드를 직접 입력하세요)`,
        [{ text: '확인', onPress: () => {
          setStep('email_otp'); setTimer(OTP_EXPIRE_SEC); setTimerOn(true);
          animateIn(); setTimeout(() => otpRef.current?.focus(), 400);
        }}],
      );
    } else {
      setStep('email_otp'); setTimer(OTP_EXPIRE_SEC); setTimerOn(true);
      animateIn(); setTimeout(() => otpRef.current?.focus(), 400);
    }
  };

  const handleResend = async () => {
    setOtp(''); setOtpErr('');
    const code = generateOtp();
    setOtpCode(code);
    setTimer(OTP_EXPIRE_SEC);
    setTimerOn(true);
    const ok = await sendOtpToServer(email.trim(), code);
    if (!ok) {
      Alert.alert('인증코드', `코드: ${code}\n\n(이메일 발송 실패 — 위 코드를 입력하세요)`);
    }
  };

  const handleVerify = async () => {
    if (otp.length < 6) { setOtpErr(t('email_code_invalid')); return; }
    if (timer <= 0)     { setOtpErr(t('email_code_expired')); return; }
    if (otp !== otpCode) { setOtpErr(t('email_code_invalid')); return; }
    setOtpErr('');
    setLoading(true);
    try {
      const ok = await handleSocialLogin('email', email.trim(), email.trim());
      if (!ok) setOtpErr('로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } catch {
      setOtpErr('로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // ── 개발자 테스트 계정 ────────────────────────────────────────────
  const enterTestAccount = (type: 'premium' | 'free') => {
    const isPrem = type === 'premium';
    setAuth('email', `test-${type}@locotalk.dev`);
    setLoggedIn({
      id         : `test-${type}`,
      nickname   : isPrem ? '프리미엄유저' : '일반유저',
      interests  : ['coffee', 'run', 'book'],
      regionGu   : '마포구',
      regionLabel: '마포구 · 서교동',
    });
    setPremium(isPrem);
  };

  const goBack = () => {
    setStep(step === 'email_otp' ? 'email_input' : 'main');
    setOtp(''); setOtpErr(''); setEmailErr('');
    animateIn();
  };

  // ── 렌더 ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View style={[s.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* 로고 */}
          <View style={s.logoWrap}>
            <Image source={require('../../assets/logo_white.png')} style={s.logo} resizeMode="contain" />
            <Text style={[s.appName, fontsLoaded && { fontFamily: 'JUA-Regular' }]}>LOCOTALK</Text>
            {step === 'main' && <Text style={s.sub}>{t('login_sub')}</Text>}
          </View>

          {/* ── MAIN ────────────────────────────────── */}
          {step === 'main' && (
            <View style={s.btnGroup}>
              <Text style={s.sheetLabel}>간편 로그인</Text>
              {/* Apple 로그인 — iOS 전용 */}
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={Radius.pill}
                style={{ height: 54 }}
                onPress={handleApple}
              />

              <TouchableOpacity style={[s.btn, s.btnGoogle]} onPress={handleGoogle} activeOpacity={0.85}>
                <IcoGoogle size={20} />
                <Text style={[s.btnTxt, s.btnTxtDark]}>{t('login_google')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[s.btn, s.btnKakao]} onPress={handleKakao} activeOpacity={0.85}>
                <IcoKakao size={20} />
                <Text style={[s.btnTxt, s.btnTxtDark]}>{t('login_kakao')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[s.btn, s.btnNaver]} onPress={handleNaver} activeOpacity={0.85}>
                <IcoNaver size={20} />
                <Text style={[s.btnTxt, s.btnTxtLight]}>{t('login_naver')}</Text>
              </TouchableOpacity>

              <View style={s.divRow}>
                <View style={s.divLine} />
                <Text style={s.divTxt}>{t('login_divider')}</Text>
                <View style={s.divLine} />
              </View>

              <TouchableOpacity
                style={[s.btn, s.btnEmail]}
                onPress={() => { setStep('email_input'); animateIn(); }}
                activeOpacity={0.85}
              >
                <IcoEmail size={20} color={LT.brandStrong} />
                <Text style={[s.btnTxt, { color: LT.brandStrong }]}>{t('login_email')}</Text>
              </TouchableOpacity>

              <Text style={s.terms}>{t('login_terms')}</Text>

              {/* ── 개발자 테스트 진입 (개발 빌드 전용 — 출시 빌드에선 숨김) ── */}
              {__DEV__ && (
                <View style={s.devSection}>
                  <Text style={s.devLabel}>🛠 개발자 테스트</Text>
                  <View style={s.devRow}>
                    <TouchableOpacity
                      style={[s.devBtn, s.devBtnPremium]}
                      onPress={() => enterTestAccount('premium')}
                      activeOpacity={0.8}
                    >
                      <Text style={s.devBtnTxt}>⭐ 프리미엄 계정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.devBtn, s.devBtnFree]}
                      onPress={() => enterTestAccount('free')}
                      activeOpacity={0.8}
                    >
                      <Text style={s.devBtnTxt}>👤 일반 계정</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── EMAIL INPUT ──────────────────────────── */}
          {step === 'email_input' && (
            <View style={s.formGroup}>
              <Text style={s.formLabel}>{t('email_input_title')}</Text>
              <TextInput
                style={[s.input, emailErr ? s.inputErr : null]}
                placeholder={t('email_input_placeholder')}
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={v => { setEmail(v); setEmailErr(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
              />
              {!!emailErr && <Text style={s.errTxt}>{emailErr}</Text>}

              <TouchableOpacity
                style={[s.submitBtn, loading && s.submitDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size={18} />
                  : <Text style={s.submitTxt}>{t('email_send_code')}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={s.backBtn} onPress={goBack}>
                <Text style={s.backTxt}>← {t('login_back')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── EMAIL OTP ────────────────────────────── */}
          {step === 'email_otp' && (
            <View style={s.formGroup}>
              <Text style={s.formLabel}>{t('email_code_title')}</Text>
              <Text style={s.formSub}>
                {t('email_code_sub').replace('{{email}}', email)}
              </Text>

              <TextInput
                ref={otpRef}
                style={[s.otpInput, otpErr ? s.inputErr : null]}
                placeholder="000000"
                placeholderTextColor="#aaa"
                value={otp}
                onChangeText={v => { setOtp(v.replace(/\D/g, '').slice(0, 6)); setOtpErr(''); }}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
              />
              {!!otpErr && <Text style={s.errTxt}>{otpErr}</Text>}

              <TouchableOpacity style={s.submitBtn} onPress={handleVerify} activeOpacity={0.85}>
                <Text style={s.submitTxt}>{t('email_verify')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.backBtn}
                onPress={timer > 0 ? undefined : handleResend}
                disabled={timer > 0}
              >
                <Text style={[s.backTxt, timer > 0 && { opacity: 0.5 }]}>
                  {timer > 0
                    ? t('email_resend').replace('{{sec}}', String(timer))
                    : t('email_resend_now')
                  }
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 6 }} onPress={goBack}>
                <Text style={s.backTxt}>← {t('login_back')}</Text>
              </TouchableOpacity>
            </View>
          )}

        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#40D3B6' },
  container: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },

  logoWrap: { alignItems: 'center', marginBottom: 26, marginTop: 8 },
  logo:     { width: 76, height: 76, marginBottom: 10 },
  appName:  { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: 4 },
  sub:      { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6, textAlign: 'center' },

  btnGroup: { gap: 11, backgroundColor: LT.surface, borderRadius: 24, padding: 22, paddingTop: 18 },
  sheetLabel: { fontSize: 13, fontWeight: '700', color: LT.label3, marginBottom: 2 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 54, borderRadius: 14, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  btnGoogle: { backgroundColor: '#fff', borderWidth: 1, borderColor: LT.border },
  btnKakao:  { backgroundColor: '#FEE500' },
  btnNaver:  { backgroundColor: '#03C75A' },
  btnEmail:  { backgroundColor: LT.brandTint },

  btnTxt:      { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  btnTxtDark:  { color: '#1a1a1a' },
  btnTxtLight: { color: '#fff' },

  divRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  divLine: { flex: 1, height: 1, backgroundColor: LT.border },
  divTxt:  { marginHorizontal: 12, color: LT.label3, fontSize: 13 },

  terms: {
    fontSize: 11, color: LT.label3,
    textAlign: 'center', lineHeight: 16, marginTop: 6,
  },

  formGroup: { gap: 10 },
  formLabel: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 },
  formSub:   { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 21, marginBottom: 6 },

  input: {
    height: 52, borderWidth: 0, borderRadius: Radius.md,
    paddingHorizontal: 16, fontSize: 15, color: '#1a1a1a',
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  otpInput: {
    height: 68, borderWidth: 0, borderRadius: Radius.md,
    fontSize: 30, fontWeight: '700', color: '#1a1a1a',
    backgroundColor: '#fff', letterSpacing: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  inputErr: { borderWidth: 2, borderColor: '#FF6B6B' },
  errTxt:   { fontSize: 12, color: '#FFE0E0', marginTop: -4 },

  submitBtn: {
    height: 54, backgroundColor: '#034A93', borderRadius: Radius.pill,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#034A93', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  submitDisabled: { opacity: 0.6 },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  backBtn: { alignItems: 'center', paddingVertical: 8 },
  backTxt: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500' },

  // 개발자 테스트
  devSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 14 },
  devLabel:   { fontSize: 11, color: LT.label4, textAlign: 'center', marginBottom: 8 },
  devRow:     { flexDirection: 'row', gap: 8 },
  devBtn:     { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  devBtnPremium: { backgroundColor: 'rgba(255,215,0,0.25)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.5)' },
  devBtnFree:    { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  devBtnTxt:  { fontSize: 12, color: '#fff', fontWeight: '600' },
});
