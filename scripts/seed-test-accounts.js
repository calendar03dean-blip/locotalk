#!/usr/bin/env node
/**
 * 테스트 로그인 계정 시드 (복수) — 프로덕션/대상 DB에 여러 계정 upsert
 *
 * 용도: 본인인증(PortOne) 없이 /auth/email-login 으로 로그인 가능한 테스트 계정들 생성.
 *       (공개 /auth/signup 은 본인인증 필수라 우회 불가 → DB 직삽입)
 *
 * 단건 시드는 seed-test-account.js, 이 스크립트는 아래 ACCOUNTS 를 한 번에 처리.
 * 비밀번호는 server/password.js 의 scrypt 로 해시해서 password_hash 에만 저장(평문 미보관).
 * 닉네임은 코드네임 형식(허용 형용사+동물)이라야 매칭(join_queue) 검증을 통과한다.
 *
 * 실행:
 *   DATABASE_URL='postgres://...'  node scripts/seed-test-accounts.js
 *
 * 주의: DATABASE_URL 은 반드시 env 로만 전달(명령에 평문 노출 주의). 이 스크립트는 URL 을 출력하지 않음.
 */
'use strict';
const path = require('path');
const { Client } = require(path.join(__dirname, '..', 'server', 'node_modules', 'pg'));
const passwords  = require(path.join(__dirname, '..', 'server', 'password'));
const codename   = require(path.join(__dirname, '..', 'server', 'codename'));

// 시드 대상 계정들 — 닉네임은 codename.isValidCodename 통과값만 사용.
const ACCOUNTS = [
  { email: 'admin@locotalk.app',  password: '0909', nickname: '조용한너구리', interests: ['여행', '음악', '운동'] },
  { email: 'tester@locotalk.app', password: '1234', nickname: '따뜻한고양이', interests: ['커피', '독서', '산책'] },
];

async function upsertOne(client, acc) {
  if (!passwords.validateEmail(acc.email)) throw new Error('EMAIL 형식 오류: ' + acc.email);
  if (!codename.isValidCodename(acc.nickname)) throw new Error('닉네임이 코드네임 형식이 아님: ' + acc.nickname);

  const hash = await passwords.hashPassword(acc.password);
  const interests = JSON.stringify(acc.interests);

  const found = await client.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [acc.email]
  );

  let userId;
  if (found.rows.length) {
    userId = found.rows[0].id;
    await client.query(
      `UPDATE users
          SET auth_provider = 'email',
              password_hash = $2,
              nickname      = $3,
              interests     = COALESCE(interests, $4)
        WHERE id = $1`,
      [userId, hash, acc.nickname, interests]
    );
    console.log('🔁 기존 계정 갱신:', acc.email, '→', userId);
  } else {
    userId = 'idv:test-' + acc.email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();
    await client.query(
      `INSERT INTO users (id, auth_provider, email, password_hash, nickname, interests)
       VALUES ($1, 'email', $2, $3, $4, $5)`,
      [userId, acc.email, hash, acc.nickname, interests]
    );
    console.log('✅ 신규 계정 생성:', acc.email, '→', userId);
  }

  // 성인/인증 플래그가 컬럼으로 존재하면 true 로(없으면 조용히 패스) — 매칭 성인게이트 통과용.
  for (const col of ['adult_verified', 'is_verified']) {
    try { await client.query(`UPDATE users SET ${col} = TRUE WHERE id = $1`, [userId]); }
    catch (_) { /* 컬럼 없음 — 무시 */ }
  }
  return userId;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL 환경변수가 필요합니다. (env 로만 전달하세요)');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Railway managed PG
  });
  await client.connect();

  try {
    for (const acc of ACCOUNTS) {
      acc._userId = await upsertOne(client, acc);
    }

    console.log('────────────────────────────');
    console.log(' 로그인 테스트 계정 준비 완료 (' + ACCOUNTS.length + '개)');
    for (const acc of ACCOUNTS) {
      console.log('  •', acc.email, '/', acc.password, '   (' + acc.nickname + ')  userId=' + acc._userId);
    }
    console.log(' → 로그인: 앱 첫 화면 "이메일로 로그인" 레이어');
    console.log('────────────────────────────');
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error('❌ 시드 실패:', e.message); process.exit(1); });
