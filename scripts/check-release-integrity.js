#!/usr/bin/env node
/**
 * check-release-integrity.js — 빌드 시점(2차) 출시 안전가드.
 *
 * EAS `eas-build-pre-install` 훅으로 실행(package.json scripts). appstore 프로파일
 * (EXPO_PUBLIC_RELEASE_STAGE=appstore)인데 src/constants/release.ts 의 IDENTITY_LIVE
 * 가 false 면 빌드를 즉시 실패시킨다 → 컴파일/업로드 전에 차단(부팅가드보다 더 앞단).
 *
 * 로컬에서도 수동 점검 가능:
 *   EXPO_PUBLIC_RELEASE_STAGE=appstore node scripts/check-release-integrity.js
 */
const fs = require('fs');
const path = require('path');

const stage = process.env.EXPO_PUBLIC_RELEASE_STAGE || 'dev';
const releasePath = path.join(__dirname, '..', 'src', 'constants', 'release.ts');

let live = null;
try {
  const src = fs.readFileSync(releasePath, 'utf8');
  // ⚠️ release.ts 안에 IDENTITY_LIVE 선언은 정확히 1개여야 한다.
  //    아래 정규식은 첫 매칭만 사용하므로, 선언이 2개 이상이면 가드가 엉뚱한 값을
  //    읽어 우회될 수 있다. (현재 단일 라인 — src/constants/release.ts:15)
  const m = src.match(/export\s+const\s+IDENTITY_LIVE\s*=\s*(true|false)/);
  if (m) live = m[1] === 'true';
} catch (e) {
  console.error(`[release-guard] release.ts 를 읽지 못했습니다: ${releasePath}`);
  process.exit(1);
}

if (live === null) {
  console.error('[release-guard] release.ts 에서 IDENTITY_LIVE 값을 찾지 못했습니다.');
  process.exit(1);
}

if (stage === 'appstore' && !live) {
  console.error(
    '\n========================================================================\n' +
    '[release-guard] 빌드 차단: EXPO_PUBLIC_RELEASE_STAGE=appstore 인데\n' +
    'IDENTITY_LIVE=false 입니다. 본인인증(연령확인) 게이트가 꺼진 채로는\n' +
    'App Store 제출 빌드를 만들 수 없습니다.\n' +
    '→ src/constants/release.ts 의 IDENTITY_LIVE 를 true 로 바꾸고\n' +
    '  테스트 진입(handleTestIdentity)을 제거한 뒤 다시 빌드하세요.\n' +
    '========================================================================\n'
  );
  process.exit(1);
}

console.log(`[release-guard] OK — stage=${stage}, IDENTITY_LIVE=${live}`);
