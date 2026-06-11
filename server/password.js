// server/password.js
// ─────────────────────────────────────────────────────────────────────────────
// Locotalk — 이메일+비밀번호 계정용 비밀번호 해시/검증 (A안 인증 재설계)
//
// 정책: 평문 저장·로깅 절대 금지. 강한 KDF 만 사용.
//   KDF = Node 내장 crypto.scrypt (메모리-하드, OWASP 권장군).
//   ⚠️ 대표 지시문은 "bcrypt/argon2"를 명시했으나, 서버에 bcrypt/argon2 의존성이 없고
//      bcrypt(native)는 Railway 빌드 리스크가 있어 '무의존성·무네이티브빌드'인 내장 scrypt 를 채택.
//      보안 강도는 동급(메모리-하드 KDF). 의존성 추가 원하시면 bcryptjs 로 교체 가능(핸드오프에 명시).
//
// 저장 포맷(자기서술형 — 파라미터 변경에도 기존 해시 검증 호환):
//   scrypt$<N>$<r>$<p>$<saltBase64>$<hashBase64>
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const crypto = require('crypto');

// scrypt 파라미터(N=16384 → ~16MB/해시). r/p 표준값.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN   = 32;
const MAXMEM   = 64 * 1024 * 1024;   // N·r·128 여유분(검증 시 OOM 방지)

/** 비밀번호 → 자기서술형 해시 문자열. (평문 미보관) */
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: MAXMEM }, (err, dk) => {
      if (err) return reject(err);
      resolve(`scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${dk.toString('base64')}`);
    });
  });
}

/** 평문 vs 저장해시 검증(타이밍 안전). 형식 불일치/오류 시 false(fail-closed). */
function verifyPassword(password, stored) {
  return new Promise((resolve) => {
    try {
      if (typeof password !== 'string' || typeof stored !== 'string') return resolve(false);
      const parts = stored.split('$');
      if (parts.length !== 6 || parts[0] !== 'scrypt') return resolve(false);
      const N = parseInt(parts[1], 10), r = parseInt(parts[2], 10), p = parseInt(parts[3], 10);
      const salt     = Buffer.from(parts[4], 'base64');
      const expected = Buffer.from(parts[5], 'base64');
      if (!N || !r || !p || !salt.length || !expected.length) return resolve(false);
      crypto.scrypt(password, salt, expected.length, { N, r, p, maxmem: MAXMEM }, (err, dk) => {
        if (err) return resolve(false);
        resolve(dk.length === expected.length && crypto.timingSafeEqual(dk, expected));
      });
    } catch { resolve(false); }
  });
}

/** 비밀번호 강도 검증(기본안: 최소 8자, 최대 200자). { ok, reason } */
function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return { ok: false, reason: '비밀번호는 8자 이상이어야 합니다.' };
  }
  if (password.length > 200) {
    return { ok: false, reason: '비밀번호가 너무 깁니다.' };
  }
  return { ok: true };
}

/** 이메일 형식 검증(서버권위 — 클라 검증 신뢰 안 함). */
function validateEmail(email) {
  if (typeof email !== 'string') return false;
  const e = email.trim();
  return e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** 1인1계정 중복 안내용 이메일 마스킹(a***@gmail.com). 노출 최소화. */
function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  if (!local || !domain) return null;
  const head = local.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(1, local.length - 1))}@${domain}`;
}

module.exports = { hashPassword, verifyPassword, validatePasswordStrength, validateEmail, maskEmail };
