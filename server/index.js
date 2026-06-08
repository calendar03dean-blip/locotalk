/**
 * Locotalk — Realtime Matching & Relay Server
 * Stack : Express + Socket.io (in-memory, no DB)
 * Port  : 4000
 *
 * Socket Events (client → server)
 *   join_queue          { nick, interests, region }
 *   leave_queue
 *   join_standby        { nick, interests, region }   ← 채팅 받기 ON
 *   leave_standby
 *   accept_match        { requestId }
 *   decline_match       { requestId }
 *   send_message        { roomId, text }
 *   leave_room          { roomId }
 *   rejoin_room         { roomId }                    ← 포그라운드 복귀
 *   register_push_token { token, nick }               ← 푸시 토큰 등록
 *
 * Socket Events (server → client)
 *   queue_joined        { position }
 *   match_found         { roomId, peer }              ← 능동 매칭 완료
 *   passive_match_found { roomId, peer }              ← 수동 매칭 완료
 *   match_request       { requestId, fromNick, fromInterest, fromRegion }
 *   receive_message     { id, text, time }
 *   peer_left
 *   peer_disconnected
 *   peer_reconnected
 *   error               { message }
 */
'use strict';

const express        = require('express');
const http           = require('http');
const { Server }     = require('socket.io');
const cors           = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs             = require('fs');
const path           = require('path');
const { Pool }       = require('pg');
const legal          = require('./legal');   // 법령준수(위치/통비/청소년/개인정보) 모듈
const chat           = require('./chat');    // 채팅 영속화(PostgreSQL) + 차등 보관 모듈
const pushtokens     = require('./pushtokens'); // 푸시 토큰 영속화(PostgreSQL, userId 기준)

// ─── PostgreSQL 연결 ─────────────────────────────────────────────────
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,   // Railway 내부 네트워크는 SSL 불필요
});

// DB 초기화 — 테이블 생성
async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.log('[db] DATABASE_URL 없음 — DB 기능 비활성화');
    return;
  }
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            VARCHAR(100) PRIMARY KEY,
        auth_provider VARCHAR(20)  NOT NULL,
        auth_id       VARCHAR(200),
        email         VARCHAR(200),
        nickname      VARCHAR(20),
        gender        VARCHAR(10),
        birth_year    INTEGER,
        interests     TEXT,
        region_gu     VARCHAR(50),
        region_label  VARCHAR(100),
        is_premium    BOOLEAN DEFAULT FALSE,
        is_verified   BOOLEAN DEFAULT FALSE,
        verified_at   TIMESTAMP,
        phone         VARCHAR(20),
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
      );
      -- 기존 테이블에 컬럼 추가 (이미 있으면 무시)
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    `);
    console.log('[db] ✅ users 테이블 준비 완료');
    // 법령준수 스키마(위치/접속 로그 + users 보강) 준비 후 보관기간 자동파기 스케줄러 가동
    await legal.initLegalSchema(db);
    legal.startRetentionCron(db);
    // 채팅 영속화 스키마 + 보관기간 자동파기(기동 1회 + 24h)
    await chat.initChatSchema(db);
    chat.purgeExpiredChats(db);
    setInterval(() => chat.purgeExpiredChats(db), 24 * 60 * 60 * 1000);
    console.log('[chat] ✅ 채팅 영속화 스키마 준비 + 보관파기 스케줄러 가동');
    // 푸시 토큰 영속화 스키마(userId 기준 — 재배포 생존 + 닉 충돌 제거)
    await pushtokens.initPushTokenSchema(db);
  } catch (e) {
    console.error('[db] 초기화 실패:', e.message);
  }
}
initDB();

// ─── AWS SES 이메일 (SES API / HTTPS) ────────────────────────────────
// SMTP(465) 는 Railway 등 PaaS 에서 차단/행되는 경우가 많아 SES API(443) 사용.
// IAM 액세스 키(AKIA...)를 그대로 사용 (SMTP 전용 자격증명 불필요).
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const SES_CONFIGURED = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId    : process.env.AWS_ACCESS_KEY_ID     || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  maxAttempts: 2,
});

async function sendEmailSES({ to, subject, html, text }) {
  // HTML 만 있으면 스팸 점수가 올라가므로 플레인텍스트도 함께(multipart) 발송
  const body = { Html: { Data: html, Charset: 'UTF-8' } };
  if (text) body.Text = { Data: text, Charset: 'UTF-8' };

  const cmd = new SendEmailCommand({
    // 인증된 도메인 발신 고정 (env SES_FROM_EMAIL 의 stale 값/오설정 방지).
    // ⚠️ gmail 등 미인증 도메인 발신 시 DMARC fail → 스팸. 반드시 인증 도메인만.
    Source: 'Locotalk <noreply@locotalk.co.kr>',
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body:    body,
    },
  });
  return sesClient.send(cmd);
}

// OTP 임시 저장소 (이메일 → { code, expiresAt })
const otpStore = new Map();

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors        : { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout : 60000,
  pingInterval: 25000,
});

app.use(cors());
app.use(express.json());

// ─── 이메일 OTP 발송 ──────────────────────────────────────────────────
app.post('/auth/send-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'email and code required' });

  // OTP 저장 (3분 유효)
  otpStore.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + 3 * 60 * 1000,
  });

  // SES 미설정 시 발송 시도하지 않고 즉시 실패 응답 (클라이언트가 코드 폴백 표시)
  if (!SES_CONFIGURED) {
    console.warn('[OTP] AWS SES 미설정 — 이메일 발송 건너뜀');
    return res.status(503).json({ error: 'email_not_configured' });
  }

  try {
    await sendEmailSES({
      to: email,
      subject: '[Locotalk] 이메일 인증 코드',
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#f9fafb;">
          <div style="background:#40D3B6;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
            <h1 style="color:#fff;font-size:28px;margin:0;font-weight:800;">Locotalk</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">내 동네 이웃과 익명으로 대화해요</p>
          </div>
          <div style="background:#fff;border-radius:16px;padding:32px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <p style="color:#444;font-size:15px;margin:0 0 24px;">아래 인증 코드를 입력해주세요</p>
            <div style="background:#F0FBF9;border-radius:12px;padding:20px;margin-bottom:24px;">
              <span style="font-size:36px;font-weight:800;color:#034A93;letter-spacing:8px;">${code}</span>
            </div>
            <p style="color:#888;font-size:13px;margin:0;">이 코드는 <strong>3분</strong> 후 만료됩니다</p>
            <p style="color:#888;font-size:13px;margin:8px 0 0;">본인이 요청하지 않았다면 이 이메일을 무시하세요</p>
          </div>
        </div>
      `,
      text:
        `Locotalk 이메일 인증 코드\n\n` +
        `인증 코드: ${code}\n\n` +
        `이 코드는 3분 후 만료됩니다.\n` +
        `본인이 요청하지 않았다면 이 이메일을 무시하세요.`,
    });

    console.log(`[OTP] ✅ AWS SES 발송 완료 → ${email}`);
    res.json({ success: true });
  } catch (e) {
    console.error('[OTP] 예외:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── OTP 검증 ────────────────────────────────────────────────────────
app.post('/auth/verify-otp', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'email and code required' });

  const entry = otpStore.get(email.toLowerCase());
  if (!entry)                       return res.status(400).json({ error: 'otp_not_found' });
  if (Date.now() > entry.expiresAt) return res.status(400).json({ error: 'otp_expired' });
  if (entry.code !== code)          return res.status(400).json({ error: 'otp_invalid' });

  otpStore.delete(email.toLowerCase()); // 사용 후 삭제
  console.log(`[OTP] ✅ 인증 완료 → ${email}`);
  res.json({ success: true });
});

// ─── 사용자 API ──────────────────────────────────────────────────────

/** 로그인/회원가입 — 소셜 로그인 후 호출 */
app.post('/auth/login', async (req, res) => {
  const { provider, authId, email } = req.body;
  if (!provider || !authId) return res.status(400).json({ error: 'provider, authId 필수' });

  if (!process.env.DATABASE_URL) {
    return res.json({ userId: authId, isNew: true, user: null });
  }

  try {
    const userId = `${provider}:${authId}`;
    const { rows } = await db.query(
      'SELECT * FROM users WHERE id = $1 OR (auth_provider = $2 AND email = $3)',
      [userId, provider, email || '']
    );

    if (rows.length > 0) {
      const user = rows[0];

      // 이메일 백필: 기존 유저인데 email이 비어 있고 이번 로그인에 email이 오면 저장.
      // (카카오 비즈앱 이메일 동의 신설/애플 첫로그인 등으로 뒤늦게 이메일이 들어오는 경우 커버)
      if (email && (!user.email || user.email.trim() === '')) {
        try {
          await db.query('UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2', [email, user.id]);
          user.email = email;
          console.log(`[auth] ✉️ email backfilled for ${user.id} → ${email}`);
        } catch (e) { console.warn('[auth] email 백필 실패:', e.message); }
      }

      // interests는 TEXT(JSON 문자열)로 저장됨 → 배열로 파싱해 반환.
      // (안 하면 클라에서 user.interests.filter() → "undefined is not a function" 크래시)
      if (typeof user.interests === 'string') {
        try { user.interests = JSON.parse(user.interests); } catch { user.interests = []; }
      }
      if (!Array.isArray(user.interests)) user.interests = [];
      // 온보딩 완료 기준: 닉네임 보유 (관심사는 선택)
      const isComplete = !!user.nickname;
      return res.json({ userId: user.id, isNew: false, isComplete, user });
    }

    // 신규 유저 생성
    await db.query(
      'INSERT INTO users (id, auth_provider, auth_id, email) VALUES ($1, $2, $3, $4)',
      [userId, provider, authId, email || null]
    );
    return res.json({ userId, isNew: true, isComplete: false, user: null });
  } catch (e) {
    console.error('[db] login error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/** 네이버 OAuth 콜백 — code를 토큰으로 교환하고 프로필 조회 후 로그인 처리 */
app.post('/auth/naver-callback', async (req, res) => {
  const { code, state } = req.body;
  if (!code) return res.status(400).json({ error: 'code 필수' });

  const NAVER_CLIENT_ID     = process.env.NAVER_CLIENT_ID     || '4amvZv8LfW4vE277jo8n';
  const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || 'NddPIqKVfL';

  try {
    // 1. code → access token
    const tokenUrl =
      `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code` +
      `&client_id=${NAVER_CLIENT_ID}` +
      `&client_secret=${NAVER_CLIENT_SECRET}` +
      `&code=${encodeURIComponent(code)}` +
      `&state=${encodeURIComponent(state || '')}`;
    const tokenRes  = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('[naver] 토큰 실패:', tokenData);
      return res.status(401).json({ error: '네이버 토큰 발급 실패' });
    }

    // 2. 프로필 조회
    const profRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profData = await profRes.json();
    const np = profData.response;
    if (!np?.id) return res.status(401).json({ error: '네이버 프로필 조회 실패' });

    // 3. 안정적인 네이버 ID로 로그인/가입 처리
    const provider = 'naver';
    const authId   = np.id;            // 네이버 고유 ID (재로그인 시 동일)
    const email    = np.email || null;
    const userId   = `${provider}:${authId}`;

    if (!process.env.DATABASE_URL) {
      return res.json({ userId, isNew: true, isComplete: false, user: null, email });
    }

    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (rows.length > 0) {
      const user = rows[0];
      const isComplete = !!(user.nickname);
      return res.json({ userId, isNew: false, isComplete, user, email });
    }
    await db.query(
      'INSERT INTO users (id, auth_provider, auth_id, email) VALUES ($1, $2, $3, $4)',
      [userId, provider, authId, email]
    );
    res.json({ userId, isNew: true, isComplete: false, user: null, email });
  } catch (e) {
    console.error('[naver] 콜백 오류:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/** 사용자 프로필 저장/업데이트 */
app.post('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { nickname, email, gender, birthYear, interests, regionGu, regionLabel } = req.body;

  if (!process.env.DATABASE_URL) return res.json({ ok: true });

  try {
    await db.query(`
      UPDATE users SET
        nickname     = COALESCE($2, nickname),
        email        = COALESCE($3, email),
        gender       = COALESCE($4, gender),
        birth_year   = COALESCE($5, birth_year),
        interests    = COALESCE($6, interests),
        region_gu    = COALESCE($7, region_gu),
        region_label = COALESCE($8, region_label),
        updated_at   = NOW()
      WHERE id = $1
    `, [id, nickname, email, gender, birthYear, JSON.stringify(interests), regionGu, regionLabel]);

    res.json({ ok: true });
  } catch (e) {
    console.error('[db] update user error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/** 사용자 프로필 조회 */
app.get('/users/:id', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.status(404).json({ error: 'DB 없음' });
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: '유저 없음' });
    const u = rows[0];
    res.json({
      id: u.id, nickname: u.nickname, email: u.email,
      gender: u.gender, birthYear: u.birth_year,
      interests: u.interests ? JSON.parse(u.interests) : [],
      regionGu: u.region_gu, regionLabel: u.region_label,
      isPremium: u.is_premium,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** 회원 탈퇴 — 개인정보보호법: 식별정보 Hard Delete + 보관의무 로그 비식별화 트랜잭션 */
app.delete('/users/:id', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ ok: true });
  const r = await legal.withdrawUser(db, req.params.id);
  // 채팅 영속화 연동: 탈퇴자 발신메시지 비식별화(상대 대화맥락은 보존) — best-effort
  try { await chat.scrubUserFromChats(db, req.params.id); } catch (e) { console.warn('[chat] scrub 실패:', e.message); }
  // 푸시 토큰 제거 (삭제된 계정에 푸시 방지) — best-effort
  try { await pushtokens.deleteByUserId(db, req.params.id); } catch (e) { console.warn('[push] token 삭제 실패:', e.message); }
  if (r.ok) return res.json({ ok: true, deleted: r.deletedUser });
  console.error('[users] 탈퇴 오류:', r.error);
  return res.status(500).json({ error: r.error || 'withdraw_failed' });
});

/** 위치기반서비스 이용약관 동의/철회 (위치정보법) — 동의해야 위치 수집·매칭 가능 */
app.post('/users/:id/location-consent', async (req, res) => {
  const agreed = req.body?.agreed === true || req.body?.agreed === 'true';
  const ok = await legal.setLocationConsent(db, req.params.id, agreed);
  res.json({ ok, locationConsent: agreed });
});

/** 프리미엄 상태 업데이트 */
app.patch('/users/:id/premium', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ ok: true });
  try {
    await db.query('UPDATE users SET is_premium = $2, updated_at = NOW() WHERE id = $1',
      [req.params.id, req.body.isPremium]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** 본인인증 완료 — 성별/생년 저장 + 인증 마크 */
app.patch('/users/:id/verify', async (req, res) => {
  const { gender, birthYear, phone } = req.body;
  if (!gender || !birthYear) return res.status(400).json({ error: 'gender, birthYear 필수' });
  if (!process.env.DATABASE_URL) {
    return res.json({ ok: true, isVerified: true });
  }
  try {
    await db.query('UPDATE users SET phone = COALESCE($2, phone), updated_at = NOW() WHERE id = $1',
      [req.params.id, phone || null]);
    // 청소년보호법: 성인여부 판정·반영 + 세션 JWT 발급
    const r = await legal.setAdultVerified(db, req.params.id, { provider: 'self', birth: birthYear, gender });
    res.json({ ok: true, isVerified: true, adultVerified: r.adult, token: r.token || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 포트원 본인인증 검증 ──────────────────────────────────────
app.post('/auth/portone-verify', async (req, res) => {
  const { identityVerificationId, userId } = req.body;
  if (!identityVerificationId) {
    return res.status(400).json({ error: 'identityVerificationId required' });
  }

  try {
    // ── PortOne V2 인증결과 조회 ──────────────────────────────
    const secret = process.env.PORTONE_V2_API_SECRET;
    if (!secret) {
      console.error('[PortOne V2] PORTONE_V2_API_SECRET 미설정');
      return res.status(500).json({ error: '서버 본인인증 설정이 필요합니다 (API Secret).' });
    }
    const r = await fetch(
      `https://api.portone.io/identity-verifications/${encodeURIComponent(identityVerificationId)}`,
      { headers: { Authorization: `PortOne ${secret}` } }
    );
    const data = await r.json();

    if (data.status !== 'VERIFIED' || !data.verifiedCustomer) {
      console.warn('[PortOne V2] 미인증:', data.status, data.message || '');
      return res.status(400).json({ error: '인증되지 않은 요청입니다.' });
    }
    const c = data.verifiedCustomer;
    const name   = c.name;
    const birth  = (c.birthDate || '').replace(/-/g, '');             // YYYY-MM-DD → YYYYMMDD
    const gender = (c.gender === 'MALE') ? 'male' : 'female';
    const phone  = (c.phoneNumber || '').replace(/[^0-9]/g, '');

    // ── DB 업데이트 (성인인증 반영 + 전화 저장) ──────────────────
    // ⚠️ 기존 버그 수정: 'pool'(undefined)·없는 컬럼(name/birth_date) 사용 → db + 실제 컬럼으로 교체.
    let sessionToken = null;
    if (userId) {
      try { await db.query('UPDATE users SET phone=$1, updated_at=NOW() WHERE id=$2', [phone, userId]); } catch {}
      const r = await legal.setAdultVerified(db, userId, { provider: 'portone', birth, gender });
      sessionToken = r.token || null;   // 청소년보호법: 성인여부 JWT 반영
    }

    console.log(`[PortOne] ✅ 인증 완료 → ${name} (${birth}) ${gender} ${phone} adult-token=${!!sessionToken}`);
    res.json({ success: true, name, birth, gender, phone, token: sessionToken });
  } catch (e) {
    console.error('[PortOne] 오류:', e.message);
    res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
});

// ─── 휴대폰 OTP 발송 ────────────────────────────────────────
const phoneOtpStore = new Map(); // phone → { code, expiresAt }

app.post('/auth/send-phone-otp', async (req, res) => {
  const { phone, userId } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  phoneOtpStore.set(phone, { code, expiresAt: Date.now() + 3 * 60 * 1000 });

  // 솔라피 SMS 발송
  const solapiKey    = process.env.SOLAPI_API_KEY;
  const solapiSecret = process.env.SOLAPI_API_SECRET;
  const solapiFrom   = process.env.SOLAPI_FROM_NUMBER; // 발신번호 (등록된 번호)

  if (!solapiKey || !solapiSecret || !solapiFrom) {
    console.log(`[Phone OTP] 솔라피 미설정 — devCode=${code}`);
    return res.json({ success: true, devCode: code }); // 환경변수 미설정 시 개발용
  }

  try {
    const { SolapiMessageService } = require('solapi');
    const service = new SolapiMessageService(solapiKey, solapiSecret);
    const formattedPhone = phone.startsWith('0') ? phone : '0' + phone.replace(/^\+82/, '');
    await service.send({
      to: formattedPhone,
      from: solapiFrom,
      text: `[Locotalk] 본인인증 코드: ${code} (3분 내 입력)`,
    });
    console.log(`[Phone OTP] ✅ 솔라피 SMS 발송 → ${phone}`);
  } catch (e) {
    console.error(`[Phone OTP] SMS 발송 실패:`, e.message);
    return res.status(500).json({ error: 'SMS 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' });
  }

  res.json({ success: true });
});

app.post('/auth/verify-phone-otp', async (req, res) => {
  const { phone, code, userId } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'phone and code required' });

  const stored = phoneOtpStore.get(phone);
  if (!stored) return res.status(400).json({ error: '인증번호를 먼저 요청해주세요' });
  if (Date.now() > stored.expiresAt) {
    phoneOtpStore.delete(phone);
    return res.status(400).json({ error: '인증번호가 만료되었습니다' });
  }
  if (stored.code !== String(code)) {
    return res.status(400).json({ error: '인증번호가 맞지 않습니다' });
  }

  phoneOtpStore.delete(phone);

  // DB 업데이트 (있는 경우)
  if (process.env.DATABASE_URL && userId) {
    try {
      await db.query(
        `UPDATE users SET phone = $1, is_verified = true, verified_at = NOW() WHERE id = $2`,
        [phone, userId]
      ).catch(() => {});
    } catch {}
  }

  console.log(`[Phone OTP] ✅ 인증 완료 → ${phone}`);
  res.json({ success: true });
});

// 개인정보처리방침 (위치기반서비스 약관 동의 모달 등에서 링크) — docs/ HTML 서빙
app.get('/privacy', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'docs', 'privacy-policy.html'),
    (err) => { if (err) res.status(404).send('privacy policy not found'); });
});
app.get('/privacy/en', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'docs', 'privacy-policy-en.html'),
    (err) => { if (err) res.status(404).send('not found'); });
});

app.get('/health', (_req, res) => {
  res.json({
    status  : 'ok',
    queue   : queue.size,
    standby : standby.size,
    rooms   : rooms.size,
    online  : io.engine.clientsCount,
  });
});

// 서버 외부 IP 확인용 (Solapi IP 허용 설정용)
app.get('/server-ip', async (_req, res) => {
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    const d = await r.json();
    res.json({ ip: d.ip });
  } catch { res.json({ ip: 'unknown' }); }
});

// ─── 디버그 엔드포인트 ────────────────────────────────────────────
// ⚠️ 공개 출시 전 OFF/제거 예정. 무인증 노출 금지 — 게이트:
//    ENABLE_DEBUG=true(기본 OFF) 또는 ?key=<DEBUG_KEY env>. 둘 다 없으면 403.
//    (기존 /debug/tokens(원본토큰)·/debug/push 도 함께 게이트해 노출 차단)
app.use('/debug', (req, res, next) => {
  const enabled = process.env.ENABLE_DEBUG === 'true';
  const keyOk   = !!process.env.DEBUG_KEY && req.query.key === process.env.DEBUG_KEY;
  if (enabled || keyOk) return next();
  return res.status(403).json({ error: 'debug_disabled' });
});

// 등록된 토큰 목록 확인
app.get('/debug/tokens', (_req, res) => {
  const tokens = Object.fromEntries(pushTokensByNick);
  res.json({ count: pushTokensByNick.size, tokens });
});

// 푸시토큰 DB 적재 확인 (원본 토큰·닉 미노출). ?userId=<test> 면 존재/갱신시각만.
app.get('/debug/pushtokens', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ db: false });
  if (req.query.userId) return res.json(await pushtokens.checkUserToken(db, String(req.query.userId)));
  res.json(await pushtokens.statsPushTokens(db));
});

// 채팅 영속 적재 카운트
app.get('/debug/chat', async (_req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ db: false });
  res.json(await chat.statsChat(db));
});

// 법령준수 로그 카운트 확인 (운영 점검용)
app.get('/debug/legal', async (_req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ db: false });
  try {
    const loc = await db.query('SELECT COUNT(*)::int c, MIN(used_at) oldest FROM location_history_log');
    const acc = await db.query('SELECT COUNT(*)::int c, MIN(event_at) oldest FROM access_log');
    const adult = await db.query('SELECT COUNT(*)::int c FROM users WHERE adult_verified = TRUE');
    const cons  = await db.query('SELECT COUNT(*)::int c FROM users WHERE location_consent = TRUE');
    res.json({
      db: true,
      locationLog: loc.rows[0], accessLog: acc.rows[0],
      adultVerifiedUsers: adult.rows[0].c, locationConsentUsers: cons.rows[0].c,
      retentionDays: { location: legal.LOCATION_RETENTION_DAYS, access: legal.ACCESS_RETENTION_DAYS },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 특정 닉에게 테스트 push 전송
// 사용: curl -X POST http://localhost:4000/debug/push/닉네임
app.post('/debug/push/:nick', async (req, res) => {
  const { nick } = req.params;
  const token    = pushTokensByNick.get(nick);
  if (!token) {
    return res.status(404).json({ error: `no token for "${nick}"`, registered: [...pushTokensByNick.keys()] });
  }
  try {
    const fetchRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body   : JSON.stringify({
        to              : token,
        title           : '🔔 테스트 알림',
        body            : `${nick}에게 보낸 테스트 메시지입니다`,
        sound           : 'default',
        priority        : 'high',
        _contentAvailable: true,
        channelId       : 'default',
      }),
    });
    const json = await fetchRes.json();
    console.log(`[debug] test push to ${nick}:`, JSON.stringify(json));
    res.json({ token, expoResponse: json });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── In-memory state ──────────────────────────────────────────────
const queue              = new Map(); // socketId → QueueEntry
const standby            = new Map(); // socketId → StandbyEntry
const pendingMatches     = new Map(); // requestId → PendingMatch
const pendingFromSockets = new Set(); // socketIds that sent a pending standby→standby request
const rooms              = new Map(); // roomId → Room
const socketToRoom       = new Map(); // socketId → roomId
const reconnectTimers    = new Map(); // socketId → { timer, roomId }

// ─── 서버단 매칭 히스토리 (재매칭 방지) ──────────────────────────────
// nick → Set<matchedNick>  (세션 내 유지, 서버 재시작 시 초기화)
const serverMatchHistory = new Map();

// ─── 채팅 저장 (프리미엄 전용) ────────────────────────────────────────
// roomId → Message[]  (최대 200개, 서버 재시작 시 초기화)
const chatLogs = new Map();
const MAX_CHAT_LOG = 200;

// 오프라인 재전송 버퍼 한도 (방별, 이미지 base64 포함이라 과도하게 크지 않게)
const MAX_ROOM_EVENTS = 40;
/** 방 이벤트 버퍼에 기록 (rejoin 시 누락분 재전송용) */
function recordRoomEvent(room, id, kind, payload) {
  if (!room) return;
  if (!Array.isArray(room.events)) room.events = [];
  room.events.push({ id, kind, payload, at: Date.now() });
  if (room.events.length > MAX_ROOM_EVENTS) room.events.shift();
}

// ─── 신고 카운트 ──────────────────────────────────────────────────────
// nick → 신고 횟수
const reportCounts = new Map();

/**
 * pushTokensByNick: nick → expoToken
 * 앱 종료 후 소켓이 끊겨도 토큰을 nick 기준으로 유지합니다.
 */
const pushTokensByNick = new Map();

/**
 * regionFeeds: region → FeedItem[]  (최신순, 최대 100개)
 * 새로 접속한 유저에게 동네 피드 히스토리 전송용
 */
const regionFeeds = new Map();

// ─── 서버 재시작 후에도 토큰·피드 유지 (JSON 파일 영속화) ────────────
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  try {
    const raw  = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (data.pushTokens) {
      Object.entries(data.pushTokens).forEach(([nick, token]) =>
        pushTokensByNick.set(nick, token));
    }
    if (data.feeds) {
      Object.entries(data.feeds).forEach(([region, posts]) =>
        regionFeeds.set(region, posts));
    }
    console.log(`[data] ✅ loaded  tokens=${pushTokensByNick.size}  feeds=${regionFeeds.size}`);
  } catch {
    console.log('[data] no saved data — starting fresh');
  }
}

let _savePending = false;
function saveData() {
  if (_savePending) return;
  _savePending = true;
  setTimeout(() => {
    _savePending = false;
    const payload = JSON.stringify({
      pushTokens: Object.fromEntries(pushTokensByNick),
      feeds      : Object.fromEntries(regionFeeds),
    });
    fs.writeFile(DATA_FILE, payload, (err) => {
      if (err) console.warn('[data] save failed', err.message);
    });
  }, 2000); // 2초 디바운스
}

loadData(); // 서버 시작 시 즉시 로드

// ─── Helpers ──────────────────────────────────────────────────────
function koreanTime() {
  return new Date().toLocaleTimeString('ko-KR', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// 주어진 시각(Date/ISO)을 채팅 표시용 한국시간 문자열로 (DB 복원 메시지용)
function fmtKoreanTime(d) {
  try {
    return new Date(d).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return ''; }
}

// 요청자 등급(프리미엄) DB 조회 — room 캐시 대신 진실의 원천(DB) 기준 (chat 가시범위 판정)
async function isUserPremium(userId) {
  if (!userId || !process.env.DATABASE_URL) return false;
  try {
    const { rows } = await db.query('SELECT is_premium FROM users WHERE id = $1', [userId]);
    return rows[0]?.is_premium === true;
  } catch { return false; }
}

function validate(user) {
  if (!user || typeof user !== 'object')               return '잘못된 데이터예요';
  if (!user.nick || user.nick.length > 8)              return '닉네임이 올바르지 않아요';
  if (!Array.isArray(user.interests))                  return '관심사 형식이 잘못됐어요';
  if (!user.region || typeof user.region !== 'string') return '지역 정보가 없어요';
  return null;
}

/**
 * Haversine 공식으로 두 좌표 간 거리 계산 (km)
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 두 유저가 매칭 가능한 거리인지 확인
 *  - 무료 유저: 6km 이내 (좌표 없으면 같은 구 기준)
 *  - 프리미엄 유저: 거리 제한 없음
 */
const FREE_RADIUS_KM = 6;

function isWithinMatchRange(userA, userB) {
  if (userA.isPremium || userB.isPremium) return true;
  if (userA.lat && userA.lng && userB.lat && userB.lng) {
    const dist = haversineKm(userA.lat, userA.lng, userB.lat, userB.lng);
    return dist <= FREE_RADIUS_KM;
  }
  return userA.region === userB.region;
}

/**
 * 매칭 점수 계산 (0 ~ 100)
 * ─────────────────────────────────────────────────────
 * 공통 관심사 3개 : +45
 * 공통 관심사 2개 : +30
 * 공통 관심사 1개 : +15
 * 같은 구(region) : +20
 * 프리미엄 유저   : +20 (둘 중 하나라도)
 * 대기 시간 보정  : 1분당 +1 (최대 +15 → 15분 대기)
 * 재매칭 페널티   : -30 (이전에 매칭된 적 있으면)
 */
function calcMatchScore(userA, userB) {
  let score = 0;

  // 공통 관심사
  const intA = new Set(userA.interests || []);
  const common = (userB.interests || []).filter(i => intA.has(i)).length;
  score += [0, 15, 30, 45][Math.min(common, 3)];

  // 같은 구
  if (userA.region === userB.region) score += 20;

  // 프리미엄
  if (userA.isPremium || userB.isPremium) score += 20;

  // 대기 시간 보정 (B 기준)
  const waitMin = Math.floor((Date.now() - userB.joinedAt) / 60000);
  score += Math.min(waitMin, 15);

  // 재매칭 페널티
  const histA = serverMatchHistory.get(userA.nick) || new Set();
  const histB = serverMatchHistory.get(userB.nick) || new Set();
  if (histA.has(userB.nick) || histB.has(userA.nick)) score -= 30;

  return score;
}

/** 서버단 매칭 히스토리 기록 */
function recordMatchHistory(nickA, nickB) {
  if (!serverMatchHistory.has(nickA)) serverMatchHistory.set(nickA, new Set());
  if (!serverMatchHistory.has(nickB)) serverMatchHistory.set(nickB, new Set());
  serverMatchHistory.get(nickA).add(nickB);
  serverMatchHistory.get(nickB).add(nickA);
}

/** 공통 Expo Push 발송 — 응답 로깅 포함 */
async function _sendExpoPush(payload, label) {
  try {
    const res    = await fetch('https://exp.host/--/api/v2/push/send', {
      method : 'POST',
      headers: {
        'Content-Type'   : 'application/json',
        'Accept'         : 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(payload),
    });
    const json   = await res.json();
    const result = json?.data;
    if (result?.status === 'error') {
      console.warn(`[push] ❌ ${label}: ${result.message} (${result.details?.error})`);
      return false;
    }
    console.log(`[push] ✅ ${label}  id=${result?.id ?? '?'}`);
    return true;
  } catch (e) {
    console.warn(`[push] ❌ ${label} 전송 실패:`, e.message);
    return false;
  }
}

/** 수신자 토큰 조회 — DB(userId) 우선, 인메모리(nick) 폴백. (배포 생존 + 닉 충돌 제거) */
async function resolvePushToken(userId, nick) {
  const dbToken = await pushtokens.getTokenByUserId(db, userId);
  return dbToken || pushTokensByNick.get(nick) || null;
}

/** 매칭 요청 push — 앱이 닫혀 있어도 잠금 화면에 알림 */
async function sendMatchRequestPush(toNick, fromNick, fromRegion, requestId, toUserId) {
  const token = await resolvePushToken(toUserId, toNick);
  if (!token) {
    console.warn(`[push] ⚠️  no token for ${toNick}/${toUserId || 'no-uid'} (match_request) — skipped`);
    return;
  }
  await _sendExpoPush({
    to              : token,
    title           : `${fromNick}님의 채팅 요청`,
    body            : `${fromRegion}의 이웃이 채팅을 요청했어요! 지금 수락하세요 ✨`,
    data            : { type: 'match_request', requestId, fromNick, fromRegion },
    sound           : 'default',
    priority        : 'high',
    _contentAvailable: true,
    channelId       : 'default',
  }, `match_request→${toNick}`);
}

/** 채팅 메시지 push (앱이 종료/백그라운드/화면꺼짐 상태에서도 전달) */
async function sendPushToNick(recipientNick, senderNick, text, recipientUserId) {
  const token = await resolvePushToken(recipientUserId, recipientNick);
  if (!token) {
    console.warn(`[push] ⚠️  no token for ${recipientNick}/${recipientUserId || 'no-uid'} — push skipped`);
    return;
  }
  await _sendExpoPush({
    to               : token,
    title            : senderNick,
    body             : text.length > 80 ? text.slice(0, 77) + '…' : text,
    data             : { type: 'chat_message' },
    sound            : 'default',
    priority         : 'high',          // iOS 화면꺼짐/백그라운드 즉시 전달
    // ⚠️ _contentAvailable(=content-available:1)는 "무음 백그라운드 푸시" 플래그라
    //    잠금화면/타앱 사용 중 가시 배너가 억제될 수 있음 → 채팅은 가시 알림으로 발송.
    badge            : 1,
    channelId        : 'default',       // Android 채널 (MAX importance)
  }, `chat→${recipientNick}`);
}

/**
 * 방 생성 + 양쪽에 이벤트 전송
 * eventA: 능동 사용자 또는 standby→standby 요청자에게 보낼 이벤트
 * eventB: 수락한 수동 사용자에게 보낼 이벤트
 */
function createRoom(socketA, userA, socketIdB, userB,
                    eventA = 'match_found', eventB = 'passive_match_found') {
  const roomId = 'room-' + uuidv4();

  queue.delete(socketA.id);
  queue.delete(socketIdB);

  const room = {
    roomId,
    sockets  : [socketA.id, socketIdB],
    users    : [userA, userB],
    createdAt: Date.now(),
    // 오프라인(종료/잠금) 중 도착한 메시지/이미지 재전송용 버퍼 (rejoin 시 누락분 전달)
    events   : [],                 // { id, kind:'msg'|'img', payload, at }
    disconnectedAt: [null, null],  // userIdx 별 마지막 끊김 시각
  };
  rooms.set(roomId, room);
  socketToRoom.set(socketA.id, roomId);
  socketToRoom.set(socketIdB, roomId);

  // 채팅 영속화: 대화방 레코드 생성(conversation id = roomId 재사용). userId 없으면 null 저장(best-effort)
  chat.upsertConversation(db, { roomId, userAId: userA.userId || null, userBId: userB.userId || null });

  socketA.join(roomId);
  io.sockets.sockets.get(socketIdB)?.join(roomId);

  // 두 유저 모두 좌표가 있으면 거리 계산 (프리미엄 전용 표시용)
  // ⚠️ 스토킹 방지: 정확 좌표·정확 거리는 절대 노출 금지 → 500m 단위 버킷으로 가공 후 전달
  let distanceKm = null;
  if (userA.lat && userA.lng && userB.lat && userB.lng) {
    distanceKm = legal.fuzzDistanceKm(haversineKm(userA.lat, userA.lng, userB.lat, userB.lng));
  }

  // 프리미엄 유저에게만 상대 성별/생년 공개
  const peerForA = {
    nick: userB.nick, interests: userB.interests, region: userB.region, roomId, distanceKm,
    isVerified: userB.isVerified || false,
    gender: userA.isPremium ? (userB.gender || null) : null,
    birthYear: userA.isPremium ? (userB.birthYear || null) : null,
  };
  const peerForB = {
    nick: userA.nick, interests: userA.interests, region: userA.region, roomId, distanceKm,
    isVerified: userA.isVerified || false,
    gender: userB.isPremium ? (userA.gender || null) : null,
    birthYear: userB.isPremium ? (userA.birthYear || null) : null,
  };

  socketA.emit(eventA,       { roomId, peer: peerForA });
  io.to(socketIdB).emit(eventB, { roomId, peer: peerForB });

  // 서버단 매칭 히스토리 기록
  recordMatchHistory(userA.nick, userB.nick);

  // 채팅 로그 초기화 (프리미엄 유저 있으면 저장 활성)
  const hasPremium = userA.isPremium || userB.isPremium;
  if (hasPremium) {
    chatLogs.set(roomId, []);
  }

  console.log(`[match] ${userA.nick} ↔ ${userB.nick}  room=${roomId}  premium=${hasPremium}  [${eventA}/${eventB}]`);

  // 통신비밀보호법: 대화방(매칭) 생성 시점 접속로그 — 양측 IP/기기/시점 기록 (수사기관 대응)
  const sa = io.sockets.sockets.get(socketA.id);
  const sb = io.sockets.sockets.get(socketIdB);
  legal.logAccess(db, { eventType: 'ROOM_CREATED', userId: userA.userId, nick: userA.nick,
    ip: sa?._ip, deviceId: sa?._deviceId, deviceInfo: sa?._deviceInfo, roomId, peerNick: userB.nick });
  legal.logAccess(db, { eventType: 'ROOM_CREATED', userId: userB.userId, nick: userB.nick,
    ip: sb?._ip, deviceId: sb?._deviceId, deviceInfo: sb?._deviceInfo, roomId, peerNick: userA.nick });
  return true;
}

/**
 * queue → queue 매칭 (능동 사용자끼리)
 * 바로 방을 만들지 않고 match_request 흐름을 거쳐야
 * 상대가 오프라인이어도 push 알림이 가고, 수락 후 채팅이 시작됩니다.
 */
function tryMatch(socket, user) {
  const candidates = [...queue.entries()].filter(([id]) => id !== socket.id);
  if (candidates.length === 0) return false;

  // 1. 거리 필터
  const inRange = candidates.filter(([, c]) => isWithinMatchRange(user, c));
  if (inRange.length === 0) return false;

  // 2. 차단 유저 서버단 제외
  const blockedByA = new Set(user.blockedUsers || []);
  const eligible = inRange.filter(([, c]) => {
    const blockedByC = new Set(c.blockedUsers || []);
    return !blockedByA.has(c.nick) && !blockedByC.has(user.nick);
  });
  if (eligible.length === 0) return false;

  // 2.5 지인 매칭 피하기 (프리미엄) — 전화번호 해시로 연락처에 있는 상대 양방향 제외
  const myContactSet = (user.avoidContacts && user.contactHashes?.length)
    ? new Set(user.contactHashes) : null;
  const eligible2 = eligible.filter(([, c]) => {
    // A가 켰고 상대(c) 번호가 A 연락처에 있으면 제외
    if (myContactSet && c.phoneHash && myContactSet.has(c.phoneHash)) return false;
    // 상대(c)가 켰고 A 번호가 c 연락처에 있으면 제외
    if (c.avoidContacts && user.phoneHash && c.contactHashes?.length
        && c.contactHashes.includes(user.phoneHash)) return false;
    return true;
  });
  if (eligible2.length === 0) return false;

  // 3. 매칭 점수 계산 후 내림차순 정렬
  const scored = eligible2.map(([id, c]) => ({
    id, candidate: c,
    score: calcMatchScore(user, c),
  }));
  scored.sort((a, b) => b.score - a.score);

  const { id: candidateId, candidate, score: matchScore } = scored[0];
  const commonInts = (user.interests||[]).filter(i => (candidate.interests||[]).includes(i));
  console.log(`[match] 🎯 ${user.nick}↔${candidate.nick}  score=${matchScore}  공통관심사=[${commonInts.join(',')||'없음'}]`);

  const requestId      = uuidv4();
  const PENDING_TIMEOUT = 60 * 1000; // 60초 — 앱 재시작 후 수락 허용

  const timer = setTimeout(() => {
    pendingMatches.delete(requestId);
    pendingFromSockets.delete(socket.id);
    // 타임아웃 시 둘 다 큐로 복귀
    if (!socketToRoom.has(socket.id))    queue.set(socket.id,    { ...user,      joinedAt: Date.now() });
    if (!socketToRoom.has(candidateId))  queue.set(candidateId,  { ...candidate, joinedAt: Date.now() });
    console.log(`[queue] ⏱ request ${requestId} timed out, both returned to queue`);
  }, PENDING_TIMEOUT);

  pendingMatches.set(requestId, {
    requestId,
    fromSocketId: socket.id,
    toSocketId  : candidateId,
    fromUser    : user,
    toUser      : candidate,
    timer,
    fromPassive : false,
    toFromQueue : true,   // 수락자도 queue 출신
  });

  pendingFromSockets.add(socket.id);
  queue.delete(socket.id);    // 대기 중엔 queue 에서 제거 (pendingFromSockets 상태)
  queue.delete(candidateId);  // 수락 대기자도 queue 에서 제거

  io.to(candidateId).emit('match_request', {
    requestId,
    fromNick    : user.nick,
    fromInterest: user.interests?.[0] || '',
    fromRegion  : user.region,
  });
  sendMatchRequestPush(candidate.nick, user.nick, user.region, requestId, candidate.userId);

  console.log(`[queue] 📨 ${user.nick} → ${candidate.nick}  req=${requestId}  queue↔queue`);
  return true;
}

/**
 * queue/standby → standby 매칭 요청
 * fromPassive=true 이면 요청자도 passive_match_found 를 받음 (standby→standby)
 */
function requestToStandby(fromSocket, fromUser, fromPassive = false) {
  // 지인 매칭 피하기 (프리미엄) — 연락처 해시 양방향 제외
  const myContactSet = (fromUser.avoidContacts && fromUser.contactHashes?.length)
    ? new Set(fromUser.contactHashes) : null;
  // standby 풀에서 자신 및 이미 pending 인 소켓 제외 + 지인 제외
  const candidates = [...standby.entries()]
    .filter(([id]) => id !== fromSocket.id)
    .filter(([, c]) => {
      if (myContactSet && c.phoneHash && myContactSet.has(c.phoneHash)) return false;
      if (c.avoidContacts && fromUser.phoneHash && c.contactHashes?.length
          && c.contactHashes.includes(fromUser.phoneHash)) return false;
      return true;
    });
  if (candidates.length === 0) return false;

  const sameRegion = candidates.filter(([, c]) => c.region === fromUser.region);
  const pool       = sameRegion.length > 0 ? sameRegion : candidates;
  pool.sort((a, b) => a[1].joinedAt - b[1].joinedAt);

  const [candidateId, candidate] = pool[0];
  const requestId = uuidv4();

  const PENDING_TIMEOUT = 60 * 1000; // 60초 — 앱 재시작 후 수락 허용
  const timer = setTimeout(() => {
    pendingMatches.delete(requestId);
    pendingFromSockets.delete(fromSocket.id);
    console.log(`[standby] ⏱ request ${requestId} timed out`);
  }, PENDING_TIMEOUT);

  pendingMatches.set(requestId, {
    requestId,
    fromSocketId: fromSocket.id,
    toSocketId  : candidateId,
    fromUser,
    toUser      : candidate,
    timer,
    fromPassive,         // standby→standby 여부
  });

  pendingFromSockets.add(fromSocket.id);
  standby.delete(candidateId); // 응답 대기 중엔 standby 풀에서 제거

  io.to(candidateId).emit('match_request', {
    requestId,
    fromNick    : fromUser.nick,
    fromInterest: fromUser.interests?.[0] || '',
    fromRegion  : fromUser.region,
  });

  // 앱이 닫혀 있거나 화면이 꺼져 있어도 수신할 수 있도록 push 발송
  sendMatchRequestPush(candidate.nick, fromUser.nick, fromUser.region, requestId, candidate.userId);

  console.log(`[standby] 📨 ${fromUser.nick} → ${candidate.nick}  req=${requestId}  passive=${fromPassive}`);
  return true;
}

/**
 * Feature 5: 연결 끊김 시 grace period
 * - 화면 꺼짐/백그라운드로 인한 소켓 단절은 정상이므로 상대에게 알리지 않음
 * - GRACE_MS 내 rejoin → 상대방에게 'peer_reconnected'
 * - GRACE_MS 경과 → 방 제거 + 상대방에게 'peer_disconnected' (최종)
 */
const GRACE_MS = 30 * 60 * 1000; // 30분 — 앱 재시작 후 재진입 허용

function handleDisconnectFromRoom(socketId) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) {
    socketToRoom.delete(socketId);
    return;
  }

  // 끊긴 유저 인덱스의 disconnectedAt 기록 (rejoin 시 이 시각 이후 이벤트 재전송)
  const idx = room.sockets.indexOf(socketId);
  if (idx !== -1) {
    if (!Array.isArray(room.disconnectedAt)) room.disconnectedAt = [null, null];
    room.disconnectedAt[idx] = Date.now();
  }

  const existing = reconnectTimers.get(socketId);
  if (existing) {
    clearTimeout(existing.timer);
    // softTimer 제거됨 — peer_temporarily_disconnected 더 이상 전송 안 함
  }

  const timer = setTimeout(() => {
    reconnectTimers.delete(socketId);
    const r = rooms.get(roomId);
    if (!r) return;
    const oid = r.sockets.find(id => id !== socketId);
    if (oid) io.to(oid).emit('peer_disconnected');
    r.sockets.forEach(id => { socketToRoom.delete(id); });
    rooms.delete(roomId);
    console.log(`[room] 🗑  ${roomId} cleaned up after grace period`);
  }, GRACE_MS);

  reconnectTimers.set(socketId, { timer, roomId });
  console.log(`[room] 🔌 ${socketId} disconnected from ${roomId}, grace=${GRACE_MS/1000}s`);
}

function cleanupRoom(roomId, leavingSocketId) {
  const room = rooms.get(roomId);
  if (!room) return;

  // 타이머 전체 취소
  room.sockets.forEach(id => {
    const t = reconnectTimers.get(id);
    if (t) { clearTimeout(t.timer); reconnectTimers.delete(id); }
  });

  // ⚠️ 나가는 쪽만 socketToRoom 에서 제거
  // 남은 쪽은 직접 leave_room 을 보내기 전까지 socketToRoom 에 유지 → 재매칭 방지
  socketToRoom.delete(leavingSocketId);
  io.sockets.sockets.get(leavingSocketId)?.leave(roomId);

  rooms.delete(roomId);

  const otherId = room.sockets.find(id => id !== leavingSocketId);
  if (otherId) io.to(otherId).emit('peer_left');
  console.log(`[room] 🚪 ${leavingSocketId} left ${roomId}, other=${otherId || 'none'}`);
}

/**
 * send_message/send_image 진입 시 발신 소켓이 방 멤버인지 확인.
 * 소켓이 조용히 재연결돼 socket.id 가 바뀐 경우(네트워크 끊김·짧은 백그라운드 등
 * rejoin_room 이 안 온 상황) nick 으로 방 멤버를 찾아 self-heal 재바인딩합니다.
 * → 이게 없으면 발신자 메시지가 서버에서 조용히 버려져 상대 채팅·푸시 모두 안 감.
 * @returns {{room, senderIdx}|null}
 */
function resolveRoomForSender(socket, roomId, nick) {
  const room = rooms.get(roomId);
  if (!room) return null;

  let idx = room.sockets.indexOf(socket.id);
  if (idx !== -1) return { room, senderIdx: idx };

  // 소켓 id 가 방에 없음 → nick 으로 멤버 찾아 재바인딩
  if (!nick) return null;
  idx = room.users.findIndex(u => u.nick === nick);
  if (idx === -1) return null;

  const oldId = room.sockets[idx];
  const t = reconnectTimers.get(oldId);
  if (t) { clearTimeout(t.timer); reconnectTimers.delete(oldId); }

  room.sockets[idx] = socket.id;
  room.users[idx].socketId = socket.id;
  socketToRoom.delete(oldId);
  socketToRoom.set(socket.id, roomId);
  socket.join(roomId);

  const otherId = room.sockets.find(id => id !== socket.id);
  if (otherId) io.to(otherId).emit('peer_reconnected');
  console.log(`[room] 🔧 self-heal rebind ${nick} (${oldId} → ${socket.id}) room=${roomId}`);
  return { room, senderIdx: idx };
}

/**
 * 재배포 등으로 인메모리 room 이 사라진 뒤에도 '이어쓰기'가 되도록 DB conversation 으로 방 부활.
 *  - 인메모리에 있으면 그대로 반환.
 *  - 없으면 DB conversation 조회 → 요청자(socket.userId)가 참여자일 때만 부활.
 *  - 부활 시 '호출 소켓만' 방에 join(상대 강제 join 금지 — 상대는 본인 rejoin 때 nick로 바인딩,
 *    그 전엔 푸시+get_chat_history(DB)로 수신). conversations status='active' upsert.
 *  - best-effort: DB 없거나 비참여자면 null 반환(기존 흐름 유지).
 * @returns {Room|null}
 */
async function reviveRoomFromDB(socket, roomId) {
  if (rooms.has(roomId)) return rooms.get(roomId);
  if (!process.env.DATABASE_URL) return null;
  const me = socket.userId || null;
  if (!me) return null;
  let conv = null;
  try { conv = (await db.query('SELECT user_a_id, user_b_id FROM conversations WHERE id = $1', [roomId])).rows[0] || null; } catch {}
  if (!conv) return null;
  if (conv.user_a_id !== me && conv.user_b_id !== me) return null; // 참여자만(IDOR 방지)
  const peerId = conv.user_a_id === me ? conv.user_b_id : conv.user_a_id;
  let myNick = null, peerNick = null;
  try {
    const ids = [me, peerId].filter(Boolean);
    const nrows = ids.length ? (await db.query('SELECT id, nickname FROM users WHERE id = ANY($1)', [ids])).rows : [];
    const nk = id => nrows.find(r => r.id === id)?.nickname || null;
    myNick = nk(me); peerNick = nk(peerId);
  } catch {}
  const room = {
    roomId,
    sockets : [socket.id, 'offline:' + (peerId || 'unknown')],   // 상대 슬롯은 placeholder(미접속)
    users   : [{ socketId: socket.id, userId: me,     nick: myNick   || '나',   isPremium: false },
               { socketId: null,      userId: peerId, nick: peerNick || '상대', isPremium: false }],
    createdAt: Date.now(), events: [], disconnectedAt: [null, null], revived: true,
  };
  rooms.set(roomId, room);
  socketToRoom.set(socket.id, roomId);
  socket.join(roomId);
  chat.upsertConversation(db, { roomId, userAId: conv.user_a_id, userBId: conv.user_b_id }); // status='active'
  console.log(`[room] ♻️  revive ${roomId} me=${me} peer=${peerId} (상대는 본인 rejoin 시 바인딩)`);
  return room;
}

// ─── Socket handlers ──────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // 핸드셰이크 auth 에서 userId 확보(connect 시점부터 socket.userId 살아있게) →
  // list_conversations/get_chat_history 가 join 없이도 식별됨. join 핸들러가 이후 갱신.
  // ⚠️ 보안: 이 userId 는 서버 미검증값 → 스푸핑 가능. get_chat_history 참여자 인가가 임시 가드.
  //   근본 해결: 로그인 토큰을 서버에서 검증해 신뢰 가능한 userId 로 대체(다음 차수).
  socket.userId      = socket.handshake?.auth?.userId || null;
  // 통신비밀보호법: 접속지 IP·기기식별값 캡처(소켓에 저장) + 접속로그 기록
  socket._ip         = legal.getClientIp(socket);
  socket._deviceId   = socket.handshake?.auth?.deviceId || socket.handshake?.query?.deviceId || null;
  socket._deviceInfo = socket.handshake?.headers?.['user-agent'] || null;
  legal.logAccess(db, { eventType: 'CONNECT', ip: socket._ip, deviceId: socket._deviceId, deviceInfo: socket._deviceInfo });

  // ── join_queue ──────────────────────────────────────────────────
  socket.on('join_queue', async (user) => {
    const err = validate(user);
    if (err) { socket.emit('error', { message: err }); return; }
    if (socketToRoom.has(socket.id)) { socket.emit('error', { message: '이미 채팅 중이에요' }); return; }

    // 식별/기기값 갱신 (payload 우선)
    socket.userId    = user.userId || socket.userId || null;
    if (user.deviceId) socket._deviceId = user.deviceId;

    // 청소년보호법: 성인인증 미완료 차단 (매칭 진입 가드)
    if (await legal.shouldBlockUnverified(db, { userId: socket.userId, token: user.authToken })) {
      socket.emit('error', { code: 'adult_required', message: '성인인증이 필요한 서비스입니다.' });
      return;
    }

    // 위치정보법: 좌표 동반 시 이용기록 로그(항상) + 동의 확인.
    // 좌표 폐기(미동의 차단)는 ENFORCE_LOCATION_CONSENT=true 일 때만 — 클라 동의 UX 배포 후 활성화.
    // (기본 off: 매칭 동작 변경 없이 컴플라이언스 로깅만 가동)
    if (typeof user.lat === 'number' && typeof user.lng === 'number') {
      const enforce   = process.env.ENFORCE_LOCATION_CONSENT === 'true';
      const consented = socket.userId ? await legal.hasLocationConsent(db, socket.userId) : false;
      if (enforce && !consented) {
        legal.logLocationUse(db, { requesterId: socket.userId, method: user.locationMethod, status: 'REJECTED_NO_CONSENT', ip: socket._ip });
        user.lat = null; user.lng = null;   // 동의 없으면 위치 미사용
      } else {
        legal.logLocationUse(db, { requesterId: socket.userId, method: user.locationMethod || 'GPS', status: 'SUCCESS', ip: socket._ip });
      }
    }

    // 매칭 시작 시 standby 풀에서 제거 (중복 상태 방지)
    standby.delete(socket.id);

    const entry = {
      socketId    : socket.id,
      userId      : socket.userId || user.userId || null,   // 접속로그 연결용
      nick        : user.nick.trim(),
      interests   : user.interests,
      region      : user.region.trim(),
      lat         : typeof user.lat === 'number' ? user.lat : null,
      lng         : typeof user.lng === 'number' ? user.lng : null,
      isPremium   : user.isPremium === true,
      isVerified  : user.isVerified === true,
      gender      : user.gender || null,
      birthYear   : user.birthYear || null,
      blockedUsers: Array.isArray(user.blockedUsers) ? user.blockedUsers : [],
      // 지인 매칭 피하기 (프리미엄) — 전화번호 해시 기반
      phoneHash    : typeof user.phoneHash === 'string' ? user.phoneHash : null,
      avoidContacts: user.avoidContacts === true,
      contactHashes: Array.isArray(user.contactHashes) ? user.contactHashes : [],
      joinedAt    : Date.now(),
    };
    queue.set(socket.id, entry);
    const coordStr = entry.lat ? `(${entry.lat.toFixed(4)}, ${entry.lng.toFixed(4)})` : '(좌표없음)';
    console.log(`[queue] +${entry.nick} ${coordStr} premium=${entry.isPremium}  queue=${queue.size}`);

    if (tryMatch(socket, entry)) return;          // queue↔queue
    if (requestToStandby(socket, entry)) {        // queue→standby
      socket.emit('queue_joined', { position: queue.size });
      return;
    }
    socket.emit('queue_joined', { position: queue.size });
  });

  // ── leave_queue ─────────────────────────────────────────────────
  socket.on('leave_queue', () => {
    if (queue.delete(socket.id))
      console.log(`[queue] -${socket.id}  queue=${queue.size}`);

    // 이 소켓에서 보낸 pending 요청 취소
    for (const [rid, pm] of pendingMatches.entries()) {
      if (pm.fromSocketId === socket.id) {
        clearTimeout(pm.timer);
        pendingMatches.delete(rid);
        pendingFromSockets.delete(socket.id);
        // 상대 원래 풀로 복구
        if (pm.toUser) {
          if (pm.toFromQueue) {
            if (!socketToRoom.has(pm.toSocketId))
              queue.set(pm.toSocketId, { ...pm.toUser, joinedAt: Date.now() });
          } else {
            standby.set(pm.toSocketId, { ...pm.toUser, joinedAt: Date.now() });
          }
        }
      }
    }
  });

  // ── join_standby ─────────────────────────────────────────────────
  socket.on('join_standby', async (user) => {
    if (!user?.nick) return;
    if (socketToRoom.has(socket.id)) return;  // 채팅 중이면 무시

    socket.userId = user.userId || socket.userId || null;
    if (user.deviceId) socket._deviceId = user.deviceId;
    // 청소년보호법: 미인증자는 매칭 대상(standby)에서도 제외
    if (await legal.shouldBlockUnverified(db, { userId: socket.userId, token: user.authToken })) {
      socket.emit('error', { code: 'adult_required', message: '성인인증이 필요한 서비스입니다.' });
      return;
    }

    const entry = {
      socketId : socket.id,
      userId   : socket.userId || user.userId || null,
      nick     : (user.nick || '').trim(),
      interests: Array.isArray(user.interests) ? user.interests : [],
      region   : (user.region || '').trim(),
      // 지인 매칭 피하기 (프리미엄)
      phoneHash    : typeof user.phoneHash === 'string' ? user.phoneHash : null,
      avoidContacts: user.avoidContacts === true,
      contactHashes: Array.isArray(user.contactHashes) ? user.contactHashes : [],
      joinedAt : Date.now(),
    };
    standby.set(socket.id, entry);
    console.log(`[standby] +${entry.nick}  standby=${standby.size}`);

    // ── 큐에서 대기 중인 유저가 있으면 즉시 매칭 시도 ──────────────
    // 시나리오: 상대방이 나가기 → 내가 doLeave() → join_standby 전송
    //           → 이미 join_queue 로 기다리던 유저와 바로 연결
    const waitingInQueue = [...queue.entries()].filter(
      ([id]) => !pendingFromSockets.has(id) && !socketToRoom.has(id)
    );
    if (waitingInQueue.length > 0) {
      waitingInQueue.sort((a, b) => a[1].joinedAt - b[1].joinedAt);
      const sameRegion = waitingInQueue.filter(([, u]) => u.region === entry.region);
      const pool = sameRegion.length > 0 ? sameRegion : waitingInQueue;
      const [waitingId, waitingUser] = pool[0];
      const waitingSocket = io.sockets.sockets.get(waitingId);
      if (waitingSocket) {
        console.log(`[standby] ⚡ ${entry.nick} joined standby → triggering match for waiting ${waitingUser.nick}`);
        requestToStandby(waitingSocket, waitingUser);
      }
    }
  });

  // ── leave_standby ────────────────────────────────────────────────
  socket.on('leave_standby', () => {
    if (standby.delete(socket.id))
      console.log(`[standby] -${socket.id}  standby=${standby.size}`);
    // 보낸 pending 요청도 취소
    for (const [rid, pm] of pendingMatches.entries()) {
      if (pm.fromSocketId === socket.id) {
        clearTimeout(pm.timer);
        pendingMatches.delete(rid);
        pendingFromSockets.delete(socket.id);
        if (pm.toUser) standby.set(pm.toSocketId, { ...pm.toUser, joinedAt: Date.now() });
      }
    }
  });

  // ── accept_match ─────────────────────────────────────────────────
  socket.on('accept_match', ({ requestId } = {}) => {
    const pm = pendingMatches.get(requestId);
    if (!pm) return;

    clearTimeout(pm.timer);
    pendingMatches.delete(requestId);
    pendingFromSockets.delete(pm.fromSocketId);

    const fromSocket = io.sockets.sockets.get(pm.fromSocketId);
    if (!fromSocket) {
      // 요청자가 연결 끊김 → 수락자 원래 풀로 복구
      if (pm.toFromQueue) {
        queue.set(socket.id, { ...pm.toUser, joinedAt: Date.now() });
      } else {
        standby.set(socket.id, { ...pm.toUser, joinedAt: Date.now() });
      }
      return;
    }

    queue.delete(pm.fromSocketId);
    standby.delete(pm.toSocketId);
    queue.delete(pm.toSocketId);   // queue 출신이면 여기서도 제거

    if (pm.fromPassive) {
      // standby→standby: 둘 다 passive_match_found
      createRoom(fromSocket, pm.fromUser, socket.id, pm.toUser,
                 'passive_match_found', 'passive_match_found');
    } else if (pm.toFromQueue) {
      // queue→queue: 둘 다 match_found
      createRoom(fromSocket, pm.fromUser, socket.id, pm.toUser,
                 'match_found', 'match_found');
    } else {
      // queue→standby: 능동 사용자는 match_found, 수락자는 passive_match_found
      createRoom(fromSocket, pm.fromUser, socket.id, pm.toUser,
                 'match_found', 'passive_match_found');
    }
  });

  // ── decline_match ────────────────────────────────────────────────
  socket.on('decline_match', ({ requestId } = {}) => {
    const pm = pendingMatches.get(requestId);
    if (!pm) return;

    clearTimeout(pm.timer);
    pendingMatches.delete(requestId);
    pendingFromSockets.delete(pm.fromSocketId);

    if (pm.toFromQueue) {
      // queue↔queue: 거절 시 둘 다 큐로 복귀 (재매칭 가능)
      if (!socketToRoom.has(pm.toSocketId))
        queue.set(pm.toSocketId,   { ...pm.toUser,   joinedAt: Date.now() });
      if (!socketToRoom.has(pm.fromSocketId))
        queue.set(pm.fromSocketId, { ...pm.fromUser, joinedAt: Date.now() });
      console.log(`[queue] ❌ ${pm.toUser.nick} declined ${pm.fromUser.nick}, both returned to queue`);
    } else {
      // queue→standby: 거절자 standby 복구
      standby.set(pm.toSocketId, { ...pm.toUser, joinedAt: Date.now() });
      console.log(`[standby] ❌ ${pm.toUser.nick} declined ${pm.fromUser.nick}`);
    }
  });

  // ── send_message ─────────────────────────────────────────────────
  socket.on('send_message', async ({ roomId, text, clientId, nick }) => {
    if (!roomId || !text || typeof text !== 'string') return;
    if (text.length > 500) return;

    // 인메모리 room 우선, 없으면(재배포 등) DB conversation 으로 부활 → 이어쓰기 가능
    let resolved = resolveRoomForSender(socket, roomId, nick);
    if (!resolved) { await reviveRoomFromDB(socket, roomId); resolved = resolveRoomForSender(socket, roomId, nick); }
    if (!resolved) return;
    const { room, senderIdx } = resolved;
    const otherIdx   = senderIdx === 0 ? 1 : 0;
    const senderUser = room.users[senderIdx];
    const otherUser  = room.users[otherIdx];

    // 발신자가 만든 로컬 id를 그대로 사용해야 '읽음' 확인(read_message)이
    // 발신자 말풍선과 매칭됨. (없으면 서버가 생성 — 구버전 클라 호환)
    const msgId   = (typeof clientId === 'string' && clientId) ? clientId : uuidv4();
    const msgTime = koreanTime();

    const msgPayload = { id: msgId, text: text.trim(), time: msgTime };
    io.to(roomId).except(socket.id).emit('receive_message', msgPayload);
    // 오프라인(종료/잠금) 수신자 rejoin 시 재전송할 수 있도록 버퍼링
    recordRoomEvent(room, msgId, 'msg', msgPayload);

    // 프리미엄 채팅 저장
    if (chatLogs.has(roomId)) {
      const log = chatLogs.get(roomId);
      log.push({
        id      : msgId,
        senderNick: senderUser?.nick || '?',
        text    : text.trim(),
        time    : msgTime,
        savedAt : Date.now(),
      });
      if (log.length > MAX_CHAT_LOG) log.shift(); // 최대 200개
    }

    if (otherUser?.nick) {
      sendPushToNick(otherUser.nick, senderUser?.nick || '이웃', text.trim(), otherUser.userId);
    }

    // 채팅 영속화(DB) — 릴레이·버퍼·푸시 직후, best-effort(흐름 안 막음)
    chat.persistMessage(db, {
      conversationId: roomId, senderId: senderUser?.userId || null,
      kind: 'text', payload: text.trim(), clientId: msgId,
    });
  });

  // ── read_message (읽음 확인) ─────────────────────────────────────
  socket.on('read_message', ({ roomId, messageId } = {}) => {
    const room = rooms.get(roomId);
    if (!room || !room.sockets.includes(socket.id)) return;
    // 상대방에게 읽음 알림 전송
    const otherId = room.sockets.find(id => id !== socket.id);
    if (otherId) {
      io.to(otherId).emit('message_read', { messageId });
    }
    // DB 읽음 영속화 — messageId 는 클라 id(=client_id), conversation_id 로 스코프
    chat.markRead(db, { conversationId: roomId, clientId: messageId });
  });

  // ── send_image (사진 전송) ────────────────────────────────────────
  socket.on('send_image', async ({ roomId, imageData, width, height, clientId, nick } = {}) => {
    if (!roomId || !imageData) return;
    let resolved = resolveRoomForSender(socket, roomId, nick);
    if (!resolved) { await reviveRoomFromDB(socket, roomId); resolved = resolveRoomForSender(socket, roomId, nick); }
    if (!resolved) return;
    const { room, senderIdx } = resolved;
    const otherIdx  = senderIdx === 0 ? 1 : 0;
    const senderUser = room.users[senderIdx];
    const otherUser  = room.users[otherIdx];

    // 발신자 로컬 id를 그대로 사용해야 '읽음'(read_message)이 발신자 말풍선과 매칭됨
    const msgId = (typeof clientId === 'string' && clientId) ? clientId : require('uuid').v4();
    const msgTime = koreanTime();

    const imgPayload = { id: msgId, imageData, width, height, time: msgTime };
    io.to(roomId).except(socket.id).emit('receive_image', imgPayload);
    // 오프라인 수신자 rejoin 시 재전송(이미지 누락 방지)
    recordRoomEvent(room, msgId, 'img', imgPayload);

    if (otherUser?.nick) {
      sendPushToNick(otherUser.nick, senderUser?.nick || '이웃', '📷 사진을 보냈어요', otherUser.userId);
    }

    // 채팅 영속화(DB) — 이미지 payload(base64) + 원본 치수(history 왜곡 방지)
    chat.persistMessage(db, {
      conversationId: roomId, senderId: senderUser?.userId || null,
      kind: 'image', payload: imageData, clientId: msgId, width, height,
    });
  });

  // ── get_chat_history (DB 영속화 — 무료 7일 / 프리미엄 90일, 재시작 후에도 복원) ──
  socket.on('get_chat_history', async ({ roomId } = {}) => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    const inRoom = !!(room && room.sockets.includes(socket.id));

    // 요청자 식별: 활성 room 우선, 없으면(재시작 후) 소켓에 저장된 userId
    let requesterId = null, myNick = null, peerNick = null;
    if (inRoom) {
      const idx = room.sockets.indexOf(socket.id);
      requesterId = room.users[idx]?.userId || socket.userId || null;
      myNick   = room.users[idx]?.nick || null;
      peerNick = room.users[idx === 0 ? 1 : 0]?.nick || null;
    } else {
      requesterId = socket.userId || null;
    }

    // 대화방 조회 + 참여자 인가 (IDOR 차단). 활성 room 멤버이거나, DB conversation 의
    // user_a/b_id 중 하나가 요청자(socket.userId)여야 함. 아니면 '빈 결과' 반환.
    // ⚠️ 보안 한계: handshake.auth.userId 는 서버에서 미검증 → 스푸핑 가능(다른 userId 사칭).
    //   본 참여자 체크는 그에 대한 '임시 가드'일 뿐. 근본 해결은 로그인 토큰(JWT 등)
    //   서버 검증으로 socket.userId 를 신뢰값으로 만드는 것(다음 차수 과제).
    let conv = null;
    try { conv = (await db.query('SELECT user_a_id, user_b_id FROM conversations WHERE id = $1', [roomId])).rows[0] || null; } catch {}
    const isParticipant = inRoom
      || (conv && requesterId && (conv.user_a_id === requesterId || conv.user_b_id === requesterId));
    if (!isParticipant) { socket.emit('chat_history', { messages: [] }); return; } // 비참여자 → 빈 결과

    // 닉 보강 (재시작 후 room 없을 때 users 테이블에서) — 클라가 'mine' 판정에 senderNick 사용
    if ((!myNick || !peerNick) && conv) {
      try {
        const ids = [conv.user_a_id, conv.user_b_id].filter(Boolean);
        const nrows = ids.length ? (await db.query('SELECT id, nickname FROM users WHERE id = ANY($1)', [ids])).rows : [];
        const nickOf = id => nrows.find(r => r.id === id)?.nickname || '상대';
        myNick   = myNick   || nickOf(requesterId);
        const peerId = conv.user_a_id === requesterId ? conv.user_b_id : conv.user_a_id;
        peerNick = peerNick || nickOf(peerId);
      } catch {}
    }

    const requesterIsPremium = await isUserPremium(requesterId);
    const rows = await chat.getHistory(db, roomId, { requesterIsPremium });
    // 기존 클라 onChatHistory 가 기대하는 형태로 매핑(클라 UI 미변경) — id/text/senderNick/time
    const messages = rows.map(r => ({
      id        : r.client_id || String(r.id),
      // 이미지 history: 현재 클라 onChatHistory가 imageData 렌더 미지원 → text '[사진]' 폴백으로
      // 빈 말풍선 방지(깔끔히 표시). imageData는 그대로 실어 다음 클라 차수에 실제 렌더로 교체.
      text      : r.kind === 'image' ? '[사진]' : r.payload,
      imageData : r.kind === 'image' ? r.payload : undefined,
      imgWidth  : r.img_width || undefined,
      imgHeight : r.img_height || undefined,
      senderNick: r.sender_id && requesterId && r.sender_id === requesterId ? myNick : peerNick,
      time      : fmtKoreanTime(r.created_at),
      read      : !!r.read_at,
    }));
    socket.emit('chat_history', { messages });
    console.log(`[chat] 📜 history DB조회 ${messages.length}개 premium=${requesterIsPremium} room=${roomId}`);
  });

  // ── list_conversations (회원 활동 내역 — 서버 핸들러만, 클라 연결은 다음 차수) ──
  // ⚠️ 보안: 요청자 userId 는 인증된 소켓에 저장된 socket.userId 를 우선 사용.
  //    소켓에 userId 가 없을 때만 payload userId 로 폴백(이 경우 위조 가능 → 다음 차수에
  //    소켓 인증값 강제로 좁힐 것). payload 만 신뢰하면 남의 대화목록 조회 위험.
  socket.on('list_conversations', async () => {
    // 보안: 인증된 소켓값(socket.userId, 핸드셰이크/join에서 세팅)만 신뢰. payload 폴백 제거.
    const requesterId = socket.userId || null;
    if (!requesterId) { socket.emit('conversations', { items: [] }); return; } // graceful 빈 목록(크래시X)
    const requesterIsPremium = await isUserPremium(requesterId);
    const items = await chat.listConversations(db, requesterId, { requesterIsPremium });
    socket.emit('conversations', { items });
  });

  // ── leave_room ───────────────────────────────────────────────────
  socket.on('leave_room', ({ roomId } = {}) => {
    const rid = roomId || socketToRoom.get(socket.id);
    if (!rid) return;

    const room = rooms.get(rid);
    if (room) {
      // 방 존재 → 풀 클린업 (상대방에게 peer_left 전송)
      cleanupRoom(rid, socket.id);
    } else {
      // 방이 이미 삭제됨 (상대가 먼저 나간 경우) → 자신의 socketToRoom 만 정리
      socketToRoom.delete(socket.id);
      io.sockets.sockets.get(socket.id)?.leave(rid);
      console.log(`[room] leave_room (after peer_left) ${socket.id}  rid=${rid}`);
    }
  });

  // ── rejoin_room (Feature 5) ──────────────────────────────────────
  // nick + roomId 기반으로 매칭 → 소켓 ID 가 바뀌어도 복구 가능
  socket.on('rejoin_room', async ({ roomId, nick } = {}) => {
    let room = rooms.get(roomId);
    if (!room) {
      // 방이 인메모리에 없음(재배포 등) → DB conversation 으로 부활 시도(참여자만) → 이어쓰기 가능.
      // 부활 성공 시 호출 소켓은 방에 join 됨 → peer_reconnected(입력 활성). 실패 시 peer_left(읽기전용).
      const revived = await reviveRoomFromDB(socket, roomId);
      if (revived) { socket.emit('peer_reconnected'); return; }
      socketToRoom.delete(socket.id);
      socket.emit('peer_left');
      return;
    }

    // 방에 있는 유저 중 nick 일치하는 인덱스 찾기
    const userIdx = room.users.findIndex(u => u.nick === nick);
    if (userIdx === -1) { socket.emit('peer_left'); return; }

    const oldSocketId = room.sockets[userIdx];

    // grace period 타이머 취소 (구 소켓 ID 기준)
    const timerEntry = reconnectTimers.get(oldSocketId);
    if (timerEntry) {
      clearTimeout(timerEntry.timer);
      reconnectTimers.delete(oldSocketId);
    }

    // 소켓 ID 갱신
    room.sockets[userIdx] = socket.id;
    room.users[userIdx].socketId = socket.id;
    socketToRoom.delete(oldSocketId);
    socketToRoom.set(socket.id, roomId);

    socket.join(roomId);

    // 상대방에게 재연결 알림
    const otherId = room.sockets.find(id => id !== socket.id);
    if (otherId) io.to(otherId).emit('peer_reconnected');

    // ── 오프라인(종료/잠금) 중 놓친 메시지·이미지 재전송 ──────────────
    // 끊겼던 시각 이후 도착한 이벤트를 재진입한 본인에게만 다시 보냄.
    // (클라는 id 로 중복 제거하므로 이미 받은 건 무시됨)
    const since = Array.isArray(room.disconnectedAt) ? room.disconnectedAt[userIdx] : null;
    if (since && Array.isArray(room.events)) {
      const missed = room.events.filter(e => e.at > since);
      missed.forEach(e => {
        socket.emit(e.kind === 'img' ? 'receive_image' : 'receive_message', e.payload);
      });
      if (missed.length) console.log(`[room] 📨 ${nick} 누락 ${missed.length}건 재전송 (room=${roomId})`);
    }
    if (Array.isArray(room.disconnectedAt)) room.disconnectedAt[userIdx] = null;

    console.log(`[room] 🔄 ${nick} rejoined ${roomId} (${oldSocketId} → ${socket.id})`);
  });

  // ── join_region (동네 피드) ──────────────────────────────────────
  socket.on('join_region', ({ region } = {}) => {
    if (!region || typeof region !== 'string') return;
    // 기존 region 룸 나가기
    [...socket.rooms]
      .filter(r => r.startsWith('region:'))
      .forEach(r => socket.leave(r));
    socket.join(`region:${region}`);
    console.log(`[region] ${socket.id} → region:${region}`);

    // 접속자에게 피드 히스토리 전송 (최신 50개)
    const history = regionFeeds.get(region) || [];
    if (history.length > 0) {
      socket.emit('feed_history', history);
    }
  });

  // ── post_feed (동네 피드 브로드캐스트 + 저장) ───────────────────
  socket.on('post_feed', ({ text, nick, interest, region } = {}) => {
    if (!text || !nick || !region) return;
    if (typeof text !== 'string' || text.length > 100) return;
    const item = {
      id      : uuidv4(),
      nick,
      interest: interest || 'none',
      time    : koreanTime(),
      msg     : text.trim(),
    };
    // 인메모리 저장 (최신순, 최대 100개) + 파일 영속화
    const feed = regionFeeds.get(region) || [];
    feed.unshift(item);
    if (feed.length > 100) feed.pop();
    regionFeeds.set(region, feed);
    saveData();

    // 같은 동네 다른 유저에게 브로드캐스트
    io.to(`region:${region}`).except(socket.id).emit('new_feed_post', item);
    console.log(`[feed] ${nick} → region:${region} : ${text.substring(0, 30)}`);
  });

  // ── check_pending_match ──────────────────────────────────────────
  // 앱 재시작 / 재연결 시 놓친 match_request 재발송
  socket.on('check_pending_match', ({ nick } = {}) => {
    if (!nick) return;
    for (const [, pm] of pendingMatches.entries()) {
      if (pm.toUser.nick === nick) {
        // 재연결된 소켓 ID 로 업데이트
        pm.toSocketId = socket.id;
        socket.emit('match_request', {
          requestId   : pm.requestId,
          fromNick    : pm.fromUser.nick,
          fromInterest: pm.fromUser.interests?.[0] || '',
          fromRegion  : pm.fromUser.region,
        });
        console.log(`[standby] 🔄 resent match_request to ${nick}`);
        break;
      }
    }
  });

  // ── register_push_token (Feature 3) ─────────────────────────────
  // userId 기준 DB 영속화(재배포 생존 + 닉 충돌 제거). userId 없으면 인메모리 폴백만(graceful).
  socket.on('register_push_token', ({ token, nick, userId, platform } = {}) => {
    if (!(token && nick && typeof token === 'string')) return;
    pushTokensByNick.set(nick, token);  // 폴백 유지
    saveData();
    const uid = userId || socket.userId || null;
    if (uid) {
      pushtokens.upsertPushToken(db, { userId: uid, token, nick, platform }); // best-effort
      console.log(`[push] 🔑 token registered ${nick} (userId=${uid}) → DB upsert`);
    } else {
      console.log(`[push] 🔑 token registered ${nick} (no userId — 인메모리 폴백만)`);
    }
  });

  // ── report_user ──────────────────────────────────────────────────
  socket.on('report_user', ({ reportedNick, roomId, reason, reporterNick } = {}) => {
    if (!reportedNick || !reason) return;
    console.log(`[report] 🚨 ${reporterNick} → ${reportedNick}  reason="${reason}"  room=${roomId}`);

    // TODO: DB 연동 시 신고 내역 저장
    // 현재는 로그 기록 + 향후 자동 제재 기준 데이터
    const reportKey = `${reportedNick}`;
    if (!reportCounts.has(reportKey)) reportCounts.set(reportKey, 0);
    reportCounts.set(reportKey, reportCounts.get(reportKey) + 1);

    const count = reportCounts.get(reportKey);
    console.log(`[report] ${reportedNick} 누적 신고 ${count}회`);

    // 5회 이상 신고 시 자동 경고
    if (count >= 5) {
      console.warn(`[report] ⚠️  ${reportedNick} 신고 누적 5회 이상 — 검토 필요`);
    }
  });

  // ── disconnect ───────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] ${socket.id}  reason=${reason}`);

    queue.delete(socket.id);
    standby.delete(socket.id);

    for (const [rid, pm] of pendingMatches.entries()) {
      if (pm.fromSocketId === socket.id || pm.toSocketId === socket.id) {
        clearTimeout(pm.timer);
        pendingMatches.delete(rid);
        pendingFromSockets.delete(pm.fromSocketId);

        if (pm.fromSocketId === socket.id) {
          // 요청자(from) disconnect → 수락 대기자(to) 원래 풀로 복구
          if (pm.toUser) {
            if (pm.toFromQueue) {
              if (!socketToRoom.has(pm.toSocketId))
                queue.set(pm.toSocketId, { ...pm.toUser, joinedAt: Date.now() });
            } else {
              standby.set(pm.toSocketId, { ...pm.toUser, joinedAt: Date.now() });
            }
          }
        } else {
          // 수락 대기자(to) disconnect → 요청자(from) 원래 풀로 복구
          if (pm.fromUser && !socketToRoom.has(pm.fromSocketId)) {
            if (pm.fromPassive) {
              // standby→standby: from 은 standby 로
              standby.set(pm.fromSocketId, { ...pm.fromUser, joinedAt: Date.now() });
            } else {
              // queue→queue 또는 queue→standby: from 은 queue 로
              queue.set(pm.fromSocketId, { ...pm.fromUser, joinedAt: Date.now() });
            }
          }
        }
      }
    }

    // Feature 5: grace period
    if (socketToRoom.has(socket.id)) handleDisconnectFromRoom(socket.id);

    // ⚠️ 푸시 토큰은 nick 기준 저장이므로 소켓 끊김에 영향 없음
  });
});

// ═══════════════════════════════════════════════════════════════════
//  관리자 패널  (/admin)  — 게시글 삭제 · 회원목록 · 데이터 확인
//  보안: 레포에 약한 기본 비번을 넣으면 누구나 회원 개인정보·삭제에
//        접근 가능 → Railway 환경변수 ADMIN_PASSWORD 필수.
//        미설정 시 패널 전체 비활성(503).
// ═══════════════════════════════════════════════════════════════════
function adminAuth(req, res, next) {
  const PASS = process.env.ADMIN_PASSWORD;
  if (!PASS) {
    return res.status(503).send(
      'ADMIN_PASSWORD 환경변수가 설정되지 않았습니다. Railway → Variables 에서 ADMIN_PASSWORD 를 설정하세요.'
    );
  }
  const hdr = req.headers.authorization || '';
  const [scheme, b64] = hdr.split(' ');
  if (scheme === 'Basic' && b64) {
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    const pw = idx >= 0 ? decoded.slice(idx + 1) : '';
    if (pw === PASS) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Locotalk Admin", charset="UTF-8"');
  return res.status(401).send('관리자 인증이 필요합니다.');
}

// 모든 /admin* 경로 보호
app.use('/admin', adminAuth);

// ── 통계 ──
app.get('/admin/api/stats', async (req, res) => {
  let userCount = 0, premiumCount = 0, verifiedCount = 0;
  try {
    if (process.env.DATABASE_URL) {
      const a = await db.query('SELECT COUNT(*)::int AS c FROM users');
      const b = await db.query('SELECT COUNT(*)::int AS c FROM users WHERE is_premium = TRUE');
      const c = await db.query('SELECT COUNT(*)::int AS c FROM users WHERE is_verified = TRUE');
      userCount = a.rows[0].c; premiumCount = b.rows[0].c; verifiedCount = c.rows[0].c;
    }
  } catch (e) { console.error('[admin] stats:', e.message); }
  let postCount = 0;
  for (const arr of regionFeeds.values()) postCount += arr.length;
  res.json({
    users: userCount,
    premium: premiumCount,
    verified: verifiedCount,
    posts: postCount,
    regions: regionFeeds.size,
    pushTokens: (typeof pushTokensByNick !== 'undefined' && pushTokensByNick) ? pushTokensByNick.size : 0,
  });
});

// ── 회원목록 ──
app.get('/admin/api/users', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json([]);
  try {
    const { rows } = await db.query(`
      SELECT id, auth_provider, email, nickname, gender, birth_year,
             interests, region_gu, region_label, is_premium, is_verified,
             phone, created_at
      FROM users ORDER BY created_at DESC NULLS LAST`);
    const out = rows.map(u => {
      let interests = [];
      if (typeof u.interests === 'string') { try { interests = JSON.parse(u.interests); } catch {} }
      else if (Array.isArray(u.interests)) interests = u.interests;
      return {
        id: u.id, provider: u.auth_provider, email: u.email, nickname: u.nickname,
        gender: u.gender, birthYear: u.birth_year, interests,
        regionGu: u.region_gu, regionLabel: u.region_label,
        isPremium: u.is_premium, isVerified: u.is_verified,
        phone: u.phone, createdAt: u.created_at,
      };
    });
    res.json(out);
  } catch (e) { console.error('[admin] users:', e.message); res.status(500).json({ error: e.message }); }
});

// ── 회원 삭제 ──
app.delete('/admin/api/users/:id', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ ok: true });
  try {
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error('[admin] del user:', e.message); res.status(500).json({ error: e.message }); }
});

// ── 게시글 목록 (전 지역 평탄화) ──
app.get('/admin/api/feeds', (req, res) => {
  const out = [];
  for (const [region, arr] of regionFeeds.entries()) {
    for (const it of arr) {
      out.push({ region, id: it.id, nick: it.nick, interest: it.interest, time: it.time, msg: it.msg });
    }
  }
  res.json(out);
});

// ── 게시글 삭제 ──
app.delete('/admin/api/feeds/:region/:id', (req, res) => {
  const { region, id } = req.params;
  const arr = regionFeeds.get(region);
  if (!arr) return res.status(404).json({ error: '지역 없음' });
  const idx = arr.findIndex(it => it.id === id);
  if (idx < 0) return res.status(404).json({ error: '게시글 없음' });
  arr.splice(idx, 1);
  regionFeeds.set(region, arr);
  saveData();
  // 접속 중인 같은 동네 유저들에게 삭제 알림 (있으면 클라가 반영)
  try { io.to(`region:${region}`).emit('feed_deleted', { id }); } catch {}
  res.json({ ok: true });
});

// ── 관리자 웹페이지 ──
app.get('/admin', (req, res) => {
  res.type('html').send(ADMIN_HTML);
});

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Locotalk 관리자</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system,'Apple SD Gothic Neo',sans-serif; background:#ECFDF5; color:#0f2530; }
  header { background:#034A93; color:#fff; padding:14px 18px; display:flex; align-items:center; gap:10px; }
  header h1 { font-size:17px; margin:0; font-weight:700; }
  header .dot { width:9px; height:9px; border-radius:50%; background:#40D3B6; }
  .tabs { display:flex; gap:6px; padding:12px 14px 0; }
  .tab { padding:8px 16px; border:none; background:#d7eef0; color:#08506b; border-radius:10px 10px 0 0; font-size:14px; font-weight:600; cursor:pointer; }
  .tab.active { background:#fff; color:#034A93; }
  .panel { background:#fff; margin:0 14px 18px; border-radius:0 12px 12px 12px; padding:16px; box-shadow:0 2px 10px rgba(0,0,0,.05); }
  .stats { display:flex; flex-wrap:wrap; gap:12px; }
  .stat { flex:1 1 130px; background:#ECFDF5; border-radius:12px; padding:14px 16px; }
  .stat .n { font-size:26px; font-weight:800; color:#034A93; }
  .stat .l { font-size:13px; color:#3a6172; margin-top:2px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th,td { text-align:left; padding:8px 10px; border-bottom:1px solid #eef2f4; vertical-align:top; }
  th { color:#5a7a88; font-weight:600; font-size:12px; background:#f6fafb; position:sticky; top:0; }
  tr:hover td { background:#f9fdfd; }
  .pill { display:inline-block; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:700; }
  .pill.prem { background:#FEF3C7; color:#92600a; }
  .pill.ver { background:#DBEAFE; color:#1e40af; }
  .msg { max-width:340px; white-space:pre-wrap; word-break:break-word; }
  .del { background:#fee2e2; color:#b91c1c; border:none; border-radius:8px; padding:5px 11px; font-size:12px; font-weight:700; cursor:pointer; }
  .del:hover { background:#fecaca; }
  .empty { color:#90a4ae; padding:30px; text-align:center; }
  .wrap { overflow:auto; max-height:70vh; }
  .refresh { margin-left:auto; background:#40D3B6; color:#063; border:none; border-radius:8px; padding:7px 13px; font-weight:700; cursor:pointer; font-size:13px; }
</style></head><body>
<header><span class="dot"></span><h1>Locotalk 관리자</h1>
  <button class="refresh" onclick="loadAll()">↻ 새로고침</button></header>
<div class="tabs">
  <button class="tab active" data-t="stats" onclick="tab('stats')">📊 통계</button>
  <button class="tab" data-t="users" onclick="tab('users')">👥 회원목록</button>
  <button class="tab" data-t="feeds" onclick="tab('feeds')">📝 게시글</button>
</div>
<div class="panel" id="p-stats"><div class="stats" id="stats"></div></div>
<div class="panel" id="p-users" style="display:none"><div class="wrap"><table id="users"></table></div></div>
<div class="panel" id="p-feeds" style="display:none"><div class="wrap"><table id="feeds"></table></div></div>
<script>
function tab(t){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.t===t));
  ['stats','users','feeds'].forEach(x=>document.getElementById('p-'+x).style.display=x===t?'block':'none');
}
function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function fmt(d){ if(!d) return '-'; try{return new Date(d).toLocaleString('ko-KR');}catch{return d;} }
async function loadStats(){
  const s=await (await fetch('/admin/api/stats')).json();
  document.getElementById('stats').innerHTML=[
    ['회원 수',s.users],['프리미엄',s.premium],['본인인증',s.verified],
    ['게시글',s.posts],['활성 지역',s.regions],['푸시토큰',s.pushTokens]
  ].map(([l,n])=>'<div class="stat"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>').join('');
}
async function loadUsers(){
  const list=await (await fetch('/admin/api/users')).json();
  const t=document.getElementById('users');
  if(!list.length){t.innerHTML='<tr><td class="empty">회원이 없습니다.</td></tr>';return;}
  t.innerHTML='<tr><th>닉네임</th><th>이메일</th><th>경로</th><th>성별/출생</th><th>지역</th><th>관심사</th><th>상태</th><th>가입일</th><th></th></tr>'+
    list.map(u=>'<tr>'+
      '<td><b>'+esc(u.nickname||'(미설정)')+'</b></td>'+
      '<td>'+esc(u.email)+'</td>'+
      '<td>'+esc(u.provider)+'</td>'+
      '<td>'+esc(u.gender||'-')+' / '+esc(u.birthYear||'-')+'</td>'+
      '<td>'+esc(u.regionLabel||u.regionGu||'-')+'</td>'+
      '<td>'+esc((u.interests||[]).join(', '))+'</td>'+
      '<td>'+(u.isPremium?'<span class="pill prem">프리미엄</span> ':'')+(u.isVerified?'<span class="pill ver">인증</span>':'')+'</td>'+
      '<td>'+fmt(u.createdAt)+'</td>'+
      '<td><button class="del" onclick="delUser(\\''+esc(u.id)+'\\',this)">삭제</button></td>'+
    '</tr>').join('');
}
async function loadFeeds(){
  const list=await (await fetch('/admin/api/feeds')).json();
  const t=document.getElementById('feeds');
  if(!list.length){t.innerHTML='<tr><td class="empty">게시글이 없습니다.</td></tr>';return;}
  t.innerHTML='<tr><th>지역</th><th>닉네임</th><th>관심사</th><th>내용</th><th>시간</th><th></th></tr>'+
    list.map(f=>'<tr>'+
      '<td>'+esc(f.region)+'</td>'+
      '<td>'+esc(f.nick)+'</td>'+
      '<td>'+esc(f.interest)+'</td>'+
      '<td class="msg">'+esc(f.msg)+'</td>'+
      '<td>'+esc(f.time)+'</td>'+
      '<td><button class="del" onclick="delFeed(\\''+esc(f.region)+'\\',\\''+esc(f.id)+'\\',this)">삭제</button></td>'+
    '</tr>').join('');
}
async function delUser(id,btn){
  if(!confirm('이 회원을 영구 삭제할까요?\\n'+id))return;
  btn.disabled=true;
  const r=await fetch('/admin/api/users/'+encodeURIComponent(id),{method:'DELETE'});
  if(r.ok){btn.closest('tr').remove();loadStats();}else{alert('삭제 실패');btn.disabled=false;}
}
async function delFeed(region,id,btn){
  if(!confirm('이 게시글을 삭제할까요?'))return;
  btn.disabled=true;
  const r=await fetch('/admin/api/feeds/'+encodeURIComponent(region)+'/'+encodeURIComponent(id),{method:'DELETE'});
  if(r.ok){btn.closest('tr').remove();loadStats();}else{alert('삭제 실패');btn.disabled=false;}
}
function loadAll(){loadStats();loadUsers();loadFeeds();}
loadAll();
</script></body></html>`;

// ─── Start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🟢 Locotalk server  http://localhost:${PORT}`);
  console.log(`   Health check     http://localhost:${PORT}/health\n`);
});
