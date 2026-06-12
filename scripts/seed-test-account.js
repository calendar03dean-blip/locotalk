#!/usr/bin/env node
/**
 * 테스트 로그인 계정 시드 (프로덕션/대상 DB에 1개 계정 upsert)
 *
 * 용도: 본인인증(PortOne) 없이 /auth/email-login 으로 로그인 가능한 테스트 계정 생성.
 *       (공개 /auth/signup 은 본인인증 필수라 우회 불가 → DB 직삽입)
 *
 * 비밀번호는 server/password.js 의 scrypt 로 해시해서 password_hash 에만 저장(평문 미보관).
 *
 * 실행:
 *   DATABASE_URL='postgres://...'  node scripts/seed-test-account.js
 *   # 선택 오버라이드:
 *   EMAIL='admin@locotalk.app' PASSWORD='0909' NICKNAME='조용한너구리 #0909' \
 *     DATABASE_URL='postgres://...' node scripts/seed-test-account.js
 *
 * 주의: DATABASE_URL 은 반드시 env 로만 전달(명령에 평문 노출 주의). 이 스크립트는 URL 을 출력하지 않음.
 */
'use strict';
const path = require('path');
// pg / password 모듈은 server/ 쪽에 설치돼 있으므로 절대경로로 로드(실행 cwd 무관).
const { Client } = require(path.join(__dirname, '..', 'server', 'node_modules', 'pg'));
const passwords  = require(path.join(__dirname, '..', 'server', 'password'));

const EMAIL    = (process.env.EMAIL    || 'admin@locotalk.app').trim();
const PASSWORD =  process.env.PASSWORD || '0909';
const NICKNAME = (process.env.NICKNAME || '조용한너구리 #0909').trim(); // 코드네임 형식(온보딩 스킵용)
const INTERESTS = process.env.INTERESTS || JSON.stringify(['여행', '음악', '운동']);

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL 환경변수가 필요합니다. (env 로만 전달하세요)');
    process.exit(1);
  }
  if (!passwords.validateEmail(EMAIL)) {
    console.error('❌ EMAIL 형식 오류:', EMAIL);
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Railway managed PG
  });
  await client.connect();

  try {
    const hash = await passwords.hashPassword(PASSWORD);

    // 기존 계정(같은 이메일, 대소문자 무시) 있으면 UPDATE, 없으면 INSERT.
    const found = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [EMAIL]
    );

    let userId;
    if (found.rows.length) {
      userId = found.rows[0].id;
      await client.query(
        `UPDATE users
            SET auth_provider = 'email',
                password_hash = $2,
                nickname      = COALESCE(NULLIF($3,''), nickname),
                interests     = COALESCE(interests, $4)
          WHERE id = $1`,
        [userId, hash, NICKNAME, INTERESTS]
      );
      console.log('🔁 기존 계정 갱신:', userId);
    } else {
      userId = 'idv:test-' + EMAIL.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();
      await client.query(
        `INSERT INTO users (id, auth_provider, email, password_hash, nickname, interests)
         VALUES ($1, 'email', $2, $3, $4, $5)`,
        [userId, EMAIL, hash, NICKNAME, INTERESTS]
      );
      console.log('✅ 신규 계정 생성:', userId);
    }

    // 성인/인증 플래그가 컬럼으로 존재하면 true 로(없으면 조용히 패스).
    for (const col of ['adult_verified', 'is_verified']) {
      try { await client.query(`UPDATE users SET ${col} = TRUE WHERE id = $1`, [userId]); }
      catch (_) { /* 컬럼 없음 — 무시 */ }
    }

    console.log('────────────────────────────');
    console.log(' 로그인 테스트 계정 준비 완료');
    console.log('  이메일   :', EMAIL);
    console.log('  비밀번호 :', PASSWORD);
    console.log('  닉네임   :', NICKNAME);
    console.log('  userId   :', userId);
    console.log(' → 로그인: /auth/email-login (앱 "이메일로 로그인" 레이어)');
    console.log('────────────────────────────');
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error('❌ 시드 실패:', e.message); process.exit(1); });
