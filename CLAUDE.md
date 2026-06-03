# Locotalk — Claude Code 협업 가이드

> 이 파일을 읽으면 프로젝트 전체 맥락을 즉시 파악할 수 있습니다.
> 새 세션 시작 시 Claude Code가 자동으로 이 파일을 읽습니다.

---

## 프로젝트 개요

**Locotalk** — 내 동네 이웃과 익명으로 대화하는 위치 기반 실시간 채팅 앱

- 플랫폼: iOS (App Store 심사 중)
- Bundle ID: `com.palosanto.spotchat`
- App Store ID: `6774541518`
- Apple Team ID: `CZ6F9378X9`
- EAS Project: `@calendar808/spota-fresh`

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | React Native 0.81.5 + Expo SDK 54 |
| 언어 | TypeScript |
| 상태관리 | Zustand (src/store/index.ts) |
| 네비게이션 | React Navigation v6 |
| 실시간 통신 | Socket.io (서버: port 4000) |
| 이메일 | Resend API |
| 인앱 결제 | react-native-iap v15 |
| 빌드/배포 | EAS Build + Transporter |

---

## 프로젝트 구조

```
spota-fresh/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx      # 소셜/이메일 로그인 (Apple/Google/Kakao/Naver)
│   │   ├── OnboardingScreen.tsx # 닉네임 + 관심사 선택
│   │   ├── HomeScreen.tsx       # 홈 피드 + 매칭 시작
│   │   ├── ChatScreen.tsx       # 실시간 채팅
│   │   └── MyInfoScreen.tsx     # 프로필 + 설정 + 프리미엄
│   ├── navigation/
│   │   └── RootNavigator.tsx    # 로그인→온보딩→홈 네비게이션 흐름
│   ├── store/index.ts           # Zustand 전역 상태
│   ├── components/
│   │   ├── UpgradeModal.tsx     # 프리미엄 업그레이드 모달
│   │   └── RegionPickerModal.tsx# 지역 선택 피커 (프리미엄 전용)
│   ├── services/
│   │   ├── socket.ts            # Socket.io 연결 관리
│   │   ├── iap.ts               # 인앱 결제 (react-native-iap)
│   │   └── notifications.ts     # 푸시 알림 (Expo Notifications)
│   ├── constants/
│   │   ├── theme.ts             # 컬러/타이포 (#40D3B6 primary)
│   │   ├── data.ts              # 관심사 30개 목록
│   │   └── districts.ts        # 전국 70개+ 구/군 목록
│   └── i18n/index.ts            # 한국어/영어 다국어
├── server/
│   └── index.js                 # Socket.io 서버 (Express + Socket.io)
├── assets/
│   ├── logo.png                 # 앱 로고 (투명 배경)
│   ├── icon.png                 # 앱 아이콘 1024x1024
│   └── splash-icon.png          # 스플래시 이미지
└── docs/
    ├── privacy-policy.html      # 한국어 개인정보처리방침
    └── privacy-policy-en.html   # 영어 개인정보처리방침
```

---

## 앱 플로우

```
LoginScreen (소셜/이메일 로그인)
    ↓ setAuth() → hasAuth: true
OnboardingScreen (닉네임 + 관심사 3개)
    ↓ setLoggedIn() → isLoggedIn: true
AppTabs (홈 | 채팅 | 내정보)
    ↓ 매칭 시작하기 버튼
레이더 애니메이션 (Socket.io join_queue)
    ↓ match_found 이벤트
ChatScreen (실시간 채팅)
```

---

## 핵심 상태 (Zustand Store)

```typescript
// src/store/index.ts
{
  // 인증
  hasAuth: boolean           // 소셜/이메일 로그인 완료
  authProvider: 'google'|'kakao'|'naver'|'email'|'apple'|null
  isLoggedIn: boolean        // 온보딩 완료

  // 유저
  user: { id, nickname, interests[], regionGu, regionLabel } | null

  // 매칭
  peer: { nick, interests[], region, roomId, distanceKm? } | null
  roomId: string | null

  // 프리미엄
  isPremium: boolean
  matchCountThisHour: number  // 무료: 10회/시간, 프리미엄: 30회/시간
  customRegionGu: string      // 프리미엄 전용 커스텀 지역

  // GPS
  userLat: number | null
  userLng: number | null
}
```

---

## 매칭 알고리즘 (서버)

```javascript
// server/index.js — calcMatchScore()
매칭 점수 = 관심사 공통(최대+45) + 같은구(+20) + 프리미엄(+20)
           + 대기시간 1분당(+1, 최대+15) - 재매칭 페널티(-30)

거리 제한:
  무료: 6km 이내 (GPS 없으면 같은 구)
  프리미엄: 거리 제한 없음 + 커스텀 지역 설정 가능
```

---

## 소셜 로그인 설정

| 플랫폼 | 키 위치 | 상태 |
|--------|--------|------|
| Apple | 네이티브 (expo-apple-authentication) | ✅ 연동 완료 |
| Google | LoginScreen.tsx `GOOGLE_CLIENT_ID` | ✅ 연동 완료 |
| Kakao | LoginScreen.tsx `KAKAO_REST_KEY` | ✅ 연동 완료 |
| Naver | LoginScreen.tsx `NAVER_CLIENT_ID` | ✅ 연동 완료 |

---

## 유료화 구조

```
무료 플랜:
  - 매칭 10회/시간
  - 현재 위치 6km 이내만 매칭
  - 채팅 종료 시 대화 내역 삭제

프리미엄 플랜 (₩5,900/월):
  - 매칭 30회/시간
  - 원하는 지역 자유 설정
  - 채팅 이전 대화 저장/복원 (최대 200개)
  - 상대방과의 거리 표시
  - 우선 매칭 (큐 상위 배치)

IAP 상품 ID:
  locotalk.premium.monthly  ← ₩5,900/월
  locotalk.premium.yearly   ← ₩59,900/년
```

---

## 서버 실행

```bash
# 프로덕션 서버 (Railway)
https://locotalk-production.up.railway.app

# 로컬 서버 시작
node server/index.js  # port 4000

# 헬스체크
curl http://localhost:4000/health

# 이메일 OTP (Resend 연동)
POST /auth/send-otp   { email, code }
POST /auth/verify-otp { email, code }
```

---

## 개발 환경 실행

```bash
# Metro 번들러 시작
npx expo start --port 8081

# iOS 시뮬레이터 빌드 (iPhone 17 Pro, UDID: B7963F40-B51F-4BA0-B0B5-6ACBBA7DFF3A)
LANG=en_US.UTF-8 npx expo run:ios --device B7963F40-B51F-4BA0-B0B5-6ACBBA7DFF3A

# 핫 리로드
curl -X POST http://localhost:8081/reload

# EAS 프로덕션 빌드
npx eas-cli build --platform ios --profile production

# TypeScript 체크
npx tsc --noEmit
```

---

## 중요 규칙 / 컨벤션

### 색상
- Primary: `#40D3B6` (티얼)
- 버튼/활성화: `#034A93` (네이비)
- 배경: `#ECFDF5`

### 컴포넌트 패턴
- SVG 아이콘은 각 파일 내 inline 함수로 정의
- 스타일은 파일 하단 `StyleSheet.create()` 한 곳에 모음
- 다국어: `useT()` 훅 사용, 새 문자열은 반드시 `src/i18n/index.ts`에 ko/en 동시 추가

### 네이티브 빌드 필요한 경우
새 네이티브 모듈 설치 시:
```bash
cd ios && LANG=en_US.UTF-8 pod install
LANG=en_US.UTF-8 npx expo run:ios --device ...
```

### 소셜 로그인 개발 테스트
로그인 화면 하단 🛠 개발자 테스트 버튼 사용:
- ⭐ 프리미엄 계정: `isPremium: true`, 닉네임 '프리미엄유저'
- 👤 일반 계정: `isPremium: false`, 닉네임 '일반유저'

---

## 외부 서비스

| 서비스 | 용도 | 계정 |
|--------|------|------|
| App Store Connect | 앱 배포/심사 | calendar03dean@gmail.com |
| EAS (expo.dev) | 클라우드 빌드 | @calendar808 |
| Resend | 이메일 OTP | API Key: re_LKSuS8YL_... |
| GitHub | 코드 저장소 | calendar03dean-blip/locotalk |

---

## 현재 상태 (2026-06)

- ✅ App Store 심사 제출 완료 (v1.0.0 build 2)
- ✅ TestFlight 배포 (build 4 — 소셜 로그인 포함)
- ✅ 소셜 로그인 4종 (Apple/Google/Kakao/Naver) + 이메일 OTP
- ✅ 인앱 결제 연동 (react-native-iap)
- ✅ 매칭 알고리즘 (관심사 점수 + 거리 필터 + 프리미엄 우선)
- ✅ 채팅 저장 프리미엄 전용
- ✅ 신고 기능
- ✅ 지역 선택 피커 (프리미엄)
- 🔄 진행 중: 앱 심사 대기

---

## Notion 로깅 프로토콜 (필수)

> 작업 완료 시, 버그 수정 시, A↔B 메시지 전송 시 **반드시** 아래 명령어로 Notion에 기록할 것.

### 작업 완료 후 — 작업로그 등록
```bash
node scripts/notion-log.js work \
  "작업 제목" \
  "분류" \
  "무엇을 했는지 상세히" \
  "왜 이 작업이 필요했는지" \
  "소요 시간" \
  "commitHash"

# 분류: "✨ 기능" | "🚀 배포" | "🛠 도구" | "📋 협업" | "🎨 디자인" | "🔧 수정"
```

### 버그 수정 완료 후 — 버그 목록 업데이트
```bash
# 버그 수정 시
node scripts/notion-bug.js fix "버그 제목" "수정 내용" "commitHash"

# 재테스트 완료 시
node scripts/notion-bug.js done "버그 제목" "테스트 결과"
```

### A↔B 메시지 전송 시 — AB 커뮤니케이션 보드 등록
```bash
node scripts/notion-log.js msg \
  "메시지 제목" \
  "유형" \
  "수신자(클로드A 또는 클로드B)" \
  "메시지 내용" \
  "관련 commitHash(없으면 생략)"

# 유형: "🐛 버그 보고" | "✅ 버그 수정 완료" | "🔔 작업 완료 알림" | "📌 작업 요청" | "❓ 확인 요청" | "📢 공지"
```

### 세션 시작 시 체크리스트 (클로드A)
```bash
git pull origin main                 # 최신 코드
node scripts/notion-bug.js list      # 미수정 버그 확인
```

---

## A↔B 협업 프로토콜

### 클로드B (테스터) 역할
```bash
# 1. 최신 코드 가져오기
git pull origin main

# 2. 앱 실행 후 테스트

# 3. 버그 발견 시 BUGS.md에 추가 후 push
git add BUGS.md
git commit -m "bug: [BUG-001] 버그 제목"
git push
```

### 클로드A (개발자) 역할
```bash
# 1. BUGS.md 확인
cat BUGS.md

# 2. 버그 수정 후 상태 업데이트
git add .
git commit -m "fix: [BUG-001] 수정 내용"
git push
# → BUGS.md에 상태를 🟢 수정완료 로 변경 + commit hash 기록
```

### 사이클
```
B: 테스트 → BUGS.md 버그 등록 → push
A: pull → 수정 → BUGS.md 업데이트 → push  
B: pull → 재테스트 → BUGS.md 결과 업데이트
반복 → 모든 버그 ✅ 확인됨 시 완료
```

---

## 주의사항

1. `src/store/index.ts`의 `isLoggedIn`, `hasAuth` 초기값은 반드시 `false`/`false`
2. 스크린샷 촬영 시 임시로 바꿨다가 **반드시 원복** 필요
3. `server/index.js`는 인메모리 상태 — 재시작 시 큐/룸 초기화됨 (pushTokens/feeds는 data.json 유지)
4. `react-native-iap` 구매 완료는 `purchaseUpdatedListener`에서 비동기 처리
5. `initialRouteName`은 항상 `"홈"` 유지

### ⛔ 절대 수정 금지 파일
- **`src/navigation/RootNavigator.tsx`** — 앱 전체 네비게이션 흐름 핵심. 잘못 수정 시 전체 화면 전환 불가
- **`App.tsx`** — 앱 진입점. 잘못 수정 시 앱 시작 불가

### ✅ npm install 후 필수 확인 패키지
```bash
# 아래 패키지가 node_modules에 정상 존재하는지 반드시 확인
node -e "require('react-native-iap')"
node -e "require('@react-native-google-signin/google-signin')"
node -e "require('@react-native-kakao/user')"

# 없으면 설치
npm install react-native-iap @react-native-google-signin/google-signin @react-native-kakao/user @react-native-kakao/core
```
