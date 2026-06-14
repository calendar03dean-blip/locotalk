/**
 * release.ts — 릴리스 단계 + 본인인증 라이브 스위치의 단일 출처(single source of truth).
 *
 * 왜 한 곳에 모으나:
 *   IDENTITY_LIVE(본인인증 게이트 ON/OFF)와 RELEASE_STAGE(빌드 대상)를 따로 두면
 *   "App Store 제출 빌드인데 본인인증이 꺼져 있는" 사고를 사람이 눈으로 막아야 한다.
 *   여기 모아두고 assertReleaseIntegrity() 로 부팅 시점에 코드가 물리적으로 차단한다.
 */

// ⚠️ 본인인증(PortOne) 실연동 스위치 — LoginScreen 진입 분기의 기준.
//   false : PortOne 미완성(테스트 채널) → 테스트 우회 진입(handleTestIdentity)
//   true  : 실 PortOne 모달 진입(우회 UI 자동 제거)
//   🚫 App Store '제출'용 빌드(RELEASE_STAGE='appstore')는 반드시 true 여야 한다.
//      (본인인증 게이트 = 청소년보호법 연령확인 준수)
export const IDENTITY_LIVE = false;

// 프리미엄 기능 전체 노출 스위치(소프트런치 — 당분간 숨김, 나중에 오픈 시 true).
//   false: 업그레이드/플랜/PREMIUM 배지/프리미엄 전용 기능(지역설정·지인매칭 등) UI 전부 숨김.
//          내부 매칭 로직의 isPremium 분기는 그대로(프리미엄 유저 부재 시 무료 동작) — UI만 가린다.
export const PREMIUM_ENABLED = false;

export type ReleaseStage = 'dev' | 'testflight' | 'appstore';

// EAS build profile(eas.json)의 env 로 주입(EXPO_PUBLIC_* 는 빌드 시 번들에 인라인).
//   development → 'dev' / preview → 'testflight' / appstore → 'appstore'
//   로컬 `expo start` 등 미주입 시 → 'dev'.
const RAW = process.env.EXPO_PUBLIC_RELEASE_STAGE;
export const RELEASE_STAGE: ReleaseStage =
  RAW === 'appstore' || RAW === 'testflight' ? RAW : 'dev';

/**
 * ⚠️ [운영 규칙 — TestFlight 우회 노출 한계] 이 가드는 'appstore' 단계만 물리 차단한다.
 *   'testflight' 단계는 IDENTITY_LIVE=false 라도 throw 하지 않으므로 본인인증 우회 진입
 *   (handleTestIdentity)이 포함된 빌드가 TestFlight 에 올라갈 수 있다. 내부 e2e 목적상
 *   의도된 동작이나, 다음을 반드시 지킨다:
 *     • build 42(testflight)는 **내부 테스터 한정**. 외부/오픈베타 배포 금지.
 *     • 외부 테스터 추가·오픈베타 전환 전: IDENTITY_LIVE=true 전환 + 실 PortOne 채널 확정 +
 *       테스트 진입(A/B) 제거가 선행되어야 한다. 외부 테스터 추가가 임박하면 STOP·보고.
 *
 * 부팅 시점 안전가드. App Store 제출 빌드(RELEASE_STAGE='appstore')인데 본인인증
 * 게이트가 꺼져 있으면(IDENTITY_LIVE=false) throw 하여 앱 자체가 뜨지 않게 한다.
 * → 연령확인 없는 바이너리의 제출을 fail-fast 로 차단. 빌드 직후 스모크 테스트에서
 *   즉시 드러나므로 실수로 App Store 까지 올라가는 사고를 원천 봉쇄한다.
 * index.ts(앱 진입 최상단)에서 호출한다.
 */
export function assertReleaseIntegrity(): void {
  if (RELEASE_STAGE === 'appstore' && !IDENTITY_LIVE) {
    throw new Error(
      '[release-guard] 출시 차단: App Store 제출 빌드(RELEASE_STAGE=appstore)인데 ' +
      'IDENTITY_LIVE=false 입니다. 본인인증(연령확인) 게이트가 꺼진 채로는 출시할 수 없습니다. ' +
      'src/constants/release.ts 의 IDENTITY_LIVE 를 true 로 바꾸고 테스트 진입을 제거한 뒤 다시 빌드하세요.'
    );
  }
}
