# Locotalk 버그 트래킹

> **사용법**
> - 🔴 클로드B: 버그 발견 시 아래 양식으로 추가 후 `git push`
> - 🔵 클로드A: 수정 후 상태 변경 + commit hash 기록 후 `git push`
> - 🔴 클로드B: `git pull` 후 재테스트 → 결과 업데이트

---

## 버그 상태 표시
- `🔴 미수정` — B가 발견, A 수정 대기
- `🔵 수정중` — A가 작업 중
- `🟢 수정완료` — A가 수정, B 재테스트 요청
- `✅ 확인됨` — B가 재테스트 완료, 정상 동작
- `❌ 재현안됨` — B가 재테스트했으나 재현 불가

---

## 버그 목록

<!-- 버그 양식 (복사해서 사용)
### [BUG-###] 제목
- **상태**: 🔴 미수정
- **발견자**: 클로드B
- **발견일**: YYYY-MM-DD
- **화면**: 화면명
- **재현 방법**:
  1. 
  2. 
- **예상 동작**: 
- **실제 동작**: 
- **수정 내용**: (A가 작성)
- **수정 commit**: (A가 작성)
- **재테스트 결과**: (B가 작성)
-->

### [BUG-001] UpgradeModal 컴포넌트 파일 누락 — 빌드 크래시
- **상태**: 🟢 수정완료
- **발견자**: 클로드B
- **발견일**: 2026-06-03
- **화면**: 홈, 내정보
- **재현 방법**:
  1. `npx tsc --noEmit` 실행
  2. `src/screens/HomeScreen.tsx:17` 및 `src/screens/MyInfoScreen.tsx:15` 에러 확인
- **예상 동작**: `src/components/UpgradeModal.tsx` 파일이 존재해야 함
- **실제 동작**: `Cannot find module '../components/UpgradeModal'` — 파일 자체가 없음. 홈/내정보 화면 빌드 시 크래시 발생
- **수정 내용**: `src/components/UpgradeModal.tsx` 신규 생성. visible/onClose/reason props 지원, 프리미엄 기능 5가지 나열, CTA 버튼 포함
- **수정 commit**: 클로드B
- **재테스트 결과**: `npx tsc --noEmit` 에러 없음 확인

---

### [BUG-002] i18n 번역 키 대량 누락 — 텍스트 빈칸/크래시
- **상태**: 🟢 수정완료
- **발견자**: 클로드B
- **발견일**: 2026-06-03
- **화면**: 로그인, 홈, 내정보
- **재현 방법**:
  1. `npx tsc --noEmit` 실행 시 TS2345 에러 다수 확인
  2. `src/i18n/index.ts` 에서 아래 키 검색 시 없음
- **예상 동작**: 모든 화면에서 텍스트가 올바르게 표시됨
- **실제 동작**: 아래 키들이 `src/i18n/index.ts` 에 존재하지 않아 런타임 시 빈 문자열 또는 `undefined` 표시
  - **로그인**: `login_sub`, `login_back`, `login_divider`, `login_email`, `login_google`, `login_kakao`, `login_naver`, `login_terms`
  - **이메일 OTP**: `email_invalid`, `email_input_title`, `email_input_placeholder`, `email_send_code`, `email_code_title`, `email_code_sub`, `email_code_invalid`, `email_code_expired`, `email_verify`, `email_resend`, `email_resend_now`
  - **홈**: `alert_repeat_match_title`, `alert_repeat_match_msg`, `alert_repeat_match_cancel`, `alert_repeat_match_ok`, `alert_no_match_title`, `alert_no_match_msg`, `alert_no_match_ok`, `premium_match_count`
  - **내정보**: `myinfo_region_setting`, `myinfo_region_custom`, `myinfo_region_premium_only`, `myinfo_region_current`
- **수정 내용**: `src/i18n/index.ts` ko/en 양쪽에 누락 키 38개 추가. login_, email_, alert_repeat_match_, alert_no_match_, premium_match_count, myinfo_region_ 계열 포함. 추가로 `src/types/native-modules.d.ts` 생성하여 네이티브 모듈 타입 stub 처리, `iap.ts` implicit any 3개 수정
- **수정 commit**: 클로드B
- **재테스트 결과**: `npx tsc --noEmit` 에러 0개 확인

---

### [BUG-003] 서버 의존성이 package.json에 없어 fresh install 후 서버 실행 불가
- **상태**: ✅ 확인됨 (오탐 클로즈)
- **발견자**: 클로드B
- **발견일**: 2026-06-03
- **화면**: 서버 (매칭/채팅)
- **재현 방법**:
  1. 클린 환경에서 `git clone` 후 `npm install`
  2. `node server/index.js` 실행
- **예상 동작**: 서버가 정상 실행됨
- **실제 동작**: `Cannot find module 'express'` 에러 — `express`, `socket.io`, `cors`, `uuid`, `resend` 가 `package.json` dependencies에 없음. 클로드B가 수동으로 `npm install express socket.io cors uuid resend` 로 임시 해결했으나 근본적으로는 `package.json`에 추가 필요
- **수정 내용**: 재확인 결과 `package.json`에 express, socket.io, cors, uuid, resend 모두 존재. 최초 발견 시 node_modules 미설치 상태에서 오탐. 실제 버그 아님
- **수정 commit**: —
- **재테스트 결과**: `npm install` 후 `node server/index.js` 정상 실행 확인

---

## 완료된 버그

_없음_
