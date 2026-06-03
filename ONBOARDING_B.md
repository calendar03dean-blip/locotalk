# 클로드B 온보딩 가이드 👋

> 이 파일을 읽으면 Locotalk 프로젝트 협업을 즉시 시작할 수 있습니다.

---

## 역할
- **클로드A** (개발자) — 기능 개발, 버그 수정
- **클로드B (당신)** — 테스트, 버그 발견 및 보고, 재확인

---

## 1. 저장소 클론

```bash
git clone https://github.com/calendar03dean-blip/locotalk.git
cd locotalk
npm install
```

---

## 2. Notion 버그 트래커 설정

```bash
# .env.notion 파일 생성 (클로드A에게 토큰 값 받아서 입력)
cat > .env.notion << 'EOF'
NOTION_TOKEN=<클로드A에게 받은 토큰>
NOTION_BUG_DB_ID=3742649b377d803eb7ddd0c5d56d49ba
EOF
```

**Notion 버그 트래킹 페이지:**
👉 https://app.notion.com/p/3742649b377d803eb7ddd0c5d56d49ba

---

## 3. 협업 명령어

### 버그 발견 시 (B → A)
```bash
# 최신 코드 먼저 가져오기
git pull origin main

# 버그 등록
node scripts/notion-bug.js add "버그 제목" "화면" "심각도" "재현방법"

# 화면: 로그인 | 온보딩 | 홈 | 채팅 | 내정보 | 매칭 | 기타
# 심각도: 🔥 긴급 | ⚠️ 높음 | 📌 보통 | 💬 낮음
```

### A가 수정했다고 하면 (재테스트)
```bash
git pull origin main
# 앱 테스트 후

# 통과 시
node scripts/notion-bug.js done "버그 제목" "정상 동작 확인"

# 실패 시
node scripts/notion-bug.js done "버그 제목" "여전히 발생 — 재현 방법 상세" fail
```

### 현재 버그 목록 확인
```bash
node scripts/notion-bug.js list
```

---

## 4. 앱 실행 (테스트용)

```bash
# Metro 번들러
npx expo start --port 8081

# 서버 (매칭/채팅 테스트 시 필요)
node server/index.js

# 서버 상태 확인
curl http://localhost:4000/health
```

**테스트 계정 (로그인 화면 하단):**
- ⭐ 프리미엄 계정 버튼 → 즉시 진입
- 👤 일반 계정 버튼 → 즉시 진입

---

## 5. 주요 테스트 항목

- [ ] 로그인 (Apple / Google / 카카오 / 네이버 / 이메일)
- [ ] 온보딩 (닉네임 → 관심사 → 홈)
- [ ] 매칭 시작하기 → 레이더 애니메이션
- [ ] 채팅 (메시지 전송/수신, 나가기)
- [ ] 프리미엄 업그레이드 모달
- [ ] 지역 선택 (프리미엄)
- [ ] 신고/차단 기능
- [ ] 내 정보 (관심사 변경, 토글)

---

## 6. 텔레그램 알림 설정 (작업 완료 시 자동 알림)

Claude Code 작업이 끝날 때마다 텔레그램으로 알림이 와요.
아래 명령어를 터미널에서 실행해서 설정하세요:

```bash
cat > ~/.claude/settings.json << 'EOF'
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "timeout": 5,
            "command": "pgrep caffeinate > /dev/null 2>&1 || { nohup caffeinate -d -i </dev/null >/dev/null 2>&1 & disown $!; }; exit 0"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "timeout": 15,
            "command": "pkill caffeinate 2>/dev/null; nohup curl -s --max-time 8 -X POST \"https://api.telegram.org/bot<BOT_TOKEN>/sendMessage\" -d \"chat_id=<CHAT_ID>&text=%E2%9C%85%20Claude+%EC%9E%91%EC%97%85+%EC%99%84%EB%A3%8C%0A%ED%99%95%EC%9D%B8%ED%95%B4%EC%A3%BC%EC%84%B8%EC%9A%94!\" </dev/null >/dev/null 2>&1 & disown $!; exit 0"
          }
        ]
      }
    ]
  }
}
EOF
```

> ✅ 설정 후 Claude Code 재시작하면 작업 완료 시 텔레그램 알림이 와요.

---

## 7. 전체 프로젝트 맥락

👉 `CLAUDE.md` 파일에 모든 기술 스택, 구조, 규칙이 정리되어 있습니다.
새 세션 시작 시 Claude Code가 자동으로 읽습니다.

---

## 사이클 요약

```
B: git pull → 테스트 → notion-bug add → A에게 알림
A: git pull → 수정 → notion-bug fix → B에게 알림
B: git pull → 재테스트 → notion-bug done
반복 → 모든 버그 ✅ 확인됨
```
