/**
 * codename.ts — 자동 생성 코드네임 (온보딩 자유 닉네임 대체)
 *
 * 형식: <형용사|색><동물> " #" <4자리 hex 대문자>
 *   예) "조용한너구리 #7F3A"
 *
 * 피벗 정합: 실명=본인인증(서버 CI) / 표시=익명 코드네임.
 *   userId(idv)=식별 키, 코드네임=표시용. 코드네임은 user.nickname 필드에 저장한다.
 *
 * 단어셋은 비속어·민감조합을 배제한 큐레이션 목록(코드네임 목적 = 욕설필터 불필요).
 * 서버(server/codename.js)와 동일한 단어셋을 유지해야 한다(검증 일원화).
 * 한국 우선 서비스 — UI 언어와 무관하게 한국어 코드네임으로 통일(식별·표시 안정).
 */

/** 형용사 + 색 (관형형 — 명사 앞에 바로 붙음) */
export const CODENAME_ADJECTIVES: string[] = [
  '조용한', '용감한', '다정한', '느긋한', '빛나는', '포근한', '슬기로운', '씩씩한',
  '잔잔한', '따뜻한', '상냥한', '활발한', '든든한', '차분한', '부드러운', '명랑한',
  '우아한', '신나는', '정다운', '의젓한', '늠름한', '깜찍한', '재빠른', '영리한',
  '단정한', '너그러운', '훤칠한', '다부진', '소담한', '고요한',
  // 색
  '푸른', '붉은', '노란', '초록', '보라', '하얀', '까만', '파란',
  '분홍', '주황', '청록', '황금', '은빛', '새벽', '쪽빛', '연두',
];

/** 동물 */
export const CODENAME_ANIMALS: string[] = [
  '너구리', '다람쥐', '고양이', '강아지', '여우', '사슴', '토끼', '거북이',
  '수달', '두더지', '햄스터', '고슴도치', '펭귄', '부엉이', '올빼미', '참새',
  '제비', '비둘기', '기러기', '두루미', '백조', '돌고래', '고래', '물개',
  '판다', '코알라', '개구리', '달팽이', '무당벌레', '잠자리', '나비', '반딧불이',
  '살쾡이', '오소리', '청설모', '담비', '수리', '매', '왜가리', '물총새',
];

/** 4자리 16진(대문자) */
function randomHex4(): string {
  let h = '';
  for (let i = 0; i < 4; i++) {
    h += Math.floor(Math.random() * 16).toString(16).toUpperCase();
  }
  return h;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 코드네임 1건 생성: "<형용사><동물> #XXXX" */
export function generateCodename(): string {
  return `${pick(CODENAME_ADJECTIVES)}${pick(CODENAME_ANIMALS)} #${randomHex4()}`;
}

/** 충돌 시 hex만 재생성(형용사·동물 유지). 파싱 실패 시 전체 재생성. */
export function rerollHex(codename: string): string {
  const m = /^(.+) #[0-9A-F]{4}$/.exec(codename);
  if (!m) return generateCodename();
  return `${m[1]} #${randomHex4()}`;
}

/** 단어셋 + hex 패턴 검증 정규식 (클라 사전검증용; 권위 검증은 서버) */
const ADJ_ALT = CODENAME_ADJECTIVES.join('|');
const ANI_ALT = CODENAME_ANIMALS.join('|');
const CODENAME_RE = new RegExp(`^(?:${ADJ_ALT})(?:${ANI_ALT}) #[0-9A-F]{4}$`);

/** 허용 단어셋 + hex 패턴에 부합하는 코드네임인지 */
export function isValidCodename(name: string): boolean {
  return typeof name === 'string' && CODENAME_RE.test(name);
}
