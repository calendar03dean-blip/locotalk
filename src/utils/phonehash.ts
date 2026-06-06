/**
 * 전화번호 정규화 + SHA-256 해시 (경량 — expo-crypto 만 의존)
 * 지인 매칭 피하기에서 내 번호/연락처 번호를 동일 규칙으로 해시하기 위함.
 */
import * as Crypto from 'expo-crypto';

const PHONE_SALT = 'locotalk.v1.contact-hash';

/** 한국 휴대폰 번호 정규화 → 01012345678 (양쪽 동일 규칙이어야 매칭됨) */
export function normalizePhone(raw: string): string {
  let d = (raw || '').replace(/[^0-9]/g, '');
  if (!d) return '';
  if (d.startsWith('82')) d = '0' + d.slice(2);
  if (d.length === 10 && d.startsWith('10')) d = '0' + d;
  return d;
}

/** 전화번호 → SHA-256 해시 (정규화 + 솔트) */
export async function hashPhone(raw: string): Promise<string> {
  const norm = normalizePhone(raw);
  if (!norm || norm.length < 9) return '';
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    PHONE_SALT + ':' + norm,
  );
}
