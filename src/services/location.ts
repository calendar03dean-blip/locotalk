/**
 * location.ts — OS 위치 권한 요청(진입 통합)
 *
 * 법적 동의(위치기반서비스 이용약관)와 OS 런타임 권한은 별개:
 *   - 약관 동의(locationConsent): 위치정보법상 '이용약관 동의' 이력 — LoginScreen 체크박스.
 *   - OS 권한(locationPermission): iOS 위치 접근 런타임 권한 — 본 모듈이 요청.
 *
 * 진입 통합: 약관 3종 동의 직후(LoginScreen 진입 시점)에 OS 위치 권한도 함께 요청해
 *   '동의→권한→진입'을 한 흐름으로 묶는다. HomeScreen.detectLocation 은 그대로 유지되며
 *   iOS는 이미 허용된 권한을 재요청해도 추가 프롬프트 없이 현재 상태만 반환(중복 무해).
 *
 * 원칙: best-effort. 절대 throw/차단하지 않음 — 권한 거부·오류여도 진입은 막지 않는다.
 *
 * ⚠️ DEPRECATED(2026-06-11): 위치 권한이 '필수 게이트'로 승격되어 진입 경로는
 *    components/LocationPermissionGate(차단형) 로 일원화됨. 본 best-effort 헬퍼는
 *    더 이상 호출되지 않음(향후 백그라운드 권한 동기화 등 비차단 용도 재사용 대비 보존).
 */

/** OS 위치 권한 요청 + store(locationPermission) 기록. 허용 여부 반환(실패 시 false). */
export async function ensureLocationPermission(): Promise<boolean> {
  try {
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
    try {
      // 순환참조 방지 위해 지연 require (userApi/authHeader 패턴과 동일)
      const { useStore } = require('../store');
      useStore.getState().setLocationPermission(granted);
    } catch { /* store 미가용 — 무시 */ }
    return granted;
  } catch {
    return false; // 권한 모듈 로드 실패/예외 — 진입은 막지 않음
  }
}
