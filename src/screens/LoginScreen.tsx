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
  Animated, Easing, Alert, Image, Linking, AppState,
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
import { recordConsentWithQueue, flushPendingConsents } from '../services/consentQueue';
import { flushPendingProfiles } from '../services/profileQueue';
import { TERMS, consentPayload, type TermsDoc } from '../constants/terms';
import { IDENTITY_LIVE } from '../constants/release';
import PortOneVerifyModal from '../components/PortOneVerifyModal';
import LocationPermissionGate from '../components/LocationPermissionGate';

// 본인인증 단일 진입으로 전환(프리런치 클린). 소셜/이메일 진입 UI 비활성 —
// 핸들러·모듈 코드는 보존(차기 auth-kit 추출용). true 로 돌리면 즉시 복구.
const SOCIAL_LOGIN_ENABLED = false;

// ⚠️ 본인인증(PortOne) 실연동 스위치 IDENTITY_LIVE 는 src/constants/release.ts 단일 출처에서 import.
//   false: 테스트 우회 진입(handleTestIdentity) / true: 실 PortOne 모달(우회 UI 자동 제거).
//   release.ts 의 assertReleaseIntegrity() 가 appstore 빌드에서 false 면 부팅을 차단한다.

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

function IcoCheckbox({ on, size = 22 }: { on: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
        fill={on ? LT.brand : 'transparent'}
        stroke={on ? LT.brand : LT.border}
        strokeWidth={1.8}
      />
      {on && (
        <Path d="M7.5 12.5l3 3 6-6.5" stroke="#fff" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" />
      )}
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
//   B안: 메인=본인인증 회원가입(主 CTA) / signup=이메일·비번 입력+본인인증 /
//        login=숨김 로그인 레이어. email_input·email_otp 는 소셜/OTP 비활성 보존용.
type Step = 'main' | 'signup' | 'login' | 'email_input' | 'email_otp';

export default function LoginScreen() {
  const t       = useT();
  const [fontsLoaded] = useFonts({ 'JUA-Regular': require('../../assets/fonts/JUA-Regular.ttf') });
  const setAuth      = useStore(s => s.setAuth);
  const setLoggedIn  = useStore(s => s.setLoggedIn);
  const setLocationConsent = useStore(s => s.setLocationConsent);
  const setPendingVerified = useStore(s => s.setPendingVerified);

  const [showIdentity, setShowIdentity] = useState(false); // 본인인증=로그인 모달
  const [authLoading, setAuthLoading] = useState(false); // 로그인 진행 중 중복 방지

  // ── A안 백엔드 + B안 진입 UX: 이메일+비밀번호 계정 + 본인인증 1회 ──────────
  //   (authMode 토글 제거 — 회원가입은 'signup' step, 로그인은 'login' 숨김 레이어로 분리)
  const [pw, setPw]       = useState('');
  const [pwErr, setPwErr] = useState('');
  // 본인인증 모달 완료(IVID 획득) 후 /auth/signup 에 함께 보낼 가입 자격증명 보관.
  const pendingSignup = useRef<{ email: string; password: string } | null>(null);

  // ── OS 위치 권한 필수 게이트(진입 차단) ──────────────────────────────
  //   위치 기반 서비스라 OS 위치 권한 없이는 진입 불가 → 모든 진입 경로는 setAuth/
  //   applyLoginResult/setLoggedIn '전에' requestLocationGate() 를 await 한다.
  //   허용 시에만 promise 가 resolve(=진입 진행). 거부 시 게이트가 닫히지 않아
  //   promise 가 영영 resolve 되지 않으므로 진입 자체가 차단된다(안내+설정 이동만 제공).
  const [showLocGate, setShowLocGate] = useState(false);
  const locGateResolve = useRef<(() => void) | null>(null);
  const requestLocationGate = () => new Promise<void>((resolve) => {
    locGateResolve.current = resolve;
    setShowLocGate(true);
  });
  const onLocGateGranted = () => {
    setShowLocGate(false);
    const resolve = locGateResolve.current;
    locGateResolve.current = null;
    resolve?.();
  };

  // ── 약관 3종 동의 (본인인증 PII 수집 '전' — 출시 법적 필수) ──────────
  const [agreed, setAgreed] = useState<{ [K in TermsDoc['id']]: boolean }>({
    privacy: false, service: false, location: false,
  });
  const allAgreed = agreed.privacy && agreed.service && agreed.location;
  const toggleAll = () => {
    const v = !allAgreed;
    setAgreed({ privacy: v, service: v, location: v });
  };
  const toggleOne = (k: TermsDoc['id']) => setAgreed(p => ({ ...p, [k]: !p[k] }));
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

  // ── 미동의 넛지(Alert 대체) — 비활성 CTA 탭 시 동의 박스 흔들림 1회 + 헬퍼 강조 ──
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [nudge, setNudge] = useState(false);
  const triggerConsentNudge = () => {
    setNudge(true);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 7,  duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5,  duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 45, useNativeDriver: true }),
    ]).start();
  };
  // 전체 동의가 채워지면 넛지 강조 해제(꾸중 아닌 진행감으로 전환).
  useEffect(() => { if (allAgreed) setNudge(false); }, [allAgreed]);
  // 위치기반서비스 이용약관 동의 = 위치정보 이용 동의. 회원가입 동의(약관 3종)에 포함시켜
  //   매칭 시 별도 위치동의 모달이 다시 뜨지 않게 한다(HomeScreen 위치게이트 통과).
  useEffect(() => { if (agreed.location) setLocationConsent(true); }, [agreed.location]);

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

  // ── 동의 증빙 재동기화(flush) ───────────────────────────────────────
  //   auth 상태는 영속되지 않아 모든 로그인은 이 화면을 거친다 → 이전 세션에서
  //   서버 영속에 실패해 큐에 잔류한 동의 이력을 다음 로그인·앱 포그라운드·네트워크
  //   복귀 시점에 재시도한다. 진입을 막지 않는 백그라운드 best-effort.
  //   동의 증빙(consentQueue)과 코드네임(profileQueue) 모두 같은 시점에 재시도한다.
  //   auth 미영속이라 앱 재시작 시 반드시 이 화면을 거치므로, 오프라인 진입분의 서버 영속은
  //   다음 세션 이 flush 가 책임진다(코드네임 오프라인 봉합의 재연결 경로).
  const flushQueues = () => { flushPendingConsents(); flushPendingProfiles(); };
  useEffect(() => {
    flushQueues(); // 화면 진입(앱 시작/로그아웃 복귀) 시 1회
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') flushQueues(); // 포그라운드 복귀 시 재시도
    });
    return () => sub.remove();
  }, []);

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

  // ── 본인인증 = 로그인 (단일 진입) ─────────────────────────────
  // PortOne 모달이 서버 /auth/portone-verify(IVID만) 응답을 전달 → 서버가 CI로 결정한
  // 신원 userId + 신뢰 JWT 로 로그인. 신규는 온보딩(검증정보 stash), 복귀완성은 바로 홈.
  const handleIdentityVerified = async (info: any) => {
    setShowIdentity(false);
    if (!info?.userId || !info?.token) { Alert.alert(t('login_failed')); return; }
    // 진입 통합: 본인인증 직후 OS 위치 권한 필수 게이트 — 허용 전에는 진입(아래) 진행 안 됨.
    await requestLocationGate();
    // 신규/미완성 유저는 온보딩이 isVerified·성별·생년을 채우도록 stash
    if (info.isNew || !info.isComplete) {
      const yr = info.birth ? parseInt(String(info.birth).slice(0, 4), 10) : undefined;
      setPendingVerified({ gender: info.gender, birthYear: Number.isFinite(yr) ? yr : undefined, phone: info.phone, name: info.name });
    }
    // 소셜 applyLoginResult 재사용: setAuth(+신뢰토큰) / 복귀완성유저면 setLoggedIn(isVerified 포함)
    applyLoginResult('portone', info);

    // 약관 동의 이력 영속(증빙) — userId 확정 후. 로컬 큐에 '먼저' 적재(1차 증빙) 후 서버 영속+재시도.
    //   게이트는 위 체크박스(allAgreed)로 이미 강제됨. 서버 기록 실패는 진입을 막지 않음(큐 잔류→다음 flush).
    recordConsentWithQueue(info.userId, consentPayload());
    setLocationConsent(true);
  };

  // ── A안: 신규가입 — 이메일/비번 검증 → 본인인증 1회(IVID) → /auth/signup ────────
  const submitSignup = () => {
    if (authLoading) return;
    if (!allAgreed) { triggerConsentNudge(); return; }
    const em = email.trim();
    if (!isValidEmail(em)) { setEmailErr(t('auth_email_invalid')); return; }
    if (pw.length < 8)     { setPwErr(t('auth_pw_short')); return; }
    setEmailErr(''); setPwErr('');
    // 실 PortOne 연동(IDENTITY_LIVE) 시에만 본인인증 모달. 미연동(테스트)이면 기존 테스트 진입으로 폴백.
    if (!IDENTITY_LIVE) { handleTestIdentity('A'); return; }
    pendingSignup.current = { email: em, password: pw };
    setShowIdentity(true);
  };

  // 본인인증 모달이 IVID 만 넘겨주면(onIvidVerified) 가입 자격증명과 함께 서버 계정 생성.
  const handleSignupIvid = async (ivid: string) => {
    setShowIdentity(false);
    const creds = pendingSignup.current;
    pendingSignup.current = null;
    if (!creds || !ivid) { Alert.alert(t('auth_signup_failed')); return; }
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: creds.email, password: creds.password, identityVerificationId: ivid }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success || !result?.userId) {
        Alert.alert(t('auth_signup_failed'), result?.error || t('login_failed'));
        return;
      }
      // 위치 권한 필수 게이트 — 허용 전에는 진입(applyLoginResult) 진행 안 됨.
      await requestLocationGate();
      // 신규 → 온보딩이 isVerified·성별·생년을 채우도록 stash(서버 PortOne 결과)
      const yr = result.birth ? parseInt(String(result.birth).slice(0, 4), 10) : undefined;
      setPendingVerified({ gender: result.gender, birthYear: Number.isFinite(yr) ? yr : undefined, phone: result.phone, name: result.name });
      // 소셜 applyLoginResult 재사용: setAuth(+신뢰토큰). 신규(isComplete=false)라 온보딩으로.
      applyLoginResult('email', result, creds.email);
      recordConsentWithQueue(result.userId, consentPayload());
      setLocationConsent(true);
    } catch {
      Alert.alert(t('auth_signup_failed'), t('login_failed'));
    } finally {
      setAuthLoading(false);
    }
  };

  // ── A안: 로그인 — 이메일/비번만(본인인증 없음). 기기 변경 시에도 재인증 강요 안 함. ──
  const submitLogin = async () => {
    if (authLoading) return;
    // B안: 로그인 레이어엔 약관 동의 박스가 없다(기존 계정 = 가입 시 이미 동의·서버 기록 보유).
    //   재로그인 시 재동의 강요 안 함(applyLoginResult 의 인증/동의 복원과 동일 취지). 가입 게이트는 submitSignup 에만 유지.
    const em = email.trim();
    if (!isValidEmail(em)) { setEmailErr(t('auth_email_invalid')); return; }
    if (!pw)               { setPwErr(t('auth_pw_required')); return; }
    setEmailErr(''); setPwErr('');
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/email-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, password: pw }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success || !result?.userId) {
        Alert.alert(t('login_failed'), result?.error || t('auth_login_failed_msg'));
        return;
      }
      // 위치 권한 필수 게이트 — 허용 전에는 진입(applyLoginResult) 진행 안 됨.
      await requestLocationGate();
      // 기존 인증/동의 상태 복원(applyLoginResult). 완성유저=홈 / 미완성=온보딩.
      applyLoginResult('email', result, em);
      if (result.user?.location_consent === true) setLocationConsent(true);
    } catch {
      Alert.alert(t('login_failed'));
    } finally {
      setAuthLoading(false);
    }
  };

  // ── [테스트 우회] PortOne 실연동 전 본인인증 화면 잠금 해제 ──────────────
  //   IDENTITY_LIVE=false 일 때만 사용. 실 PortOne 대신 기존 이메일 로그인 서버
  //   경로를 재사용해 '실제 유저 행 + 실제 userId' 로 진입한다(온보딩 저장이 실제로
  //   영속됨 → 다음 화면들 정상 테스트 가능). 신규면 온보딩, 복귀(닉네임 보유)면 바로 홈.
  //   ⚠️ token=null(미검증) — 매칭 성인게이트는 ENFORCE_ADULT 기본 OFF 라 무방.
  // ⚠️ 테스트 진입을 '기기별로 다른 테스터'로 분리한다(택1: 테스터 A / 테스터 B).
  //   단일 하드코드 이메일이면 모든 기기가 동일 userId 로 진입 → 위치기반 1:1 채팅
  //   e2e(서로 다른 두 사용자 필요)가 구조적으로 불가능. 서로 다른 이메일 → 서버가
  //   서로 다른 user 행/userId 를 발급 → A·B 두 기기가 매칭 큐에 동시 입장해 1:1 채팅 검증 가능.
  type TestSlot = 'A' | 'B';
  const testIdentityEmail = (slot: TestSlot) => `tester+${slot}@locotalk.dev`;
  const handleTestIdentity = async (slot: TestSlot) => {
    if (authLoading) return;
    if (!allAgreed) { triggerConsentNudge(); return; }
    setAuthLoading(true);
    try {
      const email = testIdentityEmail(slot);
      const result = await serverLogin('email', email, email);
      if (!result?.userId) { Alert.alert(t('login_failed')); return; }
      // [테스트] IDENTITY_LIVE=false 진입은 '본인인증 완료'를 시뮬레이션한다 → 검증됨으로 처리.
      //   (서버 tester 행은 is_verified=false 라, 재로그인 복귀완성 경로에서 applyLoginResult 가
      //    DB값을 읽어 isVerified=false 가 되고 → 매칭 성인게이트(HomeScreen)가 본인인증을
      //    다시 띄운다. 실 PortOne 완료와 동일하게 검증됨 처리하여 그 재요구를 제거.)
      if (result.user) { const ru = result.user as any; ru.is_verified = true; ru.adult_verified = true; }
      // 위치 권한 필수 게이트 — 허용 전에는 진입(applyLoginResult) 진행 안 됨.
      await requestLocationGate();
      // 신규/미완성이면 온보딩이 성별/생년을 채우도록 stash(테스트 더미값)
      if (result.isNew || !result.isComplete) {
        setPendingVerified({ gender: 'male', birthYear: 1995, phone: '01000000000', name: `테스터${slot}` });
      }
      // 소셜 applyLoginResult 재사용: 신규=온보딩 / 복귀완성=홈
      applyLoginResult('email', result, email);
      recordConsentWithQueue(result.userId, consentPayload());
      setLocationConsent(true);
    } catch {
      Alert.alert(t('login_failed'));
    } finally {
      setAuthLoading(false);
    }
  };
  // [테스트 진입] 사용자에겐 A/B 선택창을 노출하지 않는다 — 탭하면 단일 신원(슬롯 'A')으로 바로 진입.
  //   단, 1:1 채팅 e2e(서로 다른 두 사용자 필요) 능력은 보존: 슬롯 'B' 진입은 사용자 눈에 안 띄는
  //   숨김 경로(진입 버튼 롱프레스)로만 남긴다. `handleTestIdentity('A'|'B')` / `tester+A·tester+B`
  //   슬롯 분리 로직 자체는 그대로 유지(아래 버튼 onPress/onLongPress 에서 호출).

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
      // 위치 권한 필수 게이트 — 허용 전에는 진입(applyLoginResult) 진행 안 됨.
      await requestLocationGate();
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
      // 위치 권한 필수 게이트 — 허용 전에는 진입(applyLoginResult) 진행 안 됨. (다른 경로와 동일 패턴)
      await requestLocationGate();
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

  const goBack = () => {
    // signup·login·email_input → main, email_otp → email_input. pw·에러 정리.
    setStep(step === 'email_otp' ? 'email_input' : 'main');
    setOtp(''); setOtpErr(''); setEmailErr(''); setPwErr('');
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
              {/* ── 환영·안심 헤더 (가치 먼저, 벽은 나중) ── */}
              <View style={s.welcomeBox}>
                <Text style={s.welcomeTitle}>{t('entry_welcome_title')}</Text>
                <Text style={s.welcomeSub}>{t('entry_welcome_sub')}</Text>
              </View>

              {/* ── 약관 3종 동의 (본인인증 PII 수집 전 — 출시 법적 필수) ── */}
              <Animated.View style={[s.consentBox, { transform: [{ translateX: shakeAnim }] }]}>
                {/* 전체 동의 — 친근한 메인 토글(시각적으로 가장 크게) */}
                <TouchableOpacity style={s.consentAllRow} onPress={toggleAll} activeOpacity={0.7}>
                  <IcoCheckbox on={allAgreed} />
                  <View style={s.consentAllTextWrap}>
                    <Text style={s.consentAllTxt}>{t('consent_all')}</Text>
                    <Text style={s.consentAllHint}>{t('consent_all_hint')}</Text>
                  </View>
                </TouchableOpacity>
                <View style={s.consentDiv} />
                {/* 개별 [필수] 3종 — 법적 필수(개별 표시·동의·열람 유지), 시각 위계만 낮춤 */}
                {([['privacy','consent_privacy'],['service','consent_service'],['location','consent_location']] as const).map(([k, label]) => (
                  <View key={k} style={s.consentRow}>
                    <TouchableOpacity style={s.consentLeft} onPress={() => toggleOne(k)} activeOpacity={0.7}>
                      <IcoCheckbox on={agreed[k]} size={18} />
                      <View style={s.consentReqChip}><Text style={s.consentReqTxt}>{t('consent_required')}</Text></View>
                      <Text style={s.consentLabel}>{t(label)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Linking.openURL(TERMS[k].url)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.consentView}>{t('consent_view')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </Animated.View>

              {/* 미동의 넛지(인라인) — 꾸중 아닌 진행감. 동의 완료 시 안심 문구로 전환. */}
              {allAgreed
                ? <Text style={s.consentReady}>{t('consent_ready')}</Text>
                : <Text style={[s.consentNudge, nudge && s.consentNudgeOn]}>{t('consent_need')}</Text>}

              {/* 3스텝 미니 경로 — "금방 끝남"을 시각으로 안심 */}
              <View style={s.stepsRow}>
                <Text style={s.stepsTxt}>{t('entry_steps')}</Text>
              </View>

              {/* ── B안 주(主) CTA = 회원가입 = 본인인증으로 시작하기 (가장 크고 지배적) ── */}
              {/*   미동의 시 비활성 톤이지만 탭은 받아 인라인 넛지(shake) 노출 → 동의 시 signup step 진입 */}
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, (!allAgreed || authLoading) && s.btnDisabled]}
                onPress={() => {
                  if (!allAgreed) { triggerConsentNudge(); return; }
                  setEmailErr(''); setPwErr('');
                  setStep('signup'); animateIn();
                }}
                activeOpacity={0.85}
                disabled={authLoading}
              >
                <Text style={[s.btnTxt, s.btnPrimaryTxt]}>{t('entry_start_cta')}</Text>
              </TouchableOpacity>

              {/* 작고 차분한 링크 — 이미 가입한 사용자 → 숨김 로그인 레이어 노출 */}
              <TouchableOpacity
                style={s.loginLink}
                onPress={() => { setEmailErr(''); setPwErr(''); setStep('login'); animateIn(); }}
                activeOpacity={0.7}
              >
                <Text style={s.loginLinkTxt}>{t('entry_login_link')}</Text>
              </TouchableOpacity>

              {/* 소셜/이메일 진입 — 비활성(코드 보존, auth-kit 추출용). SOCIAL_LOGIN_ENABLED=true 시 즉시 복구 */}
              {SOCIAL_LOGIN_ENABLED && (
                <>
                  <Text style={s.sheetLabel}>간편 로그인</Text>
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
                </>
              )}

              {/* 테스트 로그인 버튼(프리미엄/일반 즉시진입)은 제거.
                  테스트는 "이메일로 로그인" 레이어 + 시드 계정(admin@locotalk.app)으로 일원화. */}
            </View>
          )}

          {/* ── SIGNUP (본인인증 회원가입 입력) ────────── */}
          {/*   이메일·비번 1차검증(서버 강도검증과 일치) → submitSignup → 본인인증(IVID) → /auth/signup */}
          {step === 'signup' && (
            <View style={s.btnGroup}>
              <View style={s.welcomeBox}>
                <Text style={s.welcomeTitle}>{t('signup_title')}</Text>
                <Text style={s.welcomeSub}>{t('signup_sub')}</Text>
              </View>

              <TextInput
                style={[s.authInput, emailErr ? s.inputErr : null]}
                placeholder={t('auth_email_ph')}
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={v => { setEmail(v); setEmailErr(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
              />
              {!!emailErr && <Text style={s.errTxtDark}>{emailErr}</Text>}
              <TextInput
                style={[s.authInput, pwErr ? s.inputErr : null]}
                placeholder={t('auth_pw_ph')}
                placeholderTextColor="#aaa"
                value={pw}
                onChangeText={v => { setPw(v); setPwErr(''); }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={submitSignup}
              />
              {!!pwErr && <Text style={s.errTxtDark}>{pwErr}</Text>}
              <Text style={s.authHint}>{t('auth_signup_hint')}</Text>

              {/* 본인인증하고 가입 — 미동의면 메인에서 막혀 여기 못 옴(allAgreed 유지). 안전상 재게이트는 submitSignup 내부. */}
              {/*   [숨김 e2e 경로] 롱프레스 = 테스터 B 슬롯(1:1 매칭 검증용 — 비노출, 실연동 전 한정) */}
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, authLoading && s.btnDisabled]}
                onPress={submitSignup}
                onLongPress={() => {
                  if (IDENTITY_LIVE) return;
                  if (!allAgreed) { triggerConsentNudge(); return; }
                  handleTestIdentity('B');
                }}
                delayLongPress={800}
                activeOpacity={0.85}
                disabled={authLoading}
              >
                {authLoading
                  ? <ActivityIndicator color="#fff" size={18} />
                  : <Text style={[s.btnTxt, s.btnPrimaryTxt]}>{t('signup_submit_cta')}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={s.backBtnDark} onPress={goBack} activeOpacity={0.7}>
                <Text style={s.backTxtDark}>← {t('login_back')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── LOGIN (숨김 레이어 — 이미 가입한 사용자) ───── */}
          {/*   평소 숨김. 메인 "이메일로 로그인" 링크로만 진입. submitLogin → /auth/email-login (본인인증 없음) */}
          {step === 'login' && (
            <View style={s.btnGroup}>
              <View style={s.welcomeBox}>
                <Text style={s.welcomeTitle}>{t('login_title')}</Text>
                <Text style={s.welcomeSub}>{t('login_sub_layer')}</Text>
              </View>

              <TextInput
                style={[s.authInput, emailErr ? s.inputErr : null]}
                placeholder={t('auth_email_ph')}
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={v => { setEmail(v); setEmailErr(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
              />
              {!!emailErr && <Text style={s.errTxtDark}>{emailErr}</Text>}
              <TextInput
                style={[s.authInput, pwErr ? s.inputErr : null]}
                placeholder={t('auth_pw_ph')}
                placeholderTextColor="#aaa"
                value={pw}
                onChangeText={v => { setPw(v); setPwErr(''); }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={submitLogin}
              />
              {!!pwErr && <Text style={s.errTxtDark}>{pwErr}</Text>}

              <TouchableOpacity
                style={[s.btn, s.btnPrimary, authLoading && s.btnDisabled]}
                onPress={submitLogin}
                activeOpacity={0.85}
                disabled={authLoading}
              >
                {authLoading
                  ? <ActivityIndicator color="#fff" size={18} />
                  : <Text style={[s.btnTxt, s.btnPrimaryTxt]}>{t('auth_login_cta')}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={s.backBtnDark} onPress={goBack} activeOpacity={0.7}>
                <Text style={s.backTxtDark}>← {t('login_back')}</Text>
              </TouchableOpacity>
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

      {/* A안 본인인증 모달 — IVID-only 모드. 인증 후 /auth/signup 로 이메일/비번 계정 생성. */}
      <PortOneVerifyModal
        visible={showIdentity}
        onClose={() => { setShowIdentity(false); pendingSignup.current = null; }}
        onIvidVerified={handleSignupIvid}
        onVerified={handleIdentityVerified}
        userId=""
      />

      {/* OS 위치 권한 필수 게이트(진입 차단) — 허용 시에만 onLocGateGranted 로 진입 진행 */}
      <LocationPermissionGate visible={showLocGate} onGranted={onLocGateGranted} />
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
  btnDisabled: { opacity: 0.45 },

  // ── B안 주(主) CTA — 가장 크고 지배적(브랜드 채움 + 흰 글씨) ──
  btnPrimary:    { backgroundColor: LT.brandStrong, height: 56 },
  btnPrimaryTxt: { color: '#fff', fontSize: 16.5, fontWeight: '800', letterSpacing: -0.3 },
  // 작고 차분한 "이미 가입하셨나요? 로그인" 링크
  loginLink:     { alignItems: 'center', paddingVertical: 8, marginTop: 2 },
  loginLinkTxt:  { fontSize: 13.5, color: LT.label3, fontWeight: '600', textDecorationLine: 'underline' },
  // 흰 카드(btnGroup) 위 뒤로가기 — 어두운 톤
  backBtnDark:   { alignItems: 'center', paddingVertical: 10, marginTop: 2 },
  backTxtDark:   { fontSize: 14, color: LT.label3, fontWeight: '600' },

  // ── A안: 이메일+비밀번호 가입/로그인 ──────────────────────────
  authTabRow:    { flexDirection: 'row', backgroundColor: LT.brandTint, borderRadius: 12, padding: 4, marginBottom: 2 },
  authTab:       { flex: 1, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  authTabOn:     { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  authTabTxt:    { fontSize: 14, fontWeight: '600', color: LT.label3 },
  authTabTxtOn:  { color: LT.brandStrong, fontWeight: '800' },
  authInput: {
    height: 50, borderWidth: 1, borderColor: LT.border, borderRadius: Radius.md,
    paddingHorizontal: 14, fontSize: 15, color: '#1a1a1a', backgroundColor: '#fff',
  },
  errTxtDark: { fontSize: 12, color: '#E5484D', marginTop: -4, marginLeft: 4 },
  authHint:   { fontSize: 11, color: LT.label3, lineHeight: 16, marginTop: 2, marginBottom: 2 },

  // ── 환영·안심 헤더 ─────────────────────────────────────────
  welcomeBox:    { backgroundColor: LT.brandTint, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 3 },
  welcomeTitle:  { fontSize: 15, fontWeight: '800', color: LT.brandStrong, letterSpacing: -0.3 },
  welcomeSub:    { fontSize: 12.5, color: LT.label3, lineHeight: 18 },

  // ── 약관 동의 ──────────────────────────────────────────────
  consentBox:        { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: LT.border, paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
  // 전체 동의 — 메인 토글: 가장 크고 눈에 띄게, 탭 영역 넉넉히
  consentAllRow:     { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 6 },
  consentAllTextWrap:{ flex: 1, gap: 1 },
  consentAllTxt:     { fontSize: 16, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.3 },
  consentAllHint:    { fontSize: 11.5, color: LT.label3 },
  consentDiv:        { height: 1, backgroundColor: LT.border, marginVertical: 8 },
  // 개별 [필수] 3종 — 시각 위계 낮춤(참고 목록 톤). 들여쓰기 + 회색.
  consentRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, paddingLeft: 4 },
  consentLeft:       { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  consentReqChip:    { backgroundColor: '#EFEFF2', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  consentReqTxt:     { fontSize: 10.5, fontWeight: '700', color: LT.label3 },
  consentLabel:      { fontSize: 12.5, color: LT.label3, flexShrink: 1 },
  consentView:       { fontSize: 12, color: LT.label3, textDecorationLine: 'underline', paddingLeft: 8 },
  // 미동의 넛지(인라인) / 동의 완료 안심
  consentNudge:      { fontSize: 12, color: LT.label3, textAlign: 'center', marginTop: 2, marginBottom: 2 },
  consentNudgeOn:    { color: '#E5484D', fontWeight: '700' },
  consentReady:      { fontSize: 12.5, color: LT.brandStrong, fontWeight: '700', textAlign: 'center', marginTop: 2, marginBottom: 2 },
  // 3스텝 미니 경로
  stepsRow:          { alignItems: 'center', marginTop: 1, marginBottom: 1 },
  stepsTxt:          { fontSize: 11.5, color: LT.label3, fontWeight: '600', letterSpacing: -0.2 },

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
});
