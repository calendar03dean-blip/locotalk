/**
 * 지인 매칭 피하기 — 연락처 전화번호 해시 유틸 (프리미엄 기능)
 *
 * 프라이버시: 전화번호 원본은 절대 저장/전송하지 않고 SHA-256 해시만 사용.
 *  - 내 본인인증 번호와 상대 연락처 번호가 "같은 정규화 + 같은 솔트"로 해시되어야
 *    매칭 제외가 정확히 동작한다. (반드시 hashPhone 하나로 통일)
 */
import * as Contacts from 'expo-contacts';
import { hashPhone } from './phonehash';

export { normalizePhone, hashPhone } from './phonehash';

/**
 * 연락처 권한 요청 → 모든 연락처 전화번호를 해시 목록으로 반환.
 * @returns granted: 권한 허용 여부, hashes: 해시 배열(중복 제거)
 */
export async function loadContactPhoneHashes(): Promise<{ granted: boolean; hashes: string[] }> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') return { granted: false, hashes: [] };

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers],
  });

  const set = new Set<string>();
  for (const c of data) {
    for (const p of c.phoneNumbers || []) {
      const h = await hashPhone(p.number || '');
      if (h) set.add(h);
    }
  }
  // 과도한 payload 방지를 위해 상한 (대부분 사용자는 수백 개 이하)
  const hashes = [...set].slice(0, 5000);
  return { granted: true, hashes };
}
