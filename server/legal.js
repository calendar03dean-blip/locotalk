/**
 * legal.js — 대한민국 법령 준수 모듈 (Locotalk)
 * ─────────────────────────────────────────────────────────────────────────
 * 위치정보법 / 통신비밀보호법 / 청소년보호법 / 개인정보보호법 대응.
 *
 *  1. 위치정보법   : 위치 수집 동의 + 이용·제공사실 확인자료(LocationHistoryLog) 6개월 보관
 *  2. 통신비밀보호법: 접속 IP·기기식별값·매칭/대화 생성시점 접속로그(AccessLog) 3개월 보관
 *  3. 청소년보호법 : 성인인증(adult_verified) JWT/세션 반영 + 매칭 진입 차단 가드
 *  4. 개인정보보호법: 탈퇴 시 식별정보 영구 파기(Hard Delete) + 보관의무 로그 비식별화 트랜잭션
 *  5. 스토킹 방지  : 정확 GPS 비노출 — 거리 500m 단위 버킷/행정동 단위 가공
 *
 * 모든 DB 부가기록은 best-effort(try/catch) — 실패해도 채팅 흐름을 막지 않음.
 * 단, '가드(guard)'는 의도적으로 차단(fail-closed)함.
 *
 * 사용: const legal = require('./legal'); legal.initLegalSchema(db);
 */
'use strict';

const crypto = require('crypto');

// ─── 법정 보관기간 ──────────────────────────────────────────────────────
const LOCATION_RETENTION_DAYS = 183;  // 위치정보법: 6개월
const ACCESS_RETENTION_DAYS   = 92;   // 통신비밀보호법: 3개월(최소)
const ADULT_MIN_AGE           = 19;   // 청소년보호법: 만 19세 이상(연 나이 기준)

// ─── JWT 시크릿 (운영에선 반드시 환경변수) ───────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'locotalk-dev-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('[legal] ⚠️  JWT_SECRET 미설정 — 개발용 기본키 사용. 운영 환경변수에 JWT_SECRET 설정 필수.');
}

// ════════════════════════════════════════════════════════════════════════
//  스키마
// ════════════════════════════════════════════════════════════════════════
async function initLegalSchema(db) {
  if (!db) { console.log('[legal] DB 없음 — 스키마 생성 건너뜀'); return; }
  try {
    await db.query(`
      -- 1) 위치정보 이용·제공사실 확인자료 (위치정보법 §16 — 6개월 보관)
      CREATE TABLE IF NOT EXISTS location_history_log (
        id             BIGSERIAL PRIMARY KEY,
        used_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- 이용 일시
        requester_id   VARCHAR(120),                          -- 수집/제공 요청인 ID
        subject_id     VARCHAR(120),                          -- 위치정보주체 ID
        collect_method VARCHAR(20)  NOT NULL DEFAULT 'UNKNOWN',-- GPS | NETWORK | UNKNOWN
        purpose        VARCHAR(40)  NOT NULL DEFAULT 'matching',
        result_status  VARCHAR(24)  NOT NULL DEFAULT 'SUCCESS',-- SUCCESS | FAIL | REJECTED_NO_CONSENT
        ip             VARCHAR(60),
        retain_until   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '${LOCATION_RETENTION_DAYS} days')
      );
      CREATE INDEX IF NOT EXISTS idx_loc_retain  ON location_history_log (retain_until);
      CREATE INDEX IF NOT EXISTS idx_loc_subject ON location_history_log (subject_id);

      -- 2) 접속로그 (통신비밀보호법 — 수사기관 대응, 최소 3개월 보관)
      CREATE TABLE IF NOT EXISTS access_log (
        id           BIGSERIAL PRIMARY KEY,
        event_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- 접속/매칭/대화 생성 시점
        event_type   VARCHAR(30) NOT NULL,                -- CONNECT|MATCH_CREATED|ROOM_CREATED|MESSAGE|DISCONNECT
        user_id      VARCHAR(120),                         -- 익명/비회원이면 NULL 가능
        nick         VARCHAR(40),
        ip           VARCHAR(60),                          -- 접속지 IP (IPv6/프록시 체인 대비 길이 확보)
        device_id    VARCHAR(200),                         -- 기기 식별값(UUID/단말기)
        device_info  VARCHAR(300),                         -- User-Agent/플랫폼
        room_id      VARCHAR(80),
        peer_nick    VARCHAR(40),
        retain_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '${ACCESS_RETENTION_DAYS} days')
      );
      CREATE INDEX IF NOT EXISTS idx_acc_retain ON access_log (retain_until);
      CREATE INDEX IF NOT EXISTS idx_acc_user   ON access_log (user_id);

      -- 3) users 보강 컬럼 (위치동의 / 성인인증 / 탈퇴마커)
      ALTER TABLE users ADD COLUMN IF NOT EXISTS location_consent     BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS location_consent_at  TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS adult_verified       BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS adult_verified_at    TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS adult_verify_provider VARCHAR(20);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawn_at         TIMESTAMPTZ;

      -- 4) 약관 동의 이력 (동의 증빙 — 누가·어느 버전·언제). 출시 전 동의 = 법적 필수.
      CREATE TABLE IF NOT EXISTS user_consents (
        id        BIGSERIAL PRIMARY KEY,
        user_id   VARCHAR(120) NOT NULL,                  -- 본인인증 CI 로 결정된 userId
        doc       VARCHAR(40)  NOT NULL,                  -- privacy | service | location
        version   VARCHAR(60)  NOT NULL,                  -- 약관 버전 태그(클라/서버 합의값)
        agreed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),    -- 동의 시각
        ip        VARCHAR(60)
      );
      CREATE INDEX IF NOT EXISTS idx_consent_user ON user_consents (user_id);
    `);
    console.log('[legal] ✅ 법령준수 스키마 준비 완료 (location_history_log / access_log / user_consents / users 보강)');
  } catch (e) {
    console.error('[legal] 스키마 초기화 실패:', e.message);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  공통 유틸 — 클라이언트 IP 추출
// ════════════════════════════════════════════════════════════════════════
/** Express req 또는 socket 에서 실제 접속지 IP 추출 (Railway 등 프록시 X-Forwarded-For 우선) */
function getClientIp(reqOrSocket) {
  try {
    const headers = reqOrSocket?.headers || reqOrSocket?.handshake?.headers || {};
    const xff = headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();          // 첫 홉이 원 클라이언트
    return (
      reqOrSocket?.socket?.remoteAddress ||
      reqOrSocket?.handshake?.address ||
      reqOrSocket?.ip ||
      null
    );
  } catch { return null; }
}

// ════════════════════════════════════════════════════════════════════════
//  1. 위치정보법 — 동의 + 이용기록 로그
// ════════════════════════════════════════════════════════════════════════
/** 위치기반서비스 이용약관 동의 저장/철회 */
async function setLocationConsent(db, userId, agreed) {
  if (!db || !userId) return false;
  try {
    await db.query(
      `UPDATE users SET location_consent = $2,
         location_consent_at = CASE WHEN $2 THEN NOW() ELSE location_consent_at END,
         updated_at = NOW() WHERE id = $1`,
      [userId, !!agreed]
    );
    return true;
  } catch (e) { console.warn('[legal] setLocationConsent 실패:', e.message); return false; }
}

/** 현재 위치 수집 동의 여부 조회 */
async function hasLocationConsent(db, userId) {
  if (!db || !userId) return false;
  try {
    const { rows } = await db.query('SELECT location_consent FROM users WHERE id = $1', [userId]);
    return rows.length > 0 && rows[0].location_consent === true;
  } catch { return false; }
}

/** 동의 가능한 약관 문서(화이트리스트) */
const ALLOWED_CONSENT_DOCS = new Set(['privacy', 'service', 'location']);

// 클라가 보낸 동의시각(epoch ms)은 신뢰경계 밖 → 검증 후에만 agreed_at 으로 채택.
const CONSENT_FUTURE_SKEW_MS = 5 * 60 * 1000;        // 미래 허용 한계(클럭 스큐 5분)
const CONSENT_MAX_AGE_MS     = 30 * 24 * 60 * 60 * 1000; // 과거 허용 한계(30일)

/**
 * 클라 제공 동의시각(epoch ms) 검증 → 유효하면 Date, 아니면 null(=DEFAULT NOW() 폴백).
 *  미래(+5분 초과)거나 30일보다 과거면 위조 의심으로 폐기 — 위조 동의시각 주입 방지.
 *  오프라인 동의 후 재연결 flush 경로에서 보존된 실제 동의 순간을 살리되, 비합리 값은 거른다.
 */
function resolveAgreedAt(consentedAt) {
  if (typeof consentedAt !== 'number' || !isFinite(consentedAt)) return null;
  const now = Date.now();
  if (consentedAt > now + CONSENT_FUTURE_SKEW_MS) return null;
  if (consentedAt < now - CONSENT_MAX_AGE_MS) return null;
  return new Date(consentedAt);
}

/**
 * 약관 동의 이력 영속 (동의 증빙). 허용 문서·버전만 수용, 그 외 무시.
 *   위치 약관(location) 포함 시 users.location_consent 도 동기화(위치정보법).
 *   consentedAt(epoch ms): 실제 동의 순간. 유효하면 agreed_at 으로 사용, 없거나 부적합하면 NOW().
 * @param {Array<{doc, version}>} items
 */
async function recordConsents(db, userId, items = [], { ip = null, consentedAt = null } = {}) {
  if (!db || !userId || !Array.isArray(items) || !items.length) return { ok: false, recorded: 0 };
  const agreedAt = resolveAgreedAt(consentedAt); // null 이면 컬럼 DEFAULT NOW() 폴백
  let recorded = 0, location = false;
  for (const it of items) {
    const doc = String(it?.doc || '');
    const version = String(it?.version || '').slice(0, 60);
    if (!ALLOWED_CONSENT_DOCS.has(doc) || !version) continue;
    try {
      if (agreedAt) {
        await db.query(
          'INSERT INTO user_consents (user_id, doc, version, agreed_at, ip) VALUES ($1, $2, $3, $4, $5)',
          [userId, doc, version, agreedAt, ip]
        );
      } else {
        await db.query(
          'INSERT INTO user_consents (user_id, doc, version, ip) VALUES ($1, $2, $3, $4)',
          [userId, doc, version, ip]
        );
      }
      recorded++;
      if (doc === 'location') location = true;
    } catch (e) { console.warn('[legal] recordConsents insert 실패:', e.message); }
  }
  if (location) { try { await setLocationConsent(db, userId, true); } catch {} }
  return { ok: recorded > 0, recorded };
}

/**
 * 위치정보 이용·제공사실 자동 기록 (best-effort). 위치 API가 작동(수집/이용)할 때마다 호출.
 * @param {{requesterId, subjectId, method, purpose, status, ip}} p
 */
async function logLocationUse(db, p = {}) {
  if (!db) return;
  const method = ['GPS', 'NETWORK'].includes(p.method) ? p.method : 'UNKNOWN';
  const status = p.status || 'SUCCESS';
  try {
    await db.query(
      `INSERT INTO location_history_log
         (requester_id, subject_id, collect_method, purpose, result_status, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [p.requesterId || null, p.subjectId || p.requesterId || null, method,
       p.purpose || 'matching', status, p.ip || null]
    );
  } catch (e) { console.warn('[legal] logLocationUse 실패:', e.message); }
}

// ════════════════════════════════════════════════════════════════════════
//  2. 통신비밀보호법 — 접속 로그
// ════════════════════════════════════════════════════════════════════════
/**
 * 접속/매칭/대화 생성 로그 자동 기록 (best-effort).
 * @param {{eventType, userId, nick, ip, deviceId, deviceInfo, roomId, peerNick}} p
 */
async function logAccess(db, p = {}) {
  if (!db || !p.eventType) return;
  try {
    await db.query(
      `INSERT INTO access_log
         (event_type, user_id, nick, ip, device_id, device_info, room_id, peer_nick)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [p.eventType, p.userId || null, p.nick || null, p.ip || null,
       p.deviceId || null, (p.deviceInfo || '').slice(0, 300), p.roomId || null, p.peerNick || null]
    );
  } catch (e) { console.warn('[legal] logAccess 실패:', e.message); }
}

// ════════════════════════════════════════════════════════════════════════
//  3. 청소년보호법 — 성인인증 + JWT + 가드
// ════════════════════════════════════════════════════════════════════════
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlJson(obj) { return b64url(JSON.stringify(obj)); }

/** 세션 토큰 발급 (HMAC-SHA256 JWT, 외부 의존성 없음) */
function issueSessionToken(userId, { adultVerified = false, ttlSec = 60 * 60 * 24 * 30 } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header  = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = b64urlJson({ sub: userId, adult: !!adultVerified, iat: now, exp: now + ttlSec });
  const sig = b64url(crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

/** 세션 토큰 검증 → payload | null */
function verifySessionToken(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const expected = b64url(crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest());
    // 타이밍 안전 비교
    const a = Buffer.from(s), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch { return null; }
}

/** 생년(YYYY 또는 YYYYMMDD/Date) → 연 나이 성인 여부 */
function isAdultByBirth(birth) {
  if (!birth) return null;
  const s = String(birth).replace(/[^0-9]/g, '');
  const y = parseInt(s.slice(0, 4), 10);
  if (!y || y < 1900) return null;
  const curYear = new Date().getFullYear();           // 연 나이(청소년보호법 기준)
  return (curYear - y) >= ADULT_MIN_AGE;
}

/** 인증 대행사(다날/PASS/PortOne 등) 결과 반영 — adult_verified 저장. 성인 아니면 false 저장 */
async function setAdultVerified(db, userId, { provider = 'portone', birth = null, gender = null } = {}) {
  if (!db || !userId) return { ok: false, adult: false };
  const adultByAge = isAdultByBirth(birth);
  // birth 가 주어지면 연 나이로 판정, 없으면 인증 자체를 성인으로 간주(대행사가 성인본인인증만 통과시키는 경우)
  const adult = adultByAge === null ? true : adultByAge;
  try {
    await db.query(
      `UPDATE users SET adult_verified = $2, adult_verified_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
         adult_verify_provider = $3, is_verified = TRUE, verified_at = NOW(),
         birth_year = COALESCE($4, birth_year), gender = COALESCE($5, gender), updated_at = NOW()
       WHERE id = $1`,
      [userId, adult, provider, isAdultByBirth(birth) === null ? null : parseInt(String(birth).slice(0,4),10), gender]
    );
    return { ok: true, adult, token: issueSessionToken(userId, { adultVerified: adult }) };
  } catch (e) { console.warn('[legal] setAdultVerified 실패:', e.message); return { ok: false, adult: false }; }
}

/** 성인인증 여부 DB 조회 */
async function isAdultVerified(db, userId) {
  if (!db || !userId) return false;
  try {
    const { rows } = await db.query('SELECT adult_verified FROM users WHERE id = $1', [userId]);
    return rows.length > 0 && rows[0].adult_verified === true;
  } catch { return false; }
}

/**
 * Express 성인인증 가드 미들웨어. 매칭 등 보호 라우터 진입 전 사용.
 *  - Authorization: Bearer <jwt> 의 adult=true 면 통과
 *  - 또는 x-user-id 헤더로 DB adult_verified 확인(토큰 미도입 클라 호환)
 *  - 둘 다 실패 시 403 (fail-closed)
 */
function requireAdultVerified(db) {
  return async (req, res, next) => {
    try {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      const payload = verifySessionToken(token);
      if (payload?.adult === true) { req.userId = payload.sub; return next(); }

      const userId = req.headers['x-user-id'] || req.body?.userId || req.query?.userId;
      if (userId && await isAdultVerified(db, userId)) { req.userId = userId; return next(); }

      return res.status(403).json({ error: 'adult_verification_required', message: '성인인증이 필요한 서비스입니다.' });
    } catch (e) {
      return res.status(403).json({ error: 'adult_verification_required' });
    }
  };
}

/**
 * 소켓용 성인인증 가드. userId 가 있으면 DB 확인, 토큰이 있으면 토큰 확인.
 * 차단해야 하면 true 반환(=block).
 *  - ENFORCE_ADULT=false(기본) : userId 미전달 시 통과(레거시 클라 호환), 전달 시 미인증이면 차단
 *  - ENFORCE_ADULT=true        : 신원 확인 불가도 차단(fail-closed)
 */
async function shouldBlockUnverified(db, { userId, token } = {}) {
  // 마스터 스위치: ENFORCE_ADULT=true 일 때만 실제 차단.
  // 미설정(기본)이면 로깅/스키마 등 인프라만 가동하고 매칭은 막지 않음 →
  // 성인인증 UX 배포 + 기존 유저 마이그레이션 완료 후 환경변수로 안전하게 활성화.
  if (process.env.ENFORCE_ADULT !== 'true') return false;
  const payload = verifySessionToken(token);
  if (payload?.adult === true) return false;                       // 토큰으로 성인 확인
  if (userId && await isAdultVerified(db, userId)) return false;   // DB 로 성인 확인
  return true;                                                     // 그 외 차단(fail-closed)
}

// ════════════════════════════════════════════════════════════════════════
//  4. 개인정보보호법 — 탈퇴 시 영구 파기 (트랜잭션)
// ════════════════════════════════════════════════════════════════════════
/** 식별자 비가역 해시(SHA-256) — 보관의무 로그의 연결고리 끊기용 */
function pseudonymize(id) {
  if (!id) return null;
  return 'anon_' + crypto.createHash('sha256').update(String(id) + JWT_SECRET).digest('hex').slice(0, 24);
}

/**
 * 회원 탈퇴/보유기간 만료 시 개인정보 영구 파기.
 *  - users 행 Hard Delete (이메일/전화/닉 등 식별정보 완전 삭제)
 *  - 법정 보관의무 로그(위치/접속)는 즉시삭제하면 위치정보법·통비법 위반 →
 *    requester/subject/user_id 를 비가역 해시로 '비식별화'하여 보관기간까지 유지 후 자동파기.
 *    (purgeLogsImmediately=true 면 로그도 즉시 삭제 — 법무 검토 후 사용)
 * @returns {{ok, deletedUser, anonymizedLocationLogs, anonymizedAccessLogs}}
 */
async function withdrawUser(db, userId, { purgeLogsImmediately = false } = {}) {
  if (!db) return { ok: true, deletedUser: 0 }; // DB 미사용 환경
  if (!userId) return { ok: false, error: 'userId required' };
  const anon = pseudonymize(userId);
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    if (purgeLogsImmediately) {
      await client.query('DELETE FROM location_history_log WHERE requester_id = $1 OR subject_id = $1', [userId]);
      await client.query('DELETE FROM access_log WHERE user_id = $1', [userId]);
    } else {
      // 보관의무 로그 비식별화 (개인정보 연결 차단, 보관기간까지 유지)
      await client.query(
        `UPDATE location_history_log SET requester_id = $2, subject_id = $2, ip = NULL
           WHERE requester_id = $1 OR subject_id = $1`, [userId, anon]);
      await client.query(
        `UPDATE access_log SET user_id = $2, ip = NULL, device_id = NULL, device_info = NULL
           WHERE user_id = $1`, [userId, anon]);
    }

    // 식별정보 완전 삭제 (Hard Delete)
    const del = await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');
    console.log(`[legal] 🗑  withdrawUser ${userId} — user삭제=${del.rowCount} 로그=${purgeLogsImmediately ? '즉시삭제' : '비식별화'}`);
    return { ok: true, deletedUser: del.rowCount };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[legal] withdrawUser 트랜잭션 실패:', e.message);
    return { ok: false, error: e.message };
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════════════════════════════
//  보관기간 만료 로그 자동 파기 (위치 6개월 / 접속 3개월)
// ════════════════════════════════════════════════════════════════════════
async function purgeExpiredLogs(db) {
  if (!db) return;
  try {
    const a = await db.query('DELETE FROM location_history_log WHERE retain_until < NOW()');
    const b = await db.query('DELETE FROM access_log WHERE retain_until < NOW()');
    if (a.rowCount || b.rowCount)
      console.log(`[legal] 🧹 보관만료 파기 — 위치로그 ${a.rowCount}건, 접속로그 ${b.rowCount}건`);
  } catch (e) { console.warn('[legal] purgeExpiredLogs 실패:', e.message); }
}

/** 일 1회 보관만료 로그 자동 파기 스케줄러 (서버 기동 시 1회 호출) */
function startRetentionCron(db) {
  purgeExpiredLogs(db);                              // 기동 직후 1회
  setInterval(() => purgeExpiredLogs(db), 24 * 60 * 60 * 1000); // 매 24시간
  console.log('[legal] ⏱  보관기간 자동파기 스케줄러 가동(24h)');
}

// ════════════════════════════════════════════════════════════════════════
//  5. 스토킹 방지 — 거리 가공
// ════════════════════════════════════════════════════════════════════════
/**
 * 정확 거리(km) → 500m 단위로 뭉뚱그린 km (최소 0.5km). 정확 좌표/거리 노출 방지.
 *  예) 0.12→0.5, 1.3→1.5, 2.0→2.0
 */
function fuzzDistanceKm(km) {
  if (typeof km !== 'number' || !isFinite(km) || km < 0) return null;
  const bucket = Math.max(0.5, Math.round(km * 2) / 2); // 0.5km(=500m) 단위 반올림
  return Math.round(bucket * 10) / 10;
}

/** 거리 → 사용자 노출용 라벨 ('500m 이내' / '약 1.5km') */
function distanceLabel(km) {
  const f = fuzzDistanceKm(km);
  if (f === null) return null;
  if (f <= 0.5) return '500m 이내';
  return `약 ${f}km`;
}

/**
 * 좌표 대신 행정동 단위로 가공해 노출 (정확 좌표 비노출).
 * 역지오코딩 미연동 환경에선 보유한 regionLabel(구·동) 을 그대로 사용.
 */
function toAdminDong(regionLabel, regionGu) {
  return regionLabel || regionGu || '우리 동네';
}

module.exports = {
  // 상수
  LOCATION_RETENTION_DAYS, ACCESS_RETENTION_DAYS, ADULT_MIN_AGE,
  // 스키마
  initLegalSchema,
  // 공통
  getClientIp,
  // 1 위치정보법
  setLocationConsent, hasLocationConsent, logLocationUse,
  // 약관 동의 이력
  recordConsents,
  // 2 통신비밀보호법
  logAccess,
  // 3 청소년보호법
  issueSessionToken, verifySessionToken, isAdultByBirth, setAdultVerified,
  isAdultVerified, requireAdultVerified, shouldBlockUnverified,
  // 4 개인정보보호법
  pseudonymize, withdrawUser,
  // 보관기간
  purgeExpiredLogs, startRetentionCron,
  // 5 스토킹 방지
  fuzzDistanceKm, distanceLabel, toAdminDong,
};
