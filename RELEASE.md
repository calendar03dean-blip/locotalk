# RELEASE — 출시 운영 규칙 (출시 안전가드 운영 절차)

> 코드 가드(`src/constants/release.ts` + `scripts/check-release-integrity.js`)는
> **백스톱**이다. 가드가 의미 있게 발동하려면 아래 운영 규칙을 지켜야 한다.
> 관련 코드: [`src/constants/release.ts`](src/constants/release.ts),
> [`scripts/check-release-integrity.js`](scripts/check-release-integrity.js), `eas.json`, `package.json`.

---

## 왜 이 문서가 필요한가 (가드의 빈틈)

출시 안전가드는 `EXPO_PUBLIC_RELEASE_STAGE='appstore'` 단계에서만 발동한다.
그러나 **실제 출시 경로는 그 단계를 거치지 않을 수 있다**:

1. `production` 프로파일은 `distribution:"store"` + `submit.production` 이 연결돼 있어,
   `build:ios` → `submit:ios` 만으로 store 배포 가능 바이너리가 만들어진다.
   이 빌드의 stage 는 `testflight` → **appstore 가드 no-op**.
2. **Apple 은 동일한 TestFlight 바이너리를 App Store Connect 에서 그대로 "승격(promote)"** 한다.
   별도 appstore 바이너리를 새로 빌드하지 않는 게 일반 워크플로다.
   따라서 appstore 가드는 *일부러 appstore 프로파일로 따로 빌드할 때만* 울린다.
3. 결론: 테스트 진입(`IDENTITY_LIVE=false`) 빌드(예: build 42)를 그대로 승격하면
   **가드가 발동하지 않은 채 연령확인 OFF 바이너리가 출시될 수 있다.**

→ 그래서 "어느 프로파일로 빌드/승격하느냐"라는 운영 규율을 아래처럼 못박는다.

---

## 프로파일 = 용도 (엄수)

| EAS 프로파일 | stage | 용도 | App Store 승격 |
|---|---|---|---|
| `development` | `dev` | 시뮬레이터/로컬 | ❌ |
| `preview` | `testflight` | 내부 배포(QA) | ❌ |
| `production` | `testflight` | **TestFlight QA 전용** | ❌ **승격 금지** |
| `appstore` | `appstore` | **App Store 제출용 RC(릴리스 후보)** | ✅ 이것만 승격 |

> `production` 프로파일 빌드(build 42 포함)는 **TestFlight QA 전용**이다.
> **이 빌드를 App Store 로 승격하지 말 것.**

---

## App Store 출시 절차 (RC = 릴리스 후보)

1. **RC 빌드는 반드시 `npm run build:appstore` 로만 만든다.**
   - 이 프로파일은 `EXPO_PUBLIC_RELEASE_STAGE=appstore` 를 주입한다.
   - `eas-build-pre-install` 훅이 `check-release-integrity.js` 를 돌려
     `IDENTITY_LIVE=false` 면 **빌드를 즉시 실패**시킨다. (false 로는 RC 자체가 안 나옴)
2. RC 를 TestFlight 에 올려 **실기기 본인인증(PortOne) e2e 통과**를 확인한다.
3. **그 RC 빌드를 App Store 로 승격**한다.
   - 제출은 `npm run submit:ios` 또는 App Store Connect GUI 수동 승격.
   - `submit:ios` 는 제출 직전에도 `EXPO_PUBLIC_RELEASE_STAGE=appstore` 로
     `check-release-integrity.js` 를 한 번 더 돌려 `IDENTITY_LIVE=false` 면 **제출을 차단**한다.

### 🚫 금지
- 테스트 진입(`IDENTITY_LIVE=false`) 빌드(build 42 등)의 App Store 승격.
- `production`(testflight) 빌드의 App Store 승격.

---

## 수동 점검

```bash
# 현재 release.ts 정합 확인 (stage=dev 기준 → 항상 PASS, 값 표시용)
npm run check:release

# App Store 제출 가능 상태인지 확인 (appstore 기준 → IDENTITY_LIVE=false 면 BLOCK)
EXPO_PUBLIC_RELEASE_STAGE=appstore npm run check:release
```

---

## 현재 상태 (2026-06-10)

- `IDENTITY_LIVE=false` (PortOne 미완성 → 테스트 진입 우회 중).
- build 42 = `production`/testflight 테스트 빌드 → **App Store 승격 금지**.
- 다음 마일스톤: PortOne 실연동 완료 → 테스트 진입 제거 + `IDENTITY_LIVE=true` 전환 →
  `npm run build:appstore` 로 RC 산출 → e2e → 승격.
