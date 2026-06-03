#!/usr/bin/env node
/**
 * Locotalk Notion 버그 트래커 CLI
 *
 * 사용법:
 *   node scripts/notion-bug.js add    "버그 제목" "화면" "심각도" "재현방법"
 *   node scripts/notion-bug.js fix    "버그 제목 또는 ID" "수정내용" "commitHash"
 *   node scripts/notion-bug.js done   "버그 제목 또는 ID" "테스트결과"
 *   node scripts/notion-bug.js list
 *
 * 예시:
 *   node scripts/notion-bug.js add "로그인 버튼 안눌림" "로그인" "🔥 긴급" "이메일 입력 후 버튼 탭"
 *   node scripts/notion-bug.js fix "로그인 버튼 안눌림" "버튼 이벤트 핸들러 수정" "abc1234"
 *   node scripts/notion-bug.js done "로그인 버튼 안눌림" "정상 동작 확인"
 */

// .env.notion 파일에서 환경변수 로드
const fs   = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../.env.notion');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) process.env[k.trim()] = v.trim();
  });
}

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DB_ID        = process.env.NOTION_BUG_DB_ID;

if (!NOTION_TOKEN || !DB_ID) {
  console.error('❌ .env.notion 파일에 NOTION_TOKEN, NOTION_BUG_DB_ID를 설정하세요.');
  process.exit(1);
}
const BASE_URL     = 'https://api.notion.com/v1';

const headers = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

async function notionFetch(path, method = 'GET', body = null) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ── 버그 추가 (클로드B 사용) ─────────────────────────────────────────
async function addBug(title, screen, severity, steps) {
  const data = await notionFetch('/pages', 'POST', {
    parent: { database_id: DB_ID },
    properties: {
      '버그 제목': { title: [{ text: { content: title } }] },
      '상태':     { select: { name: '🔴 미수정' } },
      '담당':     { select: { name: '클로드A' } },
      '화면':     { select: { name: screen } },
      '심각도':   { select: { name: severity } },
      '발견일':   { date: { start: new Date().toISOString().split('T')[0] } },
      '재현 방법':{ rich_text: [{ text: { content: steps } }] },
    },
  });

  if (data.object === 'page') {
    console.log(`✅ 버그 등록 완료!`);
    console.log(`   제목: ${title}`);
    console.log(`   화면: ${screen} | 심각도: ${severity}`);
    console.log(`   상태: 🔴 미수정 → 클로드A 수정 대기`);
  } else {
    console.error('❌ 등록 실패:', data.message);
  }
}

// ── 버그 수정 완료 (클로드A 사용) ────────────────────────────────────
async function fixBug(titleQuery, fixContent, commitHash) {
  const pageId = await findBugPage(titleQuery);
  if (!pageId) return;

  await notionFetch(`/pages/${pageId}`, 'PATCH', {
    properties: {
      '상태':        { select: { name: '🟢 수정완료' } },
      '담당':        { select: { name: '클로드B' } },
      '수정 내용':   { rich_text: [{ text: { content: fixContent } }] },
      '수정 commit': { rich_text: [{ text: { content: commitHash } }] },
    },
  });

  console.log(`✅ 수정 완료 기록!`);
  console.log(`   내용: ${fixContent}`);
  console.log(`   commit: ${commitHash}`);
  console.log(`   상태: 🟢 수정완료 → 클로드B 재테스트 요청`);
}

// ── 테스트 결과 업데이트 (클로드B 사용) ──────────────────────────────
async function updateTestResult(titleQuery, result, passed = true) {
  const pageId = await findBugPage(titleQuery);
  if (!pageId) return;

  const status = passed ? '✅ 확인됨' : '🔴 미수정';

  await notionFetch(`/pages/${pageId}`, 'PATCH', {
    properties: {
      '상태':      { select: { name: status } },
      '담당':      { select: { name: passed ? '클로드A' : '클로드A' } },
      '수정 내용': { rich_text: [{ text: { content: result } }] },
    },
  });

  console.log(`✅ 테스트 결과 업데이트!`);
  console.log(`   결과: ${result}`);
  console.log(`   상태: ${status}`);
}

// ── 버그 목록 조회 ────────────────────────────────────────────────────
async function listBugs() {
  const data = await notionFetch(`/databases/${DB_ID}/query`, 'POST', {
    sorts: [{ property: '발견일', direction: 'descending' }],
  });

  if (!data.results?.length) {
    console.log('📋 등록된 버그가 없습니다.');
    return;
  }

  console.log(`\n📋 Locotalk 버그 목록 (총 ${data.results.length}개)\n`);
  console.log('─'.repeat(60));

  for (const page of data.results) {
    const p = page.properties;
    const title    = p['버그 제목']?.title?.[0]?.plain_text || '(제목없음)';
    const status   = p['상태']?.select?.name || '-';
    const screen   = p['화면']?.select?.name || '-';
    const severity = p['심각도']?.select?.name || '-';
    const assignee = p['담당']?.select?.name || '-';
    const date     = p['발견일']?.date?.start || '-';

    console.log(`${status} ${title}`);
    console.log(`   화면: ${screen} | 심각도: ${severity} | 담당: ${assignee} | ${date}`);
    console.log('');
  }
}

// ── 페이지 ID 검색 ────────────────────────────────────────────────────
async function findBugPage(titleQuery) {
  const data = await notionFetch(`/databases/${DB_ID}/query`, 'POST', {
    filter: {
      property: '버그 제목',
      title: { contains: titleQuery },
    },
  });

  if (!data.results?.length) {
    console.error(`❌ "${titleQuery}" 버그를 찾을 수 없어요.`);
    return null;
  }

  return data.results[0].id;
}

// ── CLI 진입점 ────────────────────────────────────────────────────────
const [,, cmd, ...args] = process.argv;

(async () => {
  switch (cmd) {
    case 'add':
      await addBug(args[0], args[1] || '기타', args[2] || '📌 보통', args[3] || '');
      break;
    case 'fix':
      await fixBug(args[0], args[1] || '', args[2] || '');
      break;
    case 'done':
      await updateTestResult(args[0], args[1] || '', args[2] !== 'fail');
      break;
    case 'list':
      await listBugs();
      break;
    default:
      console.log(`
사용법:
  node scripts/notion-bug.js list
  node scripts/notion-bug.js add  "제목" "화면" "심각도" "재현방법"
  node scripts/notion-bug.js fix  "제목" "수정내용" "commitHash"
  node scripts/notion-bug.js done "제목" "테스트결과" [pass|fail]

화면: 로그인|온보딩|홈|채팅|내정보|매칭|기타
심각도: 🔥 긴급|⚠️ 높음|📌 보통|💬 낮음
      `);
  }
})();
