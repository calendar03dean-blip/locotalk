// server/pushtokens.js
// ─────────────────────────────────────────────────────────────────────────────
// Locotalk — 푸시 토큰 영속화(PostgreSQL, userId 기준)
//
// 배경(진단): 기존 인메모리 pushTokensByNick(nick→token) + data.json 은
//   ① data.json 이 git 추적+볼륨 없음 → 배포마다 스테일 토큰으로 리셋(토큰 소실)
//   ② 닉 단독 키 → 같은 닉이면 마지막 기기로 덮어쓰기 → 한 기기만 수신(나머지 무음)
// 해결: 토큰을 DB 에 user_id 기준 저장 → 재배포 생존 + 닉 충돌 제거.
//
// 설계 원칙(chat.js/legal.js 동일): best-effort — DB 실패해도 흐름 안 막음.
//   인메모리 pushTokensByNick 은 당장 유지(폴백). 발송은 DB(userId) 우선.
//
// 연동(server/index.js):
//   initDB()            → pushtokens.initPushTokenSchema(db)
//   register_push_token → pushtokens.upsertPushToken(db, { userId, token, nick, platform })
//   sendPushToNick      → pushtokens.getTokenByUserId(db, recipientUserId) || 인메모리 폴백
//   sendMatchRequestPush→ 동일
//   DELETE /users/:id   → pushtokens.deleteByUserId(db, userId)  (탈퇴 시 토큰 제거)
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

async function initPushTokenSchema(db) {
  if (!db) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        user_id    TEXT PRIMARY KEY,          -- 유저 1인 1토큰(같은 계정 다기기는 마지막 기기)
        token      TEXT NOT NULL,             -- ExponentPushToken
        nick       TEXT,
        platform   TEXT,                       -- ios | android
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_pushtok_token ON push_tokens(token);`);
    console.log('[push] ✅ push_tokens 스키마 준비 완료');
  } catch (e) {
    console.error('[push] initPushTokenSchema 실패:', e.message);
  }
}

/** 토큰 upsert (user_id 기준 — 같은 유저는 최신 토큰으로 덮어씀 = 기기 변경/토큰 갱신 반영) */
async function upsertPushToken(db, { userId, token, nick, platform } = {}) {
  if (!db || !userId || !token) return false;
  try {
    await db.query(
      `INSERT INTO push_tokens (user_id, token, nick, platform, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (user_id) DO UPDATE SET
         token = EXCLUDED.token,
         nick = COALESCE(EXCLUDED.nick, push_tokens.nick),
         platform = COALESCE(EXCLUDED.platform, push_tokens.platform),
         updated_at = now()`,
      [userId, token, nick || null, platform || null]
    );
    return true;
  } catch (e) {
    console.warn('[push] upsertPushToken failed (best-effort):', e.message);
    return false;
  }
}

/** 수신자 userId 로 토큰 조회 (없으면 null — 호출부에서 인메모리 폴백) */
async function getTokenByUserId(db, userId) {
  if (!db || !userId) return null;
  try {
    const { rows } = await db.query('SELECT token FROM push_tokens WHERE user_id = $1', [userId]);
    return rows[0]?.token || null;
  } catch (e) {
    console.warn('[push] getTokenByUserId failed:', e.message);
    return null;
  }
}

/** 탈퇴/정리 시 토큰 삭제 (삭제된 계정에 푸시 방지) */
async function deleteByUserId(db, userId) {
  if (!db || !userId) return;
  try { await db.query('DELETE FROM push_tokens WHERE user_id = $1', [userId]); }
  catch (e) { console.warn('[push] deleteByUserId failed:', e.message); }
}

module.exports = { initPushTokenSchema, upsertPushToken, getTokenByUserId, deleteByUserId };
