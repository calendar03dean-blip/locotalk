#!/usr/bin/env node
/**
 * Locotalk Notion 통합 로깅 CLI
 *
 * ─── 작업로그 (클로드A/B 작업 완료 시) ────────────────────────────────
 *   node scripts/notion-log.js work  "작업제목" "분류" "작업내용" "작업목적" "소요시간" "commitHash"
 *
 *   분류 옵션: "✨ 기능" | "🚀 배포" | "🛠 도구" | "📋 협업" | "🎨 디자인" | "🔧 수정"
 *
 *   예시:
 *   node scripts/notion-log.js work \
 *     "로그인 화면 애니메이션 개선" \
 *     "✨ 기능" \
 *     "fade-in 트랜지션 추가, 버튼 ripple 효과 구현" \
 *     "UX 개선으로 첫인상 품질 향상" \
 *     "약 1시간" \
 *     "abc1234"
 *
 * ─── AB 커뮤니케이션 보드 (A↔B 메시지 전송 시) ──────────────────────
 *   node scripts/notion-log.js msg "메시지제목" "유형" "수신자" "내용" ["commitHash"]
 *
 *   유형 옵션: "🐛 버그 보고" | "✅ 버그 수정 완료" | "🔔 작업 완료 알림" | "📌 작업 요청" | "❓ 확인 요청" | "📢 공지"
 *   발신자:   자동 감지 (git config user.name 기준 — 클로드A/클로드B)
 *
 *   예시:
 *   node scripts/notion-log.js msg \
 *     "[BUG-004] 채팅 전송 버튼 비활성화 안됨" \
 *     "🐛 버그 보고" \
 *     "클로드A" \
 *     "peerGone 상태에서도 전송 버튼 활성화됨. 재현: 상대방 나간 후 입력창 탭" \
 *     "abc1234"
 *
 * ─── 버그 목록 ─────────────────────────────────────────────────────────
 *   기존 notion-bug.js 사용 (변경 없음)
 *   node scripts/notion-bug.js add / fix / done / list
 */

const fs   = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../.env.notion');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) process.env[k.trim()] = v.trim();
  });
}

const TOKEN = process.env.NOTION_TOKEN;
if (!TOKEN) {
  console.error('❌ .env.notion 파일에 NOTION_TOKEN을 설정하세요.');
  process.exit(1);
}

const WORK_DB = '3742649b-377d-803e-b7dd-d0c5d56d49ba'; // 📋 작업 로그
const AB_DB   = '3742649b-377d-8087-8362-e44fefd84ee1'; // 🤝 AB 커뮤니케이션 보드

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

// git config에서 작업자 자동 감지
function detectAuthor() {
  try {
    const { execSync } = require('child_process');
    const name = execSync('git config user.name', { encoding: 'utf8' }).trim();
    if (name === 'Claude B') return '클로드B';
    if (name === 'Claude A') return '클로드A';
    return name || '클로드A';
  } catch {
    return '클로드A';
  }
}

// ── 작업로그 등록 ──────────────────────────────────────────────────────
async function addWorkLog(title, type, content, purpose, duration, commit) {
  const author = detectAuthor();
  const now    = new Date().toISOString();

  const r = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST', headers,
    body: JSON.stringify({
      parent: { database_id: WORK_DB },
      properties: {
        '작업 제목': { title:     [{ text: { content: title } }] },
        '작업자':    { select:    { name: author } },
        '분류':      { select:    { name: type } },
        '작업 일시': { date:      { start: now } },
        '소요 시간': { rich_text: [{ text: { content: duration } }] },
        '작업 내용': { rich_text: [{ text: { content: content } }] },
        '작업 목적': { rich_text: [{ text: { content: purpose } }] },
        'Commit':    { rich_text: [{ text: { content: commit || '' } }] },
      },
    }),
  });

  const d = await r.json();
  if (d.object === 'page') {
    console.log(`✅ 작업로그 등록!`);
    console.log(`   작업자: ${author} | 분류: ${type}`);
    console.log(`   제목: ${title}`);
    console.log(`   일시: ${new Date(now).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
  } else {
    console.error('❌ 등록 실패:', d.message);
  }
}

// ── AB 커뮤니케이션 메시지 등록 ───────────────────────────────────────
async function addMessage(title, type, receiver, content, commit) {
  const sender = detectAuthor();
  const now    = new Date().toISOString();

  const r = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST', headers,
    body: JSON.stringify({
      parent: { database_id: AB_DB },
      properties: {
        '메시지 제목': { title:     [{ text: { content: title } }] },
        '발신자':      { select:    { name: sender } },
        '수신자':      { rich_text: [{ text: { content: receiver } }] },
        '유형':        { select:    { name: type } },
        '전송 일시':   { date:      { start: now } },
        '채널':        { rich_text: [{ text: { content: 'Notion 자동 기록' } }] },
        '메시지 내용': { rich_text: [{ text: { content: content } }] },
        '관련 Commit': { rich_text: [{ text: { content: commit || '' } }] },
      },
    }),
  });

  const d = await r.json();
  if (d.object === 'page') {
    console.log(`✅ AB 보드 메시지 등록!`);
    console.log(`   ${sender} → ${receiver} | ${type}`);
    console.log(`   제목: ${title}`);
    console.log(`   일시: ${new Date(now).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
  } else {
    console.error('❌ 등록 실패:', d.message);
  }
}

// ── CLI ───────────────────────────────────────────────────────────────
const [,, cmd, ...args] = process.argv;

(async () => {
  switch (cmd) {
    case 'work':
      if (args.length < 5) {
        console.log('사용법: node scripts/notion-log.js work "제목" "분류" "작업내용" "작업목적" "소요시간" ["commit"]');
        break;
      }
      await addWorkLog(args[0], args[1], args[2], args[3], args[4], args[5] || '');
      break;

    case 'msg':
      if (args.length < 4) {
        console.log('사용법: node scripts/notion-log.js msg "제목" "유형" "수신자" "내용" ["commit"]');
        break;
      }
      await addMessage(args[0], args[1], args[2], args[3], args[4] || '');
      break;

    default:
      console.log(`
Locotalk Notion 통합 로깅 CLI

사용법:
  작업로그:  node scripts/notion-log.js work  "제목" "분류" "작업내용" "작업목적" "소요시간" ["commit"]
  AB 메시지: node scripts/notion-log.js msg   "제목" "유형" "수신자" "내용" ["commit"]

분류: "✨ 기능" | "🚀 배포" | "🛠 도구" | "📋 협업" | "🎨 디자인" | "🔧 수정"
유형: "🐛 버그 보고" | "✅ 버그 수정 완료" | "🔔 작업 완료 알림" | "📌 작업 요청" | "❓ 확인 요청" | "📢 공지"

버그 목록: node scripts/notion-bug.js add/fix/done/list
      `);
  }
})();
