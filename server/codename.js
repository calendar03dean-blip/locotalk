/**
 * codename.js — 코드네임 서버측 검증 (온보딩 자유 닉네임 대체)
 *
 * 형식: <형용사|색><동물>  예) "조용한너구리"  (구버전 " #XXXX" hex 접미사는 검증만 호환)
 *
 * 권위 검증: 허용 단어셋만 수용(hex 접미사는 선택), 임의 문자열 거부.
 *   클라(src/constants/codename.ts)와 동일한 단어셋을 유지해야 한다(검증 일원화).
 *   ※ 검증파생 필드(isVerified/adult/gender/birth)는 별도로 여전히 미수용(56e78f5 권위 유지) — 여기선 표시명만.
 */

// 형용사 + 색 (관형형)
const CODENAME_ADJECTIVES = [
  '조용한', '용감한', '다정한', '느긋한', '빛나는', '포근한', '슬기로운', '씩씩한',
  '잔잔한', '따뜻한', '상냥한', '활발한', '든든한', '차분한', '부드러운', '명랑한',
  '우아한', '신나는', '정다운', '의젓한', '늠름한', '깜찍한', '재빠른', '영리한',
  '단정한', '너그러운', '훤칠한', '다부진', '소담한', '고요한',
  '푸른', '붉은', '노란', '초록', '보라', '하얀', '까만', '파란',
  '분홍', '주황', '청록', '황금', '은빛', '새벽', '쪽빛', '연두',
];

// 동물
const CODENAME_ANIMALS = [
  '너구리', '다람쥐', '고양이', '강아지', '여우', '사슴', '토끼', '거북이',
  '수달', '두더지', '햄스터', '고슴도치', '펭귄', '부엉이', '올빼미', '참새',
  '제비', '비둘기', '기러기', '두루미', '백조', '돌고래', '고래', '물개',
  '판다', '코알라', '개구리', '달팽이', '무당벌레', '잠자리', '나비', '반딧불이',
  '살쾡이', '오소리', '청설모', '담비', '수리', '매', '왜가리', '물총새',
];

const ADJ_ALT = CODENAME_ADJECTIVES.join('|');
const ANI_ALT = CODENAME_ANIMALS.join('|');
// hex 접미사는 '선택'(신버전=없음, 구버전=" #XXXX" 호환) — 클라(codename.ts)와 동일.
const CODENAME_RE = new RegExp(`^(?:${ADJ_ALT})(?:${ANI_ALT})( #[0-9A-F]{4})?$`);

/** 허용 단어셋 + hex 패턴에 부합하는 코드네임인지 */
function isValidCodename(name) {
  return typeof name === 'string' && CODENAME_RE.test(name);
}

module.exports = { isValidCodename, CODENAME_ADJECTIVES, CODENAME_ANIMALS };
