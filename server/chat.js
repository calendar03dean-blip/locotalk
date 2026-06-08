// server/chat.js
// ─────────────────────────────────────────────────────────────────────────────
// Locotalk — 채팅 영속화 + 차등 보관기간 모듈
//
// 목적: 인메모리 chatLogs(휘발) → PostgreSQL 영속화. 앱/서버 재시작에도 대화 유지.
// 보관 정책 (저장 ≠ 열람):
//   · 물리 보관(삭제):  무료-무료 대화 = 7일 후 삭제 / 프리미엄이 한 명이라도 끼면 = 90일 후 삭제
//   · 열람(가시성):     요청자 등급 기준 read-time 필터 — 프리미엄 = 최근 90일 / 무료 = 최근 7일
//     → 프리미엄↔무료 대화: 데이터는 90일 보관되지만, 무료 유저 화면엔 최근 7일만 노출.
//       (무료 유저가 업그레이드하면 보관돼 있던 90일치가 즉시 다시 보임 = 자연스러운 업셀 레버)
//   · 90일이 절대 상한 → 이후 전부 삭제. 보관 리스크는 90일로 한정(처리방침에 고지).
// 설계 원칙(legal.js와 동일): DB 부가기록은 best-effort — 실패해도 채팅 흐름을 막지 않는다.
//            진실의 원천(source of truth)은 DB. 소켓 rooms 인메모리는 "현재 연결" 캐시일 뿐.
//
// 연동 지점(server/index.js):
//   initDB()              → chat.initChatSchema(db)
//   createRoom()          → chat.upsertConversation(db, {...})
//   send_message/_image   → chat.persistMessage(db, {...}) 후 릴레이
//   read_message          → chat.markRead(db, messageId)
//   get_chat_history      → chat.getHistory(db, conversationId, { requesterIsPremium })
//   (신규) list_conversations → chat.listConversations(db, userId, { requesterIsPremium }) // "회원 활동 내역"
//   startRetentionCron()  → chat.purgeExpiredChats(db) 추가 호출
//   withdrawUser()        → chat.scrubUserFromChats(db, userId) 한 단계 추가
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');

const FREE_RETENTION_DAYS = 7;
const PREMIUM_RETENTION_DAYS = 90; // = 대화 단위 절대 상한(90일 넘은 메시지는 전부 삭제)

// ── 스키마 ───────────────────────────────────────────────────────────────────
async function initChatSchema(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id          TEXT PRIMARY KEY,             -- 기존 roomId 재사용
      user_a_id   TEXT,                          -- nullable: userId 없는 매칭도 best-effort 저장
      user_b_id   TEXT,                          -- (한쪽이 null이어도 conversation/messages는 저장됨)
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_msg_at TIMESTAMPTZ,
      status      TEXT NOT NULL DEFAULT 'active' -- active | left | closed
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id              BIGSERIAL PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id       TEXT,                      -- 탈퇴 시 비식별화로 NULL/해시 가능
      kind            TEXT NOT NULL,             -- 'text' | 'image'
      payload         TEXT NOT NULL,
      client_id       TEXT,                      -- 클라 dedupe 키(기존 로직 재사용)
      img_width       INTEGER,                   -- 이미지 원본 치수(history 왜곡 방지)
      img_height      INTEGER,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      read_at         TIMESTAMPTZ
    );
  `);
  // 기존 테이블에도 dims 컬럼 보강 (신규/기존 둘 다 안전)
  await db.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS img_width  INTEGER;`);
  await db.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS img_height INTEGER;`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_msg_created ON messages(created_at);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_conv_user_a ON conversations(user_a_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_conv_user_b ON conversations(user_b_id);`);
}

// ── 대화방 생성/갱신 (createRoom에서 호출) ──────────────────────────────────
async function upsertConversation(db, { roomId, userAId, userBId }) {
  try {
    await db.query(
      `INSERT INTO conversations (id, user_a_id, user_b_id, last_msg_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (id) DO UPDATE SET status = 'active'`,
      [roomId, userAId, userBId]
    );
  } catch (e) {
    console.warn('[chat] upsertConversation failed (best-effort):', e.message);
  }
}

// ── 메시지 영속화 (send_message / send_image에서 릴레이 직전/직후 호출) ───────
// 반환: { id, created_at } — 클라/버퍼가 서버 id를 쓸 수 있게. 실패 시 null.
async function persistMessage(db, { conversationId, senderId, kind, payload, clientId, width, height }) {
  try {
    const { rows } = await db.query(
      `INSERT INTO messages (conversation_id, sender_id, kind, payload, client_id, img_width, img_height)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [conversationId, senderId, kind, payload, clientId || null,
       Number.isFinite(width) ? width : null, Number.isFinite(height) ? height : null]
    );
    // 대화 최신 시각 갱신
    db.query(`UPDATE conversations SET last_msg_at = now() WHERE id = $1`, [conversationId])
      .catch(() => {});
    return rows[0] || null;
  } catch (e) {
    console.warn('[chat] persistMessage failed (best-effort):', e.message);
    return null; // 흐름 막지 않음 — 인메모리 버퍼/릴레이는 그대로 동작
  }
}

// 읽음 표시: read_message 의 messageId 는 클라가 만든 id(=client_id)이므로
// 서버 BIGSERIAL id 가 아니라 client_id 로 매칭. 같은 client_id 가 다른 방에 있을 수
// 있어 conversation_id 로 스코프.
async function markRead(db, { conversationId, clientId }) {
  if (!conversationId || !clientId) return;
  try {
    await db.query(
      `UPDATE messages SET read_at = now()
       WHERE conversation_id = $1 AND client_id = $2 AND read_at IS NULL`,
      [conversationId, clientId]
    );
  } catch (e) {
    console.warn('[chat] markRead failed (best-effort):', e.message);
  }
}

// ── 히스토리 조회 (get_chat_history에서 호출) ───────────────────────────────
// DB가 source of truth. 요청자 등급에 따라 가시 범위를 다르게: 프리미엄 90일 / 무료 7일.
// (프리미엄↔무료 대화는 90일 보관되지만, 무료 요청자에겐 최근 7일만 반환)
async function getHistory(db, conversationId, { requesterIsPremium = false, limit = 200 } = {}) {
  const windowDays = requesterIsPremium ? PREMIUM_RETENTION_DAYS : FREE_RETENTION_DAYS;
  try {
    // 최근 limit개를 가져온 뒤(ASC 정렬로 표시). ASC LIMIT면 오래된 200개가 잡혀 최근이 잘림.
    const { rows } = await db.query(
      `SELECT * FROM (
         SELECT id, sender_id, kind, payload, client_id, img_width, img_height, created_at, read_at
         FROM messages
         WHERE conversation_id = $1
           AND created_at >= now() - ($2 || ' days')::interval
         ORDER BY created_at DESC
         LIMIT $3
       ) sub ORDER BY created_at ASC`,
      [conversationId, windowDays, limit]
    );
    return rows;
  } catch (e) {
    console.warn('[chat] getHistory failed:', e.message);
    return [];
  }
}

// ── 대화 목록 (회원 활동 내역 — 신규 list_conversations 이벤트용) ────────────
async function listConversations(db, userId, { requesterIsPremium = false, limit = 100 } = {}) {
  const windowDays = requesterIsPremium ? PREMIUM_RETENTION_DAYS : FREE_RETENTION_DAYS;
  try {
    // 상대(peer) = 요청자 아닌 쪽. users JOIN으로 닉 보강(탈퇴/null이면 '(알 수 없음)').
    // preview = 마지막 메시지: 이미지면 '[사진]', 텍스트면 앞 120자(base64 통째 전송 방지).
    const { rows } = await db.query(
      `SELECT c.id, c.user_a_id, c.user_b_id, c.last_msg_at, c.status,
              COALESCE(pu.nickname, '(알 수 없음)') AS peer_nick,
              (SELECT CASE WHEN m.kind = 'image' THEN '[사진]' ELSE left(m.payload, 120) END
                 FROM messages m
                 WHERE m.conversation_id = c.id
                   AND m.created_at >= now() - ($2 || ' days')::interval
                 ORDER BY m.created_at DESC LIMIT 1) AS preview,
              (SELECT m.kind FROM messages m
                 WHERE m.conversation_id = c.id
                   AND m.created_at >= now() - ($2 || ' days')::interval
                 ORDER BY m.created_at DESC LIMIT 1) AS last_kind
       FROM conversations c
       LEFT JOIN users pu
         ON pu.id = (CASE WHEN c.user_a_id = $1 THEN c.user_b_id ELSE c.user_a_id END)
       WHERE (c.user_a_id = $1 OR c.user_b_id = $1)
       ORDER BY c.last_msg_at DESC NULLS LAST
       LIMIT $3`,
      [userId, windowDays, limit]
    );
    return rows;
  } catch (e) {
    console.warn('[chat] listConversations failed:', e.message);
    return [];
  }
}

// ── 보관기간 자동 파기 (startRetentionCron에서 호출) ────────────────────────
// 정책: ① 90일(절대 상한) 초과 메시지 전부 삭제
//       ② 양쪽 모두 무료인 대화는 7일에 삭제 (프리미엄 한 명이라도 끼면 90일까지 유지)
// ⚠️ users.is_premium 컬럼명은 실제 스키마에 맞게 조정(프로젝트에 따라 premium/is_premium 등).
async function purgeExpiredChats(db) {
  try {
    // ① 절대 상한
    const cap = await db.query(
      `DELETE FROM messages WHERE created_at < now() - ($1 || ' days')::interval`,
      [PREMIUM_RETENTION_DAYS]
    );
    // ② 무료-무료 대화의 7일 초과분
    const free = await db.query(
      `DELETE FROM messages m
       USING conversations c
       WHERE m.conversation_id = c.id
         AND m.created_at < now() - ($1 || ' days')::interval
         AND NOT EXISTS (
           SELECT 1 FROM users u
           WHERE u.id IN (c.user_a_id, c.user_b_id) AND u.is_premium = true
         )`,
      [FREE_RETENTION_DAYS]
    );
    // ③ 메시지가 모두 사라지고 오래된 빈 대화방 정리
    await db.query(
      `DELETE FROM conversations c
       WHERE c.last_msg_at < now() - ($1 || ' days')::interval
         AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id)`,
      [PREMIUM_RETENTION_DAYS]
    );
    console.log(`[chat] purge: cap=${cap.rowCount} free7d=${free.rowCount}`);
  } catch (e) {
    console.warn('[chat] purgeExpiredChats failed:', e.message);
  }
}

// ── 탈퇴 연동 (withdrawUser 트랜잭션에 한 단계 추가) ─────────────────────────
// 정책: 대화방 전체를 지우면 "상대방의 대화 내역"까지 날아간다.
//       → 탈퇴자의 sender_id만 비식별화(SHA-256)해 본인 식별성은 제거하되,
//         상대방은 자신의 대화 맥락을 유지. 메시지 자체는 보관기간 cron이 정리.
//       (legal.js의 pseudonymize 철학과 동일)
// ※ 강성 파기(메시지까지 즉시 삭제)를 원하면 purgeImmediately=true 로 분기.
async function scrubUserFromChats(db, userId, { purgeImmediately = false } = {}) {
  if (purgeImmediately) {
    // 내가 보낸 메시지 즉시 삭제 + 내가 단독으로 만든 대화 정리
    await db.query(`DELETE FROM messages WHERE sender_id = $1`, [userId]);
    await db.query(
      `DELETE FROM conversations c
       WHERE (c.user_a_id = $1 OR c.user_b_id = $1)
         AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id)`,
      [userId]
    );
    return;
  }
  // 기본: 비식별화 (상대방 대화 맥락 보존)
  const hashed = crypto.createHash('sha256').update(String(userId)).digest('hex');
  await db.query(`UPDATE messages SET sender_id = $2 WHERE sender_id = $1`, [userId, hashed]);
  await db.query(
    `UPDATE conversations
        SET user_a_id = CASE WHEN user_a_id = $1 THEN $2 ELSE user_a_id END,
            user_b_id = CASE WHEN user_b_id = $1 THEN $2 ELSE user_b_id END,
            status = 'closed'
      WHERE user_a_id = $1 OR user_b_id = $1`,
    [userId, hashed]
  );
}

module.exports = {
  FREE_RETENTION_DAYS,
  PREMIUM_RETENTION_DAYS,
  initChatSchema,
  upsertConversation,
  persistMessage,
  markRead,
  getHistory,
  listConversations,
  purgeExpiredChats,
  scrubUserFromChats,
};
