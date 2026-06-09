// server/identity.js
// ─────────────────────────────────────────────────────────────────────────────
// Locotalk — 본인인증=로그인 (PortOne V2 기반, 채널 추상화) + 신원-세션 바인딩
//
// 배경(P0): 기존 /auth/portone-verify 는 req.body.userId(무검증 클라값)로 토큰을 발급 →
//   본인인증 1회 통과 후 userId 만 피해자로 바꾸면 사칭 JWT 발급 가능(검증≠바인딩).
//
// to-be: IVID(identityVerificationId)로 PortOne 결과를 '서버가' 조회 → CI 도출 →
//   CI 로 계정 조회/생성 → 그 계정으로만 JWT 발급. 사전 userId 개념 없음.
//   IVID 1회 소비(리플레이 차단), CI unique(1인 1계정).
//
// 채널(다날/KCP) 미확정이어도 무관 — V2 는 IVID 로 결과를 조회하므로 채널에 비의존.
//
// 원칙(chat/reports/feeds 동일): best-effort 아님(인증 경로라 정확성 우선). throw 는 흡수해
//   {ok:false} 로 변환(흐름 무중단). DB 필수(CI 바인딩).
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// CI/DI 해시: 원문 저장 금지. 조회 일관성 위해 '안정적' 솔트만 사용(JWT_SECRET 금지 — 회전 시 매칭 깨짐).
//   선택적 페퍼 CI_HASH_SALT(env, 안정값). 미설정 시 무솔트 sha256(충분히 불가역).
const CI_PEPPER = process.env.CI_HASH_SALT || '';
function hashId(v) {
  if (!v) return null;
  return crypto.createHash('sha256').update(CI_PEPPER + String(v)).digest('hex');
}

// DI 보관정책(법무 확정 전 코드 가정): 탈퇴 후 6개월.
const DI_RETENTION_DAYS = 183;

async function initIdentitySchema(db) {
  if (!db) return;
  try {
    // users 보강: ci(해시, 1인1계정 키) / di(해시, 중복가입확인) — nullable(레거시 계정 호환).
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ci TEXT;`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS di TEXT;`);
    // partial unique: ci 있는 행만 유일 → 레거시(ci NULL)는 제약 없음. 백필: 레거시는 다음 본인인증 시 바인딩.
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_users_ci ON users(ci) WHERE ci IS NOT NULL;`);
    // IVID 1회 소비 기록(리플레이 차단)
    await db.query(`
      CREATE TABLE IF NOT EXISTS used_identity_verifications (
        ivid       TEXT PRIMARY KEY,
        user_id    TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    console.log('[identity] ✅ 본인인증 스키마 준비 완료 (users.ci/di + uq_users_ci + used_identity_verifications)');
    // down(롤백) 참고:
    //   DROP TABLE IF EXISTS used_identity_verifications;
    //   DROP INDEX IF EXISTS uq_users_ci;  ALTER TABLE users DROP COLUMN IF EXISTS di, DROP COLUMN IF EXISTS ci;
  } catch (e) {
    console.error('[identity] initIdentitySchema 실패:', e.message);
  }
}

/**
 * IVID 로 PortOne V2 인증결과를 '서버'가 조회·검증 → 정규화 결과 반환(채널 무관).
 * 클라가 보낸 어떤 신원값도 신뢰하지 않음(IVID 만 입력).
 * @returns {Promise<{ok, ci, di, name, birth, gender, phone, reason?}>} throw 없음.
 */
async function verifyByIVID(ivid) {
  const secret = process.env.PORTONE_V2_API_SECRET;
  if (!secret) return { ok: false, reason: 'no_api_secret' };
  if (!ivid)   return { ok: false, reason: 'no_ivid' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);   // 본인인증 서버 지연이 로그인 매달지 않게
  try {
    const r = await fetch(
      `https://api.portone.io/identity-verifications/${encodeURIComponent(ivid)}`,
      { headers: { Authorization: `PortOne ${secret}` }, signal: ctrl.signal }
    );
    const data = await r.json().catch(() => null);
    if (!data) return { ok: false, reason: `portone_http_${r.status}` };
    if (data.status !== 'VERIFIED' || !data.verifiedCustomer) {
      return { ok: false, reason: `not_verified:${data.status || 'unknown'}` };
    }
    const c = data.verifiedCustomer;
    if (!c.ci) return { ok: false, reason: 'no_ci' };   // CI 없으면 바인딩 불가
    return {
      ok    : true,
      ci    : c.ci,
      di    : c.di || null,
      name  : c.name || null,
      birth : (c.birthDate || '').replace(/-/g, ''),     // YYYY-MM-DD → YYYYMMDD
      gender: c.gender === 'MALE' ? 'male' : (c.gender === 'FEMALE' ? 'female' : null),
      phone : (c.phoneNumber || '').replace(/[^0-9]/g, ''),
    };
  } catch (e) {
    return { ok: false, reason: (e && e.name === 'AbortError') ? 'timeout' : (e && e.message) || 'verify_error' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * CI 해시 기준 계정 조회/생성. 사전 userId 신뢰 없음 — 신원이 곧 계정.
 * @returns {Promise<{userId, isNew}>}
 */
async function resolveOrCreateUserByCI(db, { ciHash, diHash, phone } = {}) {
  if (!db || !ciHash) throw new Error('resolveOrCreateUserByCI: db/ciHash 필수');
  // 1) 기존 CI → 해당 계정 로그인
  const found = await db.query('SELECT id FROM users WHERE ci = $1', [ciHash]);
  if (found.rows.length > 0) {
    const userId = found.rows[0].id;
    // di/phone 최신화(있을 때만)
    try { await db.query('UPDATE users SET di = COALESCE($2, di), phone = COALESCE($3, phone), updated_at = NOW() WHERE id = $1',
      [userId, diHash || null, phone || null]); } catch {}
    return { userId, isNew: false };
  }
  // 2) 신규 CI → 계정 생성 (id = idv:<uuid>). auth_provider NOT NULL → 'portone'.
  const userId = 'idv:' + uuidv4();
  try {
    await db.query(
      `INSERT INTO users (id, auth_provider, ci, di, phone) VALUES ($1, 'portone', $2, $3, $4)`,
      [userId, ciHash, diHash || null, phone || null]
    );
    return { userId, isNew: true };
  } catch (e) {
    // 동시성: 같은 CI 가 그 사이 생성됨(unique 위반 23505) → 기존 계정으로 폴백
    if (e && e.code === '23505') {
      const again = await db.query('SELECT id FROM users WHERE ci = $1', [ciHash]);
      if (again.rows.length > 0) return { userId: again.rows[0].id, isNew: false };
    }
    throw e;
  }
}

/** IVID 1회 소비. 이미 사용된 IVID 면 false(리플레이 차단). */
async function consumeIVID(db, ivid, userId) {
  if (!db || !ivid) return false;
  try {
    const r = await db.query(
      `INSERT INTO used_identity_verifications (ivid, user_id) VALUES ($1, $2)
       ON CONFLICT (ivid) DO NOTHING`,
      [ivid, userId || null]
    );
    return r.rowCount === 1;   // 1=최초 소비 / 0=이미 사용됨
  } catch (e) {
    console.warn('[identity] consumeIVID 실패:', e.message);
    return false;              // 불확실하면 거부(fail-closed)
  }
}

async function statsIdentity(db) {
  if (!db) return { ciUsers: 0, consumedIvids: 0 };
  try {
    const a = await db.query('SELECT COUNT(*)::int n FROM users WHERE ci IS NOT NULL');
    const b = await db.query('SELECT COUNT(*)::int n FROM used_identity_verifications');
    return { ciUsers: a.rows[0].n, consumedIvids: b.rows[0].n };
  } catch (e) { return { ciUsers: 0, consumedIvids: 0, error: e.message }; }
}

module.exports = {
  DI_RETENTION_DAYS, hashId, initIdentitySchema,
  verifyByIVID, resolveOrCreateUserByCI, consumeIVID, statsIdentity,
};
