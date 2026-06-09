// server/reports.js
// ─────────────────────────────────────────────────────────────────────────────
// Locotalk — 신고 영속화(PostgreSQL)
//
// 배경: 기존 report_user 는 인메모리 reportCounts(닉→횟수)만 증가 → 누가 왜 신고했는지,
//   당시 대화 맥락이 안 남아 운영 대응 불가. reports 테이블에 사유 + 서버구성 스냅샷 저장.
//
// 원칙(chat.js/pushtokens.js 동일): DB가 source of truth, best-effort — DB 실패해도
//   기존 신고 흐름(카운트/경고)을 막지 않는다. 스냅샷은 '서버가' 구성(클라 전달값 미신뢰).
//
// 연동(server/index.js):
//   initDB()       → reports.initReportSchema(db)
//   report_user    → reports.insertReport(db, { reporterId, reportedUserId, reportedNick,
//                                                conversationId, reason, snapshot })
//   /admin·/debug  → reports.listReports / statsReports
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

// 사유 화이트리스트 — 외부값은 'other' 로 정규화(위변조·임의문자열 차단)
const REASONS = ['spam', 'harassment', 'sexual', 'scam', 'other'];
const REASON_SET = new Set(REASONS);
function normalizeReason(r) {
  return REASON_SET.has(String(r)) ? String(r) : 'other';
}

async function initReportSchema(db) {
  if (!db) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id               BIGSERIAL PRIMARY KEY,
        reporter_id      TEXT,
        reported_user_id TEXT,
        reported_nick    TEXT,
        conversation_id  TEXT,
        reason           TEXT NOT NULL,
        snapshot         TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_reports_created  ON reports(created_at DESC);`);
    console.log('[report] ✅ reports 스키마 준비 완료');
  } catch (e) {
    console.error('[report] initReportSchema 실패:', e.message);
  }
}

/** 신고 1건 저장 (best-effort). reason 은 화이트리스트로 정규화. */
async function insertReport(db, { reporterId, reportedUserId, reportedNick, conversationId, reason, snapshot } = {}) {
  if (!db) return false;
  try {
    await db.query(
      `INSERT INTO reports (reporter_id, reported_user_id, reported_nick, conversation_id, reason, snapshot)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [reporterId || null, reportedUserId || null, reportedNick || null,
       conversationId || null, normalizeReason(reason), snapshot || null]
    );
    return true;
  } catch (e) {
    console.warn('[report] insertReport failed (best-effort):', e.message);
    return false;
  }
}

/** 신고 목록(최신순) — 관리자 조회용 */
async function listReports(db, { limit = 100 } = {}) {
  if (!db) return [];
  try {
    const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const { rows } = await db.query(
      `SELECT id, reporter_id, reported_user_id, reported_nick, conversation_id, reason, snapshot, created_at
         FROM reports ORDER BY created_at DESC LIMIT $1`,
      [lim]
    );
    return rows;
  } catch (e) {
    console.warn('[report] listReports failed:', e.message);
    return [];
  }
}

async function statsReports(db) {
  if (!db) return { count: 0, byReason: {} };
  try {
    const c = await db.query('SELECT COUNT(*)::int n FROM reports');
    const r = await db.query('SELECT reason, COUNT(*)::int n FROM reports GROUP BY reason');
    const byReason = {}; r.rows.forEach(x => { byReason[x.reason] = x.n; });
    return { count: c.rows[0].n, byReason };
  } catch (e) {
    return { count: 0, byReason: {}, error: e.message };
  }
}

module.exports = { REASONS, normalizeReason, initReportSchema, insertReport, listReports, statsReports };
