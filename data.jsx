const CATEGORIES = {
  cafe:        { id: 'cafe',        label: '카페',       icon: 'coffee' },
  convenience: { id: 'convenience', label: '편의점',     icon: 'store' },
  restaurant:  { id: 'restaurant',  label: '음식점',     icon: 'utensils' },
  grocery:     { id: 'grocery',     label: '마트',       icon: 'shopping-cart' },
  movie:       { id: 'movie',       label: '영화',       icon: 'film' },
  transport:   { id: 'transport',   label: '교통',       icon: 'bus' },
  beauty:      { id: 'beauty',      label: '뷰티/생활',  icon: 'sparkles' },
  delivery:    { id: 'delivery',    label: '배달앱',     icon: 'truck' },
  online:      { id: 'online',      label: '온라인쇼핑', icon: 'globe' },
  gas:         { id: 'gas',         label: '주유',       icon: 'fuel' },
  health:      { id: 'health',      label: '의료/약국',  icon: 'help' },
  general:     { id: 'general',     label: '일반',       icon: 'tag' },
};

const STORES = [
  /* 카페 */
  { name: '스타벅스',         category: 'cafe',        sub: '카페 · 가장 자주 결제' },
  { name: '메가커피',         category: 'cafe',        sub: '카페' },
  { name: '컴포즈커피',       category: 'cafe',        sub: '카페' },
  { name: '투썸플레이스',     category: 'cafe',        sub: '카페' },
  { name: '이디야커피',       category: 'cafe',        sub: '카페' },
  { name: '빽다방',           category: 'cafe',        sub: '카페' },
  { name: '할리스',           category: 'cafe',        sub: '카페' },
  { name: '폴바셋',           category: 'cafe',        sub: '카페 · 커피전문점' },
  { name: '파스쿠찌',         category: 'cafe',        sub: '카페' },
  { name: '커피빈',           category: 'cafe',        sub: '카페' },
  { name: '엔제리너스',       category: 'cafe',        sub: '카페' },
  { name: '탐앤탐스',         category: 'cafe',        sub: '카페' },
  { name: '더벤티',           category: 'cafe',        sub: '카페' },

  /* 편의점 */
  { name: 'CU',               category: 'convenience', sub: '편의점' },
  { name: 'GS25',             category: 'convenience', sub: '편의점' },
  { name: '이마트24',         category: 'convenience', sub: '편의점' },
  { name: '세븐일레븐',       category: 'convenience', sub: '편의점' },
  { name: '미니스톱',         category: 'convenience', sub: '편의점' },
  { name: 'C-SPACE',          category: 'convenience', sub: '편의점 (신한카드)' },

  /* 음식점 */
  { name: '맥도날드',         category: 'restaurant',  sub: '패스트푸드' },
  { name: '버거킹',           category: 'restaurant',  sub: '패스트푸드' },
  { name: '롯데리아',         category: 'restaurant',  sub: '패스트푸드' },
  { name: '맘스터치',         category: 'restaurant',  sub: '패스트푸드' },
  { name: '서브웨이',         category: 'restaurant',  sub: '샌드위치' },
  { name: 'KFC',              category: 'restaurant',  sub: '패스트푸드' },
  { name: '김밥천국',         category: 'restaurant',  sub: '음식점' },
  { name: '본죽',             category: 'restaurant',  sub: '음식점' },
  { name: '파리바게뜨',       category: 'restaurant',  sub: '베이커리' },
  { name: '뚜레쥬르',         category: 'restaurant',  sub: '베이커리' },
  { name: '뚝배기집',         category: 'restaurant',  sub: '음식점' },
  { name: 'BHC치킨',          category: 'restaurant',  sub: '치킨' },
  { name: '교촌치킨',         category: 'restaurant',  sub: '치킨' },
  { name: '굽네치킨',         category: 'restaurant',  sub: '치킨' },
  { name: 'BBQ치킨',          category: 'restaurant',  sub: '치킨' },
  { name: '피자헛',           category: 'restaurant',  sub: '피자' },
  { name: '도미노피자',       category: 'restaurant',  sub: '피자' },
  { name: '파파존스',         category: 'restaurant',  sub: '피자' },
  { name: '한솥도시락',       category: 'restaurant',  sub: '도시락' },
  { name: '이솝키친',         category: 'restaurant',  sub: '음식점' },
  { name: '샤브향',           category: 'restaurant',  sub: '음식점' },
  { name: '놀부부대찌개',     category: 'restaurant',  sub: '음식점' },
  { name: '신전떡볶이',       category: 'restaurant',  sub: '분식' },
  { name: '고봉민김밥',       category: 'restaurant',  sub: '분식' },

  /* 대형마트 */
  { name: '이마트',           category: 'grocery',     sub: '대형마트' },
  { name: '홈플러스',         category: 'grocery',     sub: '대형마트' },
  { name: '롯데마트',         category: 'grocery',     sub: '대형마트' },
  { name: '코스트코',         category: 'grocery',     sub: '창고형 마트' },
  { name: 'GS슈퍼마켓',       category: 'grocery',     sub: '슈퍼마켓' },
  { name: '하나로마트',       category: 'grocery',     sub: '농협마트' },
  { name: '노브랜드',         category: 'grocery',     sub: '이마트 계열' },
  { name: '트레이더스',       category: 'grocery',     sub: '창고형 마트' },

  /* 영화 */
  { name: 'CGV',              category: 'movie',       sub: '영화관' },
  { name: '롯데시네마',       category: 'movie',       sub: '영화관' },
  { name: '메가박스',         category: 'movie',       sub: '영화관' },

  /* 교통 */
  { name: '지하철',           category: 'transport',   sub: '대중교통' },
  { name: '버스',             category: 'transport',   sub: '대중교통' },
  { name: '카카오택시',       category: 'transport',   sub: '택시' },
  { name: '우티',             category: 'transport',   sub: '택시' },
  { name: '티머니',           category: 'transport',   sub: '교통카드 충전' },
  { name: 'KTX',              category: 'transport',   sub: '기차' },
  { name: 'SRT',              category: 'transport',   sub: '기차' },
  { name: '공항버스',         category: 'transport',   sub: '교통' },
  { name: '이모빌리티',       category: 'transport',   sub: '전동킥보드' },
  { name: '킥고잉',           category: 'transport',   sub: '전동킥보드' },

  /* 배달앱 */
  { name: '배달의민족',       category: 'delivery',    sub: '배달앱' },
  { name: '쿠팡이츠',         category: 'delivery',    sub: '배달앱' },
  { name: '요기요',           category: 'delivery',    sub: '배달앱' },

  /* 온라인쇼핑 */
  { name: '쿠팡',             category: 'online',      sub: '온라인 쇼핑' },
  { name: '네이버쇼핑',       category: 'online',      sub: '온라인 쇼핑' },
  { name: '11번가',           category: 'online',      sub: '온라인 쇼핑' },
  { name: 'G마켓',            category: 'online',      sub: '온라인 쇼핑' },
  { name: '옥션',             category: 'online',      sub: '온라인 쇼핑' },
  { name: '위메프',           category: 'online',      sub: '온라인 쇼핑' },
  { name: '티몬',             category: 'online',      sub: '온라인 쇼핑' },
  { name: '무신사',           category: 'online',      sub: '온라인 쇼핑 · 패션' },
  { name: '컬리',             category: 'online',      sub: '온라인 쇼핑 · 식품' },
  { name: 'SSG닷컴',          category: 'online',      sub: '온라인 쇼핑' },
  { name: '마켓컬리',         category: 'online',      sub: '온라인 쇼핑 · 식품' },
  { name: '오늘의집',         category: 'online',      sub: '온라인 쇼핑 · 인테리어' },
  { name: '지그재그',         category: 'online',      sub: '온라인 쇼핑 · 패션' },
  { name: '에이블리',         category: 'online',      sub: '온라인 쇼핑 · 패션' },
  { name: 'YES24',             category: 'online',      sub: '온라인 서점' },
  { name: '알라딘',           category: 'online',      sub: '온라인 서점' },
  { name: '넷플릭스',         category: 'online',      sub: 'OTT 구독' },
  { name: '유튜브 프리미엄',  category: 'online',      sub: 'OTT 구독' },
  { name: '왓챠',             category: 'online',      sub: 'OTT 구독' },
  { name: '웨이브',           category: 'online',      sub: 'OTT 구독' },
  { name: '티빙',             category: 'online',      sub: 'OTT 구독' },

  /* 뷰티/생활 */
  { name: '올리브영',         category: 'beauty',      sub: '뷰티/건강' },
  { name: '다이소',           category: 'beauty',      sub: '생활용품' },
  { name: '무인양품',         category: 'beauty',      sub: '생활용품' },
  { name: '이케아',           category: 'beauty',      sub: '생활용품·가구' },
  { name: '랄라블라',         category: 'beauty',      sub: '뷰티' },
  { name: '세포라',           category: 'beauty',      sub: '뷰티' },

  /* 주유 */
  { name: 'GS칼텍스',         category: 'gas',         sub: '주유소' },
  { name: 'SK에너지',         category: 'gas',         sub: '주유소' },
  { name: 'S-OIL',            category: 'gas',         sub: '주유소' },
  { name: '현대오일뱅크',     category: 'gas',         sub: '주유소' },
  { name: 'E1',               category: 'gas',         sub: 'LPG 충전소' },

  /* 의료/약국 */
  { name: '올리브영 약국',    category: 'health',      sub: '약국' },
  { name: '약국',             category: 'health',      sub: '약국' },
  { name: '편의점약국',       category: 'health',      sub: '약국' },
  { name: '병원',             category: 'health',      sub: '병원·의원' },
  { name: '치과',             category: 'health',      sub: '치과' },
  { name: '한의원',           category: 'health',      sub: '한의원' },

  /* 일반 */
  { name: '교보문고',         category: 'general',     sub: '도서' },
  { name: '영풍문고',         category: 'general',     sub: '도서' },
  { name: 'ABC마트',          category: 'general',     sub: '신발' },
  { name: '나이키',           category: 'general',     sub: '스포츠' },
  { name: '아디다스',         category: 'general',     sub: '스포츠' },
  { name: '자라',             category: 'general',     sub: '의류' },
  { name: 'H&M',              category: 'general',     sub: '의류' },
  { name: '유니클로',         category: 'general',     sub: '의류' },
  { name: '스파오',           category: 'general',     sub: '의류' },
  { name: '탑텐',             category: 'general',     sub: '의류' },
];

// ── 전체 카드 카탈로그 (13개 카드사 · 95장) ─────────────────────────────────
const CARD_CATALOG = [

  // ════════════════════════════════════════════
  //  신한카드  (10장)
  // ════════════════════════════════════════════
  {
    id: 'shinhan-mr', issuer: '신한', brand: 'shinhan', name: 'Mr.Life', short: '신한',
    annual: 15000, network: 'visa',
    tags: ['카페', '편의점', '약국'],
    aliases: ['미스터라이프', '미스터 라이프', '미스터'],
    benefits: {
      cafe:        { rate: 0.10,  cap: 10000, type: 'discount', label: '카페 10% 청구할인 (월1만원)' },
      convenience: { rate: 0.10,  cap: 10000, type: 'discount', label: '편의점 10% 청구할인 (월1만원)' },
      health:      { rate: 0.10,  cap: 10000, type: 'discount', label: '병원·약국 10% 청구할인 (월1만원)' },
      delivery:    { rate: 0.07,  cap: 10000, type: 'discount', label: '배달앱 7% 청구할인' },
      general:     { rate: 0.005, cap: 10000, type: 'point',    label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'shinhan-deep', issuer: '신한', brand: 'shinhan', name: 'Deep Dream', short: '신한',
    annual: 15000, network: 'visa',
    tags: ['배달앱', '편의점', 'OTT'],
    aliases: ['딥드림'],
    benefits: {
      delivery:    { rate: 0.10,  cap: 20000, type: 'discount', label: '배달앱 10% 청구할인' },
      convenience: { rate: 0.10,  cap: 20000, type: 'discount', label: '편의점 10% 청구할인' },
      cafe:        { rate: 0.10,  cap: 20000, type: 'discount', label: '카페 10% 청구할인' },
      general:     { rate: 0.005, cap: 10000, type: 'point',    label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'shinhan-air', issuer: '신한', brand: 'shinhan', name: 'Air 1.5', short: '신한',
    annual: 30000, network: 'visa',
    tags: ['마일리지', '항공', '전 가맹점'],
    aliases: ['에어', '에어원점오', '에어 1.5'],
    benefits: {
      general: { rate: 0.015, cap: 50000, type: 'point', label: '전 가맹점 1.5마일/1,000원' },
    },
  },
  {
    id: 'shinhan-sline', issuer: '신한', brand: 'shinhan', name: 'S-Line 체크', short: '신한',
    annual: 0, network: 'visa',
    tags: ['온라인쇼핑', '편의점', '체크'],
    aliases: ['에스라인', '에스 라인'],
    benefits: {
      online:      { rate: 0.05,  cap: 15000, type: 'cashback', label: '온라인쇼핑 5% 캐시백' },
      convenience: { rate: 0.05,  cap: 10000, type: 'cashback', label: '편의점 5% 캐시백' },
      general:     { rate: 0.007, cap: 15000, type: 'point',    label: '기본 0.7% 포인트' },
    },
  },
  {
    id: 'shinhan-sol', issuer: '신한', brand: 'shinhan', name: 'SOL트래블 체크', short: '신한',
    annual: 0, network: 'master',
    tags: ['해외결제', '환율우대', '교통'],
    aliases: ['솔트래블', '솔 트래블', '트래블', '해외'],
    benefits: {
      transport: { rate: 0.05,  cap: 10000, type: 'cashback', label: '교통 5% 캐시백' },
      general:   { rate: 0.015, cap: 30000, type: 'cashback', label: '해외·국내 1.5% 캐시백' },
    },
  },
  {
    id: 'shinhan-bbig', issuer: '신한', brand: 'shinhan', name: 'B.Big', short: '신한',
    annual: 10000, network: 'visa',
    tags: ['온라인쇼핑', '배달앱', '카페'],
    aliases: ['비빅', '비 빅', '비빅카드'],
    benefits: {
      online:   { rate: 0.10, cap: 25000, type: 'discount', label: '온라인쇼핑 10% 청구할인' },
      delivery: { rate: 0.10, cap: 20000, type: 'discount', label: '배달앱 10% 청구할인' },
      cafe:     { rate: 0.07, cap: 15000, type: 'discount', label: '카페 7% 청구할인' },
      general:  { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'shinhan-land', issuer: '신한', brand: 'shinhan', name: 'Land 노랑 체크', short: '신한',
    annual: 0, network: 'visa',
    tags: ['교통', '카페', '체크'],
    aliases: ['랜드', '랜드노랑', '랜드 노랑'],
    benefits: {
      transport:   { rate: 0.10, cap: 10000, type: 'cashback', label: '대중교통 10% 캐시백' },
      cafe:        { rate: 0.05, cap: 8000,  type: 'cashback', label: '카페 5% 캐시백' },
      convenience: { rate: 0.05, cap: 5000,  type: 'cashback', label: '편의점 5% 캐시백' },
      general:     { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'shinhan-rpm', issuer: '신한', brand: 'shinhan', name: 'RPM+', short: '신한',
    annual: 20000, network: 'visa',
    tags: ['주유', '전 가맹점'],
    aliases: ['알피엠', '알피엠플러스', '알피엠 플러스'],
    benefits: {
      gas:     { rate: 0.06, cap: 20000, type: 'discount', label: '주유 6% 청구할인' },
      general: { rate: 0.007, cap: 15000, type: 'point',   label: '기본 0.7% 포인트' },
    },
  },
  {
    id: 'shinhan-deepoil', issuer: '신한', brand: 'shinhan', name: 'Deep Oil', short: '신한',
    annual: 5000, network: 'visa',
    tags: ['주유', 'LPG', '충전소'],
    aliases: ['딥오일', '딥 오일'],
    benefits: {
      gas:     { rate: 0.07, cap: 30000, type: 'discount', label: '주유·LPG 7% 청구할인' },
      general: { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'shinhan-heyoung', issuer: '신한', brand: 'shinhan', name: 'heyoung 체크', short: '신한',
    annual: 0, network: 'visa',
    tags: ['편의점', '카페', 'OTT', '체크'],
    aliases: ['헤영', '헤이영', '헤이 영'],
    benefits: {
      convenience: { rate: 0.10, cap: 10000, type: 'cashback', label: '편의점 10% 캐시백' },
      cafe:        { rate: 0.07, cap: 8000,  type: 'cashback', label: '카페 7% 캐시백' },
      delivery:    { rate: 0.05, cap: 7000,  type: 'cashback', label: '배달앱 5% 캐시백' },
      general:     { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },

  // ════════════════════════════════════════════
  //  현대카드  (10장)
  // ════════════════════════════════════════════
  {
    id: 'hyundai-zero', issuer: '현대', brand: 'hyundai', name: 'ZERO Edition2', short: '현대',
    annual: 10000, network: 'visa',
    tags: ['전 가맹점', '캐시백'],
    aliases: ['제로', '제로에디션', '제로 에디션', '에디션'],
    benefits: {
      grocery: { rate: 0.015, cap: null, type: 'discount', label: '생활필수업종 1.5% 청구할인' },
      general: { rate: 0.007, cap: null, type: 'discount', label: '전 가맹점 0.7% 청구할인' },
    },
  },
  {
    id: 'hyundai-m', issuer: '현대', brand: 'hyundai', name: 'M 에디션2', short: '현대',
    annual: 20000, network: 'master',
    tags: ['M포인트', '백화점', '마트'],
    aliases: ['엠에디션', '엠 에디션'],
    benefits: {
      grocery: { rate: 0.02, cap: 30000, type: 'point', label: '대형마트 2% M포인트' },
      general: { rate: 0.01, cap: 30000, type: 'point', label: '전 가맹점 1% M포인트' },
    },
  },
  {
    id: 'hyundai-costco', issuer: '현대', brand: 'hyundai', name: '코스트코 현대카드', short: '현대',
    annual: 0, network: 'visa',
    tags: ['코스트코', '마트', '캐시백'],
    benefits: {
      grocery: { rate: 0.02, cap: 40000, type: 'cashback', label: '코스트코 2% 캐시백' },
      general: { rate: 0.01, cap: 20000, type: 'cashback', label: '일반 1% 캐시백' },
    },
  },
  {
    id: 'hyundai-simple', issuer: '현대', brand: 'hyundai', name: 'SIMPLE+', short: '현대',
    annual: 10000, network: 'visa',
    tags: ['교통', '온라인'],
    aliases: ['심플플러스', '심플 플러스', '심플'],
    benefits: {
      transport: { rate: 0.10,  cap: 10000, type: 'cashback', label: '교통 10% 캐시백' },
      online:    { rate: 0.03,  cap: 15000, type: 'cashback', label: '온라인 3% 캐시백' },
      general:   { rate: 0.005, cap: 10000, type: 'cashback', label: '기본 0.5% 캐시백' },
    },
  },
  {
    id: 'hyundai-green', issuer: '현대', brand: 'hyundai', name: 'the Green', short: '현대',
    annual: 10000, network: 'master',
    tags: ['카페', '전 가맹점', '포인트'],
    aliases: ['더그린', '그린'],
    benefits: {
      cafe:    { rate: 0.02, cap: 15000, type: 'point', label: '카페 2% M포인트' },
      general: { rate: 0.007, cap: 20000, type: 'point', label: '전 가맹점 0.7% M포인트' },
    },
  },
  {
    id: 'hyundai-pink', issuer: '현대', brand: 'hyundai', name: 'the Pink', short: '현대',
    annual: 10000, network: 'master',
    tags: ['뷰티', '카페', '포인트'],
    aliases: ['더핑크', '핑크'],
    benefits: {
      beauty:  { rate: 0.05, cap: 15000, type: 'point', label: '뷰티/미용 5% M포인트' },
      cafe:    { rate: 0.02, cap: 10000, type: 'point', label: '카페 2% M포인트' },
      general: { rate: 0.007, cap: 20000, type: 'point', label: '전 가맹점 0.7% M포인트' },
    },
  },
  {
    id: 'hyundai-dive', issuer: '현대', brand: 'hyundai', name: 'DIVE', short: '현대',
    annual: 5000, network: 'visa',
    tags: ['OTT', '배달앱', '온라인'],
    aliases: ['다이브'],
    benefits: {
      online:   { rate: 0.05, cap: 20000, type: 'cashback', label: 'OTT·스트리밍 5% 캐시백' },
      delivery: { rate: 0.03, cap: 15000, type: 'cashback', label: '배달앱 3% 캐시백' },
      general:  { rate: 0.007, cap: 15000, type: 'point',   label: '기본 0.7% 포인트' },
    },
  },
  {
    id: 'hyundai-x', issuer: '현대', brand: 'hyundai', name: 'X 에디션2', short: '현대',
    annual: 15000, network: 'visa',
    tags: ['교통', '주유', '포인트'],
    aliases: ['엑스에디션', '엑스 에디션'],
    benefits: {
      transport: { rate: 0.10, cap: 15000, type: 'cashback', label: '교통 10% 캐시백' },
      gas:       { rate: 0.04, cap: 10000, type: 'cashback', label: '주유 4% 캐시백' },
      general:   { rate: 0.007, cap: 15000, type: 'point',   label: '기본 0.7% 포인트' },
    },
  },
  {
    id: 'hyundai-mobility', issuer: '현대', brand: 'hyundai', name: 'MOBILITY', short: '현대',
    annual: 5000, network: 'visa',
    tags: ['교통', '주유', '대중교통'],
    aliases: ['모빌리티'],
    benefits: {
      transport: { rate: 0.10, cap: 12000, type: 'cashback', label: '대중교통 10% 캐시백' },
      gas:       { rate: 0.03, cap: 8000,  type: 'cashback', label: '주유 3% 캐시백' },
      general:   { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'hyundai-zerom', issuer: '현대', brand: 'hyundai', name: 'ZERO Mobile', short: '현대',
    annual: 0, network: 'visa',
    tags: ['전 가맹점', '캐시백', '모바일'],
    aliases: ['제로모바일', '제로 모바일', '제로m'],
    benefits: {
      general: { rate: 0.015, cap: 30000, type: 'cashback', label: '전 가맹점 1.5% 캐시백' },
    },
  },

  // ════════════════════════════════════════════
  //  KB국민카드  (10장)
  // ════════════════════════════════════════════
  {
    id: 'kb-toktok', issuer: 'KB', brand: 'kb', name: '톡톡 Pro', short: 'KB',
    annual: 10000, network: 'visa',
    tags: ['카페', '편의점', '영화'],
    aliases: ['톡톡프로', '프로'],
    benefits: {
      convenience: { rate: 0.15, cap: 15000, type: 'discount', label: '편의점 15% 청구할인' },
      cafe:        { rate: 0.15, cap: 15000, type: 'discount', label: '카페 15% 청구할인' },
      movie:       { rate: 0.30, cap: 10000, type: 'discount', label: '영화 30% 청구할인' },
      delivery:    { rate: 0.10, cap: 10000, type: 'discount', label: '배달앱 10% 청구할인' },
      general:     { rate: 0,    cap: 0,     type: null,       label: '' },
    },
  },
  {
    id: 'kb-wesher', issuer: 'KB', brand: 'kb', name: 'My WE:SH', short: 'KB',
    annual: 10000, network: 'master',
    tags: ['배달앱', '카페', '온라인'],
    aliases: ['마이위시', '마이 위시', '위시', '웨시', '마이웨시'],
    benefits: {
      delivery: { rate: 0.10, cap: 20000, type: 'discount', label: '배달앱 10% 청구할인' },
      cafe:     { rate: 0.10, cap: 20000, type: 'discount', label: '카페 10% 청구할인' },
      online:   { rate: 0.10, cap: 20000, type: 'discount', label: '온라인쇼핑 10% 청구할인' },
      general:  { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'kb-dadam', issuer: 'KB', brand: 'kb', name: '다담카드', short: 'KB',
    annual: 5000, network: 'visa',
    tags: ['마트', '교통', '주유'],
    benefits: {
      grocery:   { rate: 0.05, cap: 20000, type: 'discount', label: '대형마트 5% 청구할인' },
      transport: { rate: 0.05, cap: 10000, type: 'discount', label: '교통 5% 청구할인' },
      gas:       { rate: 0.04, cap: 8000,  type: 'discount', label: '주유 4% 청구할인' },
      general:   { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'kb-pay', issuer: 'KB', brand: 'kb', name: 'KB Pay 카드', short: 'KB',
    annual: 0, network: 'visa',
    tags: ['온라인', '캐시백', '전 가맹점'],
    aliases: ['케이비페이', 'kb페이', '페이'],
    benefits: {
      online:  { rate: 0.03, cap: 15000, type: 'cashback', label: '온라인 3% 캐시백' },
      general: { rate: 0.01, cap: 20000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'kb-gaon', issuer: 'KB', brand: 'kb', name: '가온 카드', short: 'KB',
    annual: 15000, network: 'visa',
    tags: ['음식점', '마트', '포인트'],
    benefits: {
      restaurant: { rate: 0.05, cap: 20000, type: 'point', label: '음식점 5% KB포인트' },
      grocery:    { rate: 0.03, cap: 15000, type: 'point', label: '대형마트 3% KB포인트' },
      general:    { rate: 0.007, cap: 15000, type: 'point', label: '기본 0.7% KB포인트' },
    },
  },
  {
    id: 'kb-tantanroad', issuer: 'KB', brand: 'kb', name: '탄탄대로 티타늄', short: 'KB',
    annual: 15000, network: 'visa',
    tags: ['주유', '교통', '포인트'],
    benefits: {
      gas:       { rate: 0.05, cap: 20000, type: 'discount', label: '주유 5% 청구할인' },
      transport: { rate: 0.10, cap: 10000, type: 'discount', label: '교통 10% 청구할인' },
      general:   { rate: 0.007, cap: 15000, type: 'point',   label: '기본 0.7% 포인트' },
    },
  },
  {
    id: 'kb-easy', issuer: 'KB', brand: 'kb', name: '이지 체크', short: 'KB',
    annual: 0, network: 'visa',
    tags: ['편의점', '교통', '체크'],
    aliases: ['이지체크'],
    benefits: {
      convenience: { rate: 0.05, cap: 8000, type: 'cashback', label: '편의점 5% 캐시백' },
      transport:   { rate: 0.05, cap: 6000, type: 'cashback', label: '교통 5% 캐시백' },
      general:     { rate: 0.005, cap: 10000, type: 'point',  label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'kb-nori', issuer: 'KB', brand: 'kb', name: '노리 체크', short: 'KB',
    annual: 0, network: 'visa',
    tags: ['편의점', '카페', '체크'],
    benefits: {
      convenience: { rate: 0.05, cap: 6000, type: 'cashback', label: '편의점 5% 캐시백' },
      cafe:        { rate: 0.05, cap: 5000, type: 'cashback', label: '카페 5% 캐시백' },
      general:     { rate: 0.005, cap: 8000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'kb-skypass', issuer: 'KB', brand: 'kb', name: '대한항공 스카이패스', short: 'KB',
    annual: 30000, network: 'visa',
    tags: ['마일리지', '항공', '전 가맹점'],
    aliases: ['스카이패스', '대한항공', '항공마일리지'],
    benefits: {
      general: { rate: 0.015, cap: 60000, type: 'point', label: '전 가맹점 1.5마일/1,000원' },
    },
  },
  {
    id: 'kb-classy', issuer: 'KB', brand: 'kb', name: 'Class Y 체크', short: 'KB',
    annual: 0, network: 'visa',
    tags: ['편의점', '교통', '카페', '체크'],
    aliases: ['클래스와이', '클래스 와이', '클래스', '클래스y'],
    benefits: {
      convenience: { rate: 0.10, cap: 8000,  type: 'cashback', label: '편의점 10% 캐시백' },
      transport:   { rate: 0.10, cap: 8000,  type: 'cashback', label: '교통 10% 캐시백' },
      cafe:        { rate: 0.05, cap: 5000,  type: 'cashback', label: '카페 5% 캐시백' },
      general:     { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },

  // ════════════════════════════════════════════
  //  삼성카드  (10장)
  // ════════════════════════════════════════════
  {
    id: 'samsung-tap', issuer: '삼성', brand: 'samsung', name: 'taptap O', short: '삼성',
    annual: 10000, network: 'visa',
    tags: ['교통', '카페', '편의점'],
    aliases: ['탭탭오', '탭탭', '탭탭 오'],
    benefits: {
      transport:   { rate: 0.10, cap: 5000,  type: 'discount', label: '대중교통 10% 청구할인 (월5천원)' },
      cafe:        { rate: 0.50, cap: 10000, type: 'discount', label: '스타벅스·카페 50% 청구할인 (월1만원)' },
      convenience: { rate: 0.07, cap: 5000,  type: 'discount', label: '편의점·쇼핑 7% 청구할인 (월5천원)' },
      general:     { rate: 0.005, cap: 5000, type: 'point',    label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'samsung-idon', issuer: '삼성', brand: 'samsung', name: 'iD ON', short: '삼성',
    annual: 10000, network: 'visa',
    tags: ['신세계', '이마트', '영화'],
    aliases: ['아이디온', '아이디 온'],
    benefits: {
      grocery: { rate: 0.05,  cap: 30000, type: 'discount', label: '이마트·신세계 5% 청구할인' },
      movie:   { rate: 0.40,  cap: 12000, type: 'discount', label: '영화 40% 청구할인' },
      general: { rate: 0.005, cap: 10000, type: 'point',    label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'samsung-platinum', issuer: '삼성', brand: 'samsung', name: 'The Platinum', short: '삼성',
    annual: 50000, network: 'amex',
    tags: ['음식점', '전 가맹점', '포인트'],
    aliases: ['플래티넘', '플라티넘', '더플래티넘'],
    benefits: {
      restaurant: { rate: 0.02,  cap: 50000, type: 'point', label: '음식점 2% 포인트' },
      general:    { rate: 0.007, cap: 30000, type: 'point', label: '전 가맹점 0.7% 포인트' },
    },
  },
  {
    id: 'samsung-smile', issuer: '삼성', brand: 'samsung', name: '스마일카드', short: '삼성',
    annual: 0, network: 'visa',
    tags: ['G마켓', 'SSG', '온라인'],
    aliases: ['스마일', '지마켓', '에스에스지'],
    benefits: {
      online:  { rate: 0.04, cap: 20000, type: 'discount', label: 'G마켓·SSG 4% 청구할인' },
      general: { rate: 0.01, cap: 15000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'samsung-essential', issuer: '삼성', brand: 'samsung', name: 'iD ESSENTIAL', short: '삼성',
    annual: 0, network: 'visa',
    tags: ['전 가맹점', '포인트'],
    aliases: ['아이디에센셜', '아이디 에센셜', '에센셜'],
    benefits: {
      general: { rate: 0.007, cap: 20000, type: 'point', label: '전 가맹점 0.7% 포인트' },
    },
  },
  {
    id: 'samsung-fan', issuer: '삼성', brand: 'samsung', name: 'FAN', short: '삼성',
    annual: 5000, network: 'visa',
    tags: ['OTT', '스트리밍', '온라인'],
    aliases: ['팬'],
    benefits: {
      online:  { rate: 0.05, cap: 15000, type: 'cashback', label: 'OTT·스트리밍 5% 캐시백' },
      general: { rate: 0.01, cap: 15000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'samsung-latte', issuer: '삼성', brand: 'samsung', name: '30 LATTE', short: '삼성',
    annual: 5000, network: 'visa',
    tags: ['카페', '배달앱', '편의점'],
    aliases: ['라떼', '삼십라떼', '삼십 라떼'],
    benefits: {
      cafe:        { rate: 0.07, cap: 12000, type: 'cashback', label: '카페 7% 캐시백' },
      delivery:    { rate: 0.05, cap: 10000, type: 'cashback', label: '배달앱 5% 캐시백' },
      convenience: { rate: 0.05, cap: 8000,  type: 'cashback', label: '편의점 5% 캐시백' },
      general:     { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'samsung-6', issuer: '삼성', brand: 'samsung', name: '삼성카드 6', short: '삼성',
    annual: 10000, network: 'visa',
    tags: ['전 가맹점', '포인트'],
    aliases: ['육', '삼성육'],
    benefits: {
      cafe:        { rate: 0.03, cap: 10000, type: 'point', label: '카페 3% 포인트' },
      restaurant:  { rate: 0.03, cap: 10000, type: 'point', label: '음식점 3% 포인트' },
      online:      { rate: 0.03, cap: 10000, type: 'point', label: '온라인 3% 포인트' },
      general:     { rate: 0.007, cap: 15000, type: 'point', label: '기본 0.7% 포인트' },
    },
  },
  {
    id: 'samsung-link', issuer: '삼성', brand: 'samsung', name: 'LINK', short: '삼성',
    annual: 0, network: 'visa',
    tags: ['온라인', '제휴', '캐시백'],
    aliases: ['링크'],
    benefits: {
      online:  { rate: 0.05, cap: 20000, type: 'cashback', label: '제휴 쇼핑몰 5% 캐시백' },
      general: { rate: 0.01, cap: 15000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'samsung-tapw', issuer: '삼성', brand: 'samsung', name: 'taptap W', short: '삼성',
    annual: 0, network: 'master',
    tags: ['교통', '전 가맹점', '캐시백'],
    aliases: ['탭탭더블유', '탭탭 더블유', '탭탭w'],
    benefits: {
      transport: { rate: 0.05, cap: 10000, type: 'cashback', label: '교통 5% 캐시백' },
      general:   { rate: 0.01, cap: 20000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },

  // ════════════════════════════════════════════
  //  우리카드  (8장)
  // ════════════════════════════════════════════
  {
    id: 'woori-every', issuer: '우리', brand: 'woori', name: '카드의정석 EVERY', short: '우리',
    annual: 10000, network: 'visa',
    tags: ['교통', '편의점'],
    aliases: ['에브리', '카드의정석에브리'],
    benefits: {
      transport:   { rate: 0.12,  cap: 10000, type: 'discount', label: '대중교통 12% 청구할인' },
      convenience: { rate: 0.10,  cap: 10000, type: 'discount', label: '편의점 10% 청구할인' },
      general:     { rate: 0.007, cap: 20000, type: 'point',    label: '기본 0.7% 포인트' },
    },
  },
  {
    id: 'woori-da', issuer: '우리', brand: 'woori', name: 'Da@ 카드', short: '우리',
    annual: 5000, network: 'visa',
    tags: ['온라인쇼핑'],
    aliases: ['다앳', '다 앳', '다'],
    benefits: {
      online:  { rate: 0.05, cap: 20000, type: 'discount', label: '온라인쇼핑 5% 청구할인' },
      general: { rate: 0.007, cap: 15000, type: 'point',   label: '기본 0.7% 포인트' },
    },
  },
  {
    id: 'woori-wonder', issuer: '우리', brand: 'woori', name: '원더 비자', short: '우리',
    annual: 0, network: 'visa',
    tags: ['카페', '배달앱', '캐시백'],
    aliases: ['원더'],
    benefits: {
      cafe:     { rate: 0.05, cap: 7000,  type: 'cashback', label: '카페 5% 캐시백' },
      delivery: { rate: 0.05, cap: 7000,  type: 'cashback', label: '배달앱 5% 캐시백' },
      general:  { rate: 0.01, cap: 20000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'woori-cookie', issuer: '우리', brand: 'woori', name: '카드의정석 COOKIE', short: '우리',
    annual: 10000, network: 'visa',
    tags: ['배달앱', '카페', '편의점'],
    aliases: ['쿠키', '카드의정석쿠키'],
    benefits: {
      delivery:    { rate: 0.10, cap: 15000, type: 'discount', label: '배달앱 10% 청구할인' },
      cafe:        { rate: 0.10, cap: 10000, type: 'discount', label: '카페 10% 청구할인' },
      convenience: { rate: 0.10, cap: 10000, type: 'discount', label: '편의점 10% 청구할인' },
      general:     { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'woori-point', issuer: '우리', brand: 'woori', name: '카드의정석 POINT', short: '우리',
    annual: 5000, network: 'visa',
    tags: ['전 가맹점', '포인트'],
    aliases: ['포인트', '카드의정석포인트'],
    benefits: {
      general: { rate: 0.01, cap: 25000, type: 'point', label: '전 가맹점 1% 포인트' },
    },
  },
  {
    id: 'woori-money', issuer: '우리', brand: 'woori', name: '카드의정석 MONEY', short: '우리',
    annual: 5000, network: 'visa',
    tags: ['전 가맹점', '캐시백'],
    aliases: ['머니', '카드의정석머니'],
    benefits: {
      general: { rate: 0.01, cap: 25000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'woori-newpoint', issuer: '우리', brand: 'woori', name: '뉴포인트 카드', short: '우리',
    annual: 0, network: 'visa',
    tags: ['전 가맹점', '포인트'],
    benefits: {
      general: { rate: 0.007, cap: 20000, type: 'point', label: '전 가맹점 0.7% 포인트' },
    },
  },
  {
    id: 'woori-v', issuer: '우리', brand: 'woori', name: '우리V카드', short: '우리',
    annual: 10000, network: 'visa',
    tags: ['전 가맹점', 'V포인트'],
    aliases: ['브이카드', 'v카드'],
    benefits: {
      restaurant: { rate: 0.02,  cap: 20000, type: 'point', label: '음식점 2% V포인트' },
      general:    { rate: 0.007, cap: 20000, type: 'point', label: '전 가맹점 0.7% V포인트' },
    },
  },

  // ════════════════════════════════════════════
  //  하나카드  (8장)
  // ════════════════════════════════════════════
  {
    id: 'hana-1q', issuer: '하나', brand: 'hana', name: '1Q 카드', short: '하나',
    annual: 10000, network: 'visa',
    tags: ['온라인쇼핑', '교통'],
    aliases: ['원큐', '원 큐', '일큐'],
    benefits: {
      online:    { rate: 0.03,  cap: 20000, type: 'discount', label: '온라인쇼핑 3% 청구할인' },
      transport: { rate: 0.10,  cap: 10000, type: 'discount', label: '교통 10% 청구할인' },
      general:   { rate: 0.007, cap: 15000, type: 'point',    label: '기본 0.7% 포인트' },
    },
  },
  {
    id: 'hana-travel', issuer: '하나', brand: 'hana', name: '트래블로그', short: '하나',
    annual: 0, network: 'master',
    tags: ['해외', '환전', '교통'],
    aliases: ['트래블', '해외결제'],
    benefits: {
      transport: { rate: 0.05, cap: 10000, type: 'cashback', label: '교통 5% 캐시백' },
      general:   { rate: 0.015, cap: 30000, type: 'cashback', label: '해외·국내 1.5% 캐시백' },
    },
  },
  {
    id: 'hana-clubsk', issuer: '하나', brand: 'hana', name: '클럽SK', short: '하나',
    annual: 10000, network: 'visa',
    tags: ['SK통신', '주유', '카페'],
    aliases: ['클럽에스케이', '클럽 에스케이'],
    benefits: {
      gas:     { rate: 0.05, cap: 10000, type: 'discount', label: '주유 5% 청구할인' },
      cafe:    { rate: 0.05, cap: 8000,  type: 'discount', label: '카페 5% 청구할인' },
      general: { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'hana-oneq', issuer: '하나', brand: 'hana', name: 'ONE Q', short: '하나',
    annual: 0, network: 'visa',
    tags: ['전 가맹점', '포인트'],
    aliases: ['원큐', '원 큐'],
    benefits: {
      general: { rate: 0.01, cap: 25000, type: 'point', label: '전 가맹점 1% 포인트' },
    },
  },
  {
    id: 'hana-bigpot', issuer: '하나', brand: 'hana', name: '빅팟 체크', short: '하나',
    annual: 0, network: 'visa',
    tags: ['카페', '배달앱', '편의점', '체크'],
    aliases: ['빅팟'],
    benefits: {
      cafe:        { rate: 0.05, cap: 8000, type: 'cashback', label: '카페 5% 캐시백' },
      delivery:    { rate: 0.05, cap: 8000, type: 'cashback', label: '배달앱 5% 캐시백' },
      convenience: { rate: 0.05, cap: 6000, type: 'cashback', label: '편의점 5% 캐시백' },
      general:     { rate: 0.005, cap: 10000, type: 'point',  label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'hana-handmade', issuer: '하나', brand: 'hana', name: '핸드메이드 카드', short: '하나',
    annual: 10000, network: 'visa',
    tags: ['맞춤형', '선택혜택'],
    benefits: {
      cafe:     { rate: 0.05, cap: 10000, type: 'discount', label: '선택카테고리 5% 청구할인' },
      general:  { rate: 0.007, cap: 15000, type: 'point',   label: '기본 0.7% 포인트' },
    },
  },
  {
    id: 'hana-airplus', issuer: '하나', brand: 'hana', name: '에어플러스 VISA', short: '하나',
    annual: 30000, network: 'visa',
    tags: ['마일리지', '항공', '전 가맹점'],
    aliases: ['에어플러스'],
    benefits: {
      general: { rate: 0.012, cap: 50000, type: 'point', label: '전 가맹점 1.2마일/1,000원' },
    },
  },
  {
    id: 'hana-1qplus', issuer: '하나', brand: 'hana', name: '1Q+ 체크', short: '하나',
    annual: 0, network: 'visa',
    tags: ['교통', '주유', '체크'],
    aliases: ['원큐플러스', '원큐 플러스', '일큐플러스'],
    benefits: {
      transport: { rate: 0.10, cap: 10000, type: 'cashback', label: '교통 10% 캐시백' },
      gas:       { rate: 0.04, cap: 8000,  type: 'cashback', label: '주유 4% 캐시백' },
      general:   { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },

  // ════════════════════════════════════════════
  //  롯데카드  (8장)
  // ════════════════════════════════════════════
  {
    id: 'lotte-movie', issuer: '롯데', brand: 'lotte', name: '로카 무비', short: '롯데',
    annual: 5000, network: 'visa',
    tags: ['영화'],
    aliases: ['로카무비'],
    benefits: {
      movie:   { rate: 0.50,  cap: 16000, type: 'discount', label: '영화 50% 청구할인 (월 2회)' },
      general: { rate: 0.005, cap: 5000,  type: 'point',    label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'lotte-365', issuer: '롯데', brand: 'lotte', name: 'LOCA 365', short: '롯데',
    annual: 0, network: 'visa',
    tags: ['전 가맹점', '캐시백', '주말'],
    aliases: ['로카', '로카삼육오', '로카365'],
    benefits: {
      cafe:        { rate: 0.03, cap: 10000, type: 'cashback', label: '(주말) 카페 3% 캐시백' },
      convenience: { rate: 0.03, cap: 10000, type: 'cashback', label: '(주말) 편의점 3% 캐시백' },
      general:     { rate: 0.01, cap: 20000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'lotte-maxx', issuer: '롯데', brand: 'lotte', name: '롯데마트 MAXX', short: '롯데',
    annual: 0, network: 'visa',
    tags: ['롯데마트', '마트', '편의점'],
    aliases: ['맥스', '마트맥스'],
    benefits: {
      grocery:     { rate: 0.10, cap: 30000, type: 'discount', label: '롯데마트 10% 청구할인' },
      convenience: { rate: 0.05, cap: 10000, type: 'discount', label: '편의점 5% 청구할인' },
      general:     { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'lotte-super', issuer: '롯데', brand: 'lotte', name: 'SUPER 레드', short: '롯데',
    annual: 0, network: 'visa',
    tags: ['온라인', '배달앱', '캐시백'],
    aliases: ['슈퍼레드', '슈퍼 레드', '슈퍼'],
    benefits: {
      online:   { rate: 0.05, cap: 15000, type: 'cashback', label: '온라인쇼핑 5% 캐시백' },
      delivery: { rate: 0.05, cap: 10000, type: 'cashback', label: '배달앱 5% 캐시백' },
      general:  { rate: 0.01, cap: 15000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'lotte-likit', issuer: '롯데', brand: 'lotte', name: 'Likit', short: '롯데',
    annual: 0, network: 'visa',
    tags: ['카페', '온라인', '캐시백'],
    aliases: ['리킷', '라이킷'],
    benefits: {
      cafe:    { rate: 0.05, cap: 8000,  type: 'cashback', label: '카페 5% 캐시백' },
      online:  { rate: 0.03, cap: 10000, type: 'cashback', label: '온라인 3% 캐시백' },
      general: { rate: 0.01, cap: 15000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'lotte-starbucks', issuer: '롯데', brand: 'lotte', name: 'LOCA 스타벅스', short: '롯데',
    annual: 0, network: 'visa',
    tags: ['스타벅스', '카페'],
    aliases: ['로카스타벅스', '스타벅스카드'],
    benefits: {
      cafe:    { rate: 0.10, cap: 10000, type: 'discount', label: '스타벅스 10% 청구할인' },
      general: { rate: 0.01, cap: 15000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'lotte-amex', issuer: '롯데', brand: 'lotte', name: '롯데 AMEX', short: '롯데',
    annual: 30000, network: 'amex',
    tags: ['마일리지', '항공', '전 가맹점'],
    aliases: ['아멕스', '아메리칸익스프레스', '롯데아멕스'],
    benefits: {
      general: { rate: 0.01, cap: 40000, type: 'point', label: '전 가맹점 1마일/1,000원' },
    },
  },
  {
    id: 'lotte-dream', issuer: '롯데', brand: 'lotte', name: '롯데 드림 체크', short: '롯데',
    annual: 0, network: 'visa',
    tags: ['전 가맹점', '포인트', '체크'],
    benefits: {
      general: { rate: 0.007, cap: 15000, type: 'point', label: '전 가맹점 0.7% 포인트' },
    },
  },

  // ════════════════════════════════════════════
  //  NH농협카드  (8장)
  // ════════════════════════════════════════════
  {
    id: 'nh-flex', issuer: 'NH농협', brand: 'nh', name: '올바른 FLEX', short: 'NH',
    annual: 5000, network: 'visa',
    tags: ['교통', '마트', '주유'],
    aliases: ['플렉스', '올바른플렉스'],
    benefits: {
      transport: { rate: 0.10, cap: 10000, type: 'discount', label: '대중교통 10% 청구할인' },
      grocery:   { rate: 0.05, cap: 20000, type: 'discount', label: '마트 5% 청구할인' },
      gas:       { rate: 0.05, cap: 10000, type: 'discount', label: '주유 5% 청구할인' },
      general:   { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'nh-classic', issuer: 'NH농협', brand: 'nh', name: 'NH채움 클래식', short: 'NH',
    annual: 5000, network: 'visa',
    tags: ['전 가맹점', '포인트'],
    aliases: ['채움클래식', '채움 클래식', '클래식'],
    benefits: {
      grocery: { rate: 0.01,  cap: 10000, type: 'point', label: '마트 1% 포인트' },
      general: { rate: 0.007, cap: 20000, type: 'point', label: '전 가맹점 0.7% 포인트' },
    },
  },
  {
    id: 'nh-check', issuer: 'NH농협', brand: 'nh', name: 'NH올바른 체크', short: 'NH',
    annual: 0, network: 'visa',
    tags: ['마트', '교통', '체크'],
    benefits: {
      grocery:   { rate: 0.05, cap: 10000, type: 'cashback', label: '마트 5% 캐시백' },
      transport: { rate: 0.05, cap: 5000,  type: 'cashback', label: '교통 5% 캐시백' },
      general:   { rate: 0.005, cap: 10000, type: 'cashback', label: '기본 0.5% 캐시백' },
    },
  },
  {
    id: 'nh-allone', issuer: 'NH농협', brand: 'nh', name: '올원 BC카드', short: 'NH',
    annual: 0, network: 'bc',
    tags: ['전 가맹점', '캐시백'],
    aliases: ['올원'],
    benefits: {
      general: { rate: 0.015, cap: 30000, type: 'cashback', label: '전 가맹점 1.5% 캐시백' },
    },
  },
  {
    id: 'nh-npay', issuer: 'NH농협', brand: 'nh', name: 'NH N Pay', short: 'NH',
    annual: 0, network: 'master',
    tags: ['온라인', '간편결제', '캐시백'],
    aliases: ['엔페이', '엔 페이', '엔페이카드'],
    benefits: {
      online:  { rate: 0.03, cap: 15000, type: 'cashback', label: '온라인 결제 3% 캐시백' },
      general: { rate: 0.01, cap: 20000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'nh-hanaro', issuer: 'NH농협', brand: 'nh', name: '하나로 클럽 카드', short: 'NH',
    annual: 5000, network: 'visa',
    tags: ['마트', '슈퍼마켓', '포인트'],
    benefits: {
      grocery: { rate: 0.07, cap: 20000, type: 'discount', label: '농협마트·하나로마트 7% 할인' },
      general: { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'nh-point', issuer: 'NH농협', brand: 'nh', name: 'NH채움 포인트', short: 'NH',
    annual: 0, network: 'visa',
    tags: ['전 가맹점', '포인트'],
    aliases: ['채움포인트'],
    benefits: {
      general: { rate: 0.01, cap: 20000, type: 'point', label: '전 가맹점 1% 포인트' },
    },
  },
  {
    id: 'nh-travel', issuer: 'NH농협', brand: 'nh', name: '올바른 TRAVEL', short: 'NH',
    annual: 10000, network: 'master',
    tags: ['해외결제', '여행', '교통'],
    aliases: ['올바른트래블', '올바른 트래블', '트래블'],
    benefits: {
      transport: { rate: 0.05, cap: 10000, type: 'cashback', label: '교통 5% 캐시백' },
      general:   { rate: 0.02, cap: 30000, type: 'cashback', label: '해외 결제 2% 캐시백' },
    },
  },

  // ════════════════════════════════════════════
  //  토스뱅크  (3장)
  // ════════════════════════════════════════════
  {
    id: 'toss-check', issuer: '토스뱅크', brand: 'toss', name: '토스뱅크 카드', short: '토스',
    annual: 0, network: 'visa',
    tags: ['카페', '편의점', '캐시백', '전 가맹점'],
    benefits: {
      cafe:        { rate: 0.07, cap: 7000,  type: 'cashback', label: '카페 7% 캐시백' },
      convenience: { rate: 0.07, cap: 7000,  type: 'cashback', label: '편의점 7% 캐시백' },
      general:     { rate: 0.02, cap: 30000, type: 'cashback', label: '전 가맹점 2% 캐시백' },
    },
  },
  {
    id: 'toss-credit', issuer: '토스뱅크', brand: 'toss', name: '토스 신용카드', short: '토스',
    annual: 0, network: 'visa',
    tags: ['전 가맹점', '캐시백', '신용'],
    benefits: {
      general: { rate: 0.02, cap: 40000, type: 'cashback', label: '전 가맹점 2% 캐시백' },
    },
  },
  {
    id: 'toss-pparit', issuer: '토스뱅크', brand: 'toss', name: '토스뱅크 빠릿카드', short: '토스',
    annual: 0, network: 'visa',
    tags: ['세금', '공과금', '캐시백'],
    aliases: ['빠릿카드', '빠릿'],
    benefits: {
      general: { rate: 0.015, cap: 20000, type: 'cashback', label: '전 가맹점 1.5% 캐시백' },
    },
  },

  // ════════════════════════════════════════════
  //  카카오뱅크  (3장)
  // ════════════════════════════════════════════
  {
    id: 'kakao-check', issuer: '카카오뱅크', brand: 'kakao', name: '카카오뱅크 체크카드', short: '카카오',
    annual: 0, network: 'visa',
    tags: ['편의점', '카페', '캐시백'],
    benefits: {
      convenience: { rate: 0.05, cap: 5000,  type: 'cashback', label: '편의점 5% 캐시백' },
      cafe:        { rate: 0.03, cap: 5000,  type: 'cashback', label: '카페 3% 캐시백' },
      general:     { rate: 0.01, cap: 10000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'kakao-friends', issuer: '카카오뱅크', brand: 'kakao', name: '카카오뱅크 프렌즈 체크', short: '카카오',
    annual: 0, network: 'visa',
    tags: ['편의점', '카페', '온라인'],
    aliases: ['프렌즈', '프렌즈체크'],
    benefits: {
      convenience: { rate: 0.05, cap: 5000,  type: 'cashback', label: '편의점 5% 캐시백' },
      online:      { rate: 0.03, cap: 8000,  type: 'cashback', label: '온라인 3% 캐시백' },
      general:     { rate: 0.01, cap: 10000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'kakao-uni', issuer: '카카오뱅크', brand: 'kakao', name: '카카오뱅크 대학생 체크', short: '카카오',
    annual: 0, network: 'visa',
    tags: ['교통', '편의점', '카페', '체크'],
    aliases: ['대학생체크', '대학생 체크'],
    benefits: {
      transport:   { rate: 0.05, cap: 5000,  type: 'cashback', label: '교통 5% 캐시백' },
      convenience: { rate: 0.05, cap: 4000,  type: 'cashback', label: '편의점 5% 캐시백' },
      cafe:        { rate: 0.03, cap: 4000,  type: 'cashback', label: '카페 3% 캐시백' },
      general:     { rate: 0.005, cap: 8000,  type: 'point',   label: '기본 0.5% 포인트' },
    },
  },

  // ════════════════════════════════════════════
  //  카카오페이  (2장)
  // ════════════════════════════════════════════
  {
    id: 'kakaopay-card', issuer: '카카오페이', brand: 'kakao', name: '카카오페이 신용카드', short: '카카오',
    annual: 0, network: 'visa',
    tags: ['온라인', '결제', '캐시백'],
    aliases: ['카카오페이신용', '카카오페이'],
    benefits: {
      online:  { rate: 0.03, cap: 10000, type: 'cashback', label: '온라인 결제 3% 캐시백' },
      general: { rate: 0.01, cap: 15000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'kakaopay-check', issuer: '카카오페이', brand: 'kakao', name: '카카오페이 체크카드', short: '카카오',
    annual: 0, network: 'visa',
    tags: ['카카오페이', '온라인', '캐시백'],
    aliases: ['카카오페이체크'],
    benefits: {
      online:  { rate: 0.05, cap: 8000,  type: 'cashback', label: '카카오페이 결제 5% 캐시백' },
      general: { rate: 0.01, cap: 10000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },

  // ════════════════════════════════════════════
  //  케이뱅크  (5장)
  // ════════════════════════════════════════════
  {
    id: 'kbank-codek', issuer: '케이뱅크', brand: 'kbank', name: '코드K 체크카드', short: '케이',
    annual: 0, network: 'visa',
    tags: ['배달앱', '카페', '캐시백'],
    aliases: ['코드케이', '코드 케이'],
    benefits: {
      delivery: { rate: 0.05, cap: 7500,  type: 'cashback', label: '배달앱 5% 캐시백' },
      cafe:     { rate: 0.07, cap: 7000,  type: 'cashback', label: '카페 7% 캐시백' },
      general:  { rate: 0.01, cap: 15000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'kbank-shopping', issuer: '케이뱅크', brand: 'kbank', name: '코드K SHOPPING', short: '케이',
    annual: 0, network: 'visa',
    tags: ['온라인쇼핑', '쿠팡'],
    aliases: ['코드케이쇼핑', '쇼핑', '코드k쇼핑'],
    benefits: {
      online:  { rate: 0.05, cap: 15000, type: 'cashback', label: '온라인쇼핑 5% 캐시백' },
      general: { rate: 0.01, cap: 15000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'kbank-platinum', issuer: '케이뱅크', brand: 'kbank', name: '케이뱅크 플래티넘 체크', short: '케이',
    annual: 0, network: 'visa',
    tags: ['전 가맹점', '캐시백'],
    aliases: ['플래티넘', '플래티넘체크'],
    benefits: {
      general: { rate: 0.015, cap: 25000, type: 'cashback', label: '전 가맹점 1.5% 캐시백' },
    },
  },
  {
    id: 'kbank-creedit', issuer: '케이뱅크', brand: 'kbank', name: '케이뱅크 크리핏 카드', short: '케이',
    annual: 0, network: 'visa',
    tags: ['신용', '전 가맹점', '캐시백'],
    aliases: ['크리핏', '크레딧'],
    benefits: {
      general: { rate: 0.02, cap: 30000, type: 'cashback', label: '전 가맹점 2% 캐시백' },
    },
  },
  {
    id: 'kbank-point', issuer: '케이뱅크', brand: 'kbank', name: '코드K 포인트', short: '케이',
    annual: 0, network: 'visa',
    tags: ['전 가맹점', '포인트'],
    aliases: ['코드케이포인트', '코드k포인트'],
    benefits: {
      general: { rate: 0.01, cap: 20000, type: 'point', label: '전 가맹점 1% 포인트' },
    },
  },

  // ════════════════════════════════════════════
  //  BC카드  (5장)
  // ════════════════════════════════════════════
  {
    id: 'bc-baro', issuer: 'BC', brand: 'bc', name: '바로 포인트', short: 'BC',
    annual: 5000, network: 'bc',
    tags: ['전 가맹점', '포인트'],
    benefits: {
      general: { rate: 0.015, cap: 30000, type: 'point', label: '전 가맹점 1.5% 포인트' },
    },
  },
  {
    id: 'bc-paybooc', issuer: 'BC', brand: 'bc', name: '페이북 BC카드', short: 'BC',
    annual: 0, network: 'bc',
    tags: ['온라인', '페이북'],
    aliases: ['페이북'],
    benefits: {
      online:  { rate: 0.03, cap: 10000, type: 'point', label: '온라인 결제 3% 포인트' },
      general: { rate: 0.01, cap: 15000, type: 'point', label: '전 가맹점 1% 포인트' },
    },
  },
  {
    id: 'bc-barocheck', issuer: 'BC', brand: 'bc', name: 'BC바로 체크카드', short: 'BC',
    annual: 0, network: 'bc',
    tags: ['전 가맹점', '캐시백', '체크'],
    benefits: {
      general: { rate: 0.007, cap: 15000, type: 'cashback', label: '전 가맹점 0.7% 캐시백' },
    },
  },
  {
    id: 'bc-discount', issuer: 'BC', brand: 'bc', name: 'BC 청구할인 카드', short: 'BC',
    annual: 5000, network: 'bc',
    tags: ['전 가맹점', '청구할인'],
    benefits: {
      cafe:    { rate: 0.03, cap: 10000, type: 'discount', label: '카페 3% 청구할인' },
      general: { rate: 0.01, cap: 20000, type: 'discount', label: '전 가맹점 1% 청구할인' },
    },
  },
  {
    id: 'bc-emart', issuer: 'BC', brand: 'bc', name: 'BC 이마트 카드', short: 'BC',
    annual: 0, network: 'bc',
    tags: ['이마트', '마트', '할인'],
    benefits: {
      grocery: { rate: 0.05, cap: 20000, type: 'discount', label: '이마트 5% 청구할인' },
      general: { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },

  // ════════════════════════════════════════════
  //  IBK기업은행  (5장)
  // ════════════════════════════════════════════
  {
    id: 'ibk-itouch', issuer: 'IBK기업은행', brand: 'ibk', name: 'i-Touch 카드', short: 'IBK',
    annual: 5000, network: 'visa',
    tags: ['음식점', '온라인'],
    aliases: ['아이터치', '아이 터치'],
    benefits: {
      restaurant: { rate: 0.05, cap: 10000, type: 'discount', label: '외식 5% 청구할인' },
      online:     { rate: 0.03, cap: 10000, type: 'discount', label: '온라인쇼핑 3% 청구할인' },
      general:    { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'ibk-worker', issuer: 'IBK기업은행', brand: 'ibk', name: 'IBK 직장인카드', short: 'IBK',
    annual: 0, network: 'bc',
    tags: ['교통', '편의점'],
    benefits: {
      transport:   { rate: 0.05, cap: 8000,  type: 'cashback', label: '교통 5% 캐시백' },
      convenience: { rate: 0.03, cap: 5000,  type: 'cashback', label: '편의점 3% 캐시백' },
      general:     { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'ibk-ione', issuer: 'IBK기업은행', brand: 'ibk', name: 'IBK i-ONE 카드', short: 'IBK',
    annual: 5000, network: 'visa',
    tags: ['전 가맹점', '포인트'],
    aliases: ['아이원', '아이 원', 'i원'],
    benefits: {
      restaurant: { rate: 0.02,  cap: 15000, type: 'point', label: '음식점 2% 포인트' },
      general:    { rate: 0.007, cap: 15000, type: 'point', label: '전 가맹점 0.7% 포인트' },
    },
  },
  {
    id: 'ibk-plus', issuer: 'IBK기업은행', brand: 'ibk', name: 'IBK 더하다 카드', short: 'IBK',
    annual: 5000, network: 'visa',
    tags: ['마트', '카페', '포인트'],
    aliases: ['더하다'],
    benefits: {
      grocery: { rate: 0.05, cap: 15000, type: 'point', label: '마트 5% 포인트' },
      cafe:    { rate: 0.03, cap: 8000,  type: 'point', label: '카페 3% 포인트' },
      general: { rate: 0.007, cap: 12000, type: 'point', label: '기본 0.7% 포인트' },
    },
  },
  {
    id: 'ibk-bc', issuer: 'IBK기업은행', brand: 'ibk', name: 'IBK 기업BC카드', short: 'IBK',
    annual: 0, network: 'bc',
    tags: ['전 가맹점', '포인트'],
    benefits: {
      general: { rate: 0.007, cap: 15000, type: 'point', label: '전 가맹점 0.7% 포인트' },
    },
  },

  // ════════════════════════════════════════════
  //  현대카드 추가 (the Red, the Purple, M3)
  // ════════════════════════════════════════════
  {
    id: 'hyundai-red', issuer: '현대', brand: 'hyundai', name: 'the Red', short: '현대',
    annual: 100000, network: 'visa',
    tags: ['항공마일', '전 가맹점', '프리미엄'],
    aliases: ['더레드', '레드'],
    benefits: {
      general: { rate: 0.02, cap: null, type: 'point', label: '전 가맹점 2% M포인트' },
    },
  },
  {
    id: 'hyundai-purple', issuer: '현대', brand: 'hyundai', name: 'the Purple', short: '현대',
    annual: 300000, network: 'amex',
    tags: ['PLCC', '프리미엄', '마일리지'],
    aliases: ['더퍼플', '퍼플'],
    benefits: {
      general: { rate: 0.025, cap: null, type: 'point', label: '전 가맹점 2.5% M포인트' },
    },
  },
  {
    id: 'hyundai-m3', issuer: '현대', brand: 'hyundai', name: 'M3 카드', short: '현대',
    annual: 30000, network: 'master',
    tags: ['M포인트', '전 가맹점', '포인트'],
    aliases: ['엠쓰리', '엠3', 'm3'],
    benefits: {
      grocery:  { rate: 0.03, cap: 50000, type: 'point', label: '마트·백화점 3% M포인트' },
      general:  { rate: 0.015, cap: 30000, type: 'point', label: '전 가맹점 1.5% M포인트' },
    },
  },

  // ════════════════════════════════════════════
  //  KB국민카드 추가 (알뜰교통카드, 해외여행)
  // ════════════════════════════════════════════
  {
    id: 'kb-transport', issuer: 'KB', brand: 'kb', name: 'KB 알뜰교통카드', short: 'KB',
    annual: 0, network: 'visa',
    tags: ['교통', '대중교통', '체크'],
    aliases: ['알뜰교통', '알뜰 교통'],
    benefits: {
      transport: { rate: 0.20, cap: 10000, type: 'cashback', label: '대중교통 20% 캐시백' },
      general:   { rate: 0.005, cap: 8000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
  {
    id: 'kb-global', issuer: 'KB', brand: 'kb', name: 'KB 글로벌 마스터', short: 'KB',
    annual: 15000, network: 'master',
    tags: ['해외결제', '환율우대', '여행'],
    aliases: ['글로벌마스터', '글로벌', '해외'],
    benefits: {
      transport: { rate: 0.05, cap: 10000, type: 'cashback', label: '교통 5% 캐시백' },
      general:   { rate: 0.02, cap: 30000, type: 'cashback', label: '해외 결제 2% 캐시백' },
    },
  },

  // ════════════════════════════════════════════
  //  삼성카드 추가 (3, 7)
  // ════════════════════════════════════════════
  {
    id: 'samsung-3', issuer: '삼성', brand: 'samsung', name: '삼성카드 3', short: '삼성',
    annual: 15000, network: 'visa',
    tags: ['전 가맹점', '포인트'],
    aliases: ['삼성3', '삼성 3', '쓰리'],
    benefits: {
      restaurant:  { rate: 0.03, cap: 15000, type: 'point', label: '음식점 3% 포인트' },
      convenience: { rate: 0.03, cap: 8000,  type: 'point', label: '편의점 3% 포인트' },
      general:     { rate: 0.01, cap: 20000, type: 'point', label: '전 가맹점 1% 포인트' },
    },
  },
  {
    id: 'samsung-7', issuer: '삼성', brand: 'samsung', name: '삼성카드 7', short: '삼성',
    annual: 20000, network: 'visa',
    tags: ['전 가맹점', '포인트', '프리미엄'],
    aliases: ['삼성7', '삼성 7', '세븐'],
    benefits: {
      cafe:        { rate: 0.05, cap: 15000, type: 'point', label: '카페 5% 포인트' },
      restaurant:  { rate: 0.05, cap: 15000, type: 'point', label: '음식점 5% 포인트' },
      general:     { rate: 0.015, cap: 25000, type: 'point', label: '전 가맹점 1.5% 포인트' },
    },
  },

  // ════════════════════════════════════════════
  //  우리카드 추가 (CHECK카드, 스마트)
  // ════════════════════════════════════════════
  {
    id: 'woori-check', issuer: '우리', brand: 'woori', name: '카드의정석 CHECK', short: '우리',
    annual: 0, network: 'visa',
    tags: ['전 가맹점', '캐시백', '체크'],
    aliases: ['체크', '카드의정석체크', '카드의 정석'],
    benefits: {
      convenience: { rate: 0.05, cap: 6000,  type: 'cashback', label: '편의점 5% 캐시백' },
      transport:   { rate: 0.05, cap: 6000,  type: 'cashback', label: '교통 5% 캐시백' },
      general:     { rate: 0.007, cap: 15000, type: 'cashback', label: '전 가맹점 0.7% 캐시백' },
    },
  },
  {
    id: 'woori-smart', issuer: '우리', brand: 'woori', name: '우리 스마트폰 카드', short: '우리',
    annual: 5000, network: 'visa',
    tags: ['통신비', '온라인', '할인'],
    aliases: ['스마트폰', '통신비카드'],
    benefits: {
      online:   { rate: 0.05, cap: 15000, type: 'discount', label: '통신요금·온라인 5% 청구할인' },
      general:  { rate: 0.007, cap: 15000, type: 'point',   label: '기본 0.7% 포인트' },
    },
  },

  // ════════════════════════════════════════════
  //  하나카드 추가 (VIVA, 하나멤버스)
  // ════════════════════════════════════════════
  {
    id: 'hana-viva', issuer: '하나', brand: 'hana', name: 'VIVA 2 체크', short: '하나',
    annual: 0, network: 'visa',
    tags: ['전 가맹점', '캐시백', '체크'],
    aliases: ['비바', '비바2', '비바 2'],
    benefits: {
      convenience: { rate: 0.05, cap: 5000,  type: 'cashback', label: '편의점 5% 캐시백' },
      restaurant:  { rate: 0.03, cap: 8000,  type: 'cashback', label: '음식점 3% 캐시백' },
      general:     { rate: 0.01, cap: 15000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'hana-members', issuer: '하나', brand: 'hana', name: '하나멤버스 1Q', short: '하나',
    annual: 5000, network: 'visa',
    tags: ['포인트', '하나멤버스', '전 가맹점'],
    aliases: ['하나멤버스', '멤버스', '멤버스원큐'],
    benefits: {
      grocery:  { rate: 0.02, cap: 20000, type: 'point', label: '마트 2% 하나머니' },
      general:  { rate: 0.01, cap: 20000, type: 'point', label: '전 가맹점 1% 하나머니' },
    },
  },

  // ════════════════════════════════════════════
  //  롯데카드 추가 (더중한, 로카 캐시백)
  // ════════════════════════════════════════════
  {
    id: 'lotte-junghan', issuer: '롯데', brand: 'lotte', name: '더중한카드', short: '롯데',
    annual: 15000, network: 'visa',
    tags: ['항공마일', 'OK캐쉬백', '전 가맹점'],
    aliases: ['더중한', '중한'],
    benefits: {
      general: { rate: 0.01, cap: 30000, type: 'point', label: '전 가맹점 1% OK캐쉬백' },
    },
  },
  {
    id: 'lotte-cashback', issuer: '롯데', brand: 'lotte', name: 'LOCA 캐시백', short: '롯데',
    annual: 0, network: 'visa',
    tags: ['전 가맹점', '캐시백'],
    aliases: ['로카캐시백', '로카 캐시백'],
    benefits: {
      grocery:  { rate: 0.02, cap: 15000, type: 'cashback', label: '마트 2% 캐시백' },
      general:  { rate: 0.01, cap: 20000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },

  // ════════════════════════════════════════════
  //  NH농협카드 추가 (굿라이프, 올바른 생활)
  // ════════════════════════════════════════════
  {
    id: 'nh-goodlife', issuer: 'NH농협', brand: 'nh', name: '굿라이프 체크카드', short: 'NH',
    annual: 0, network: 'visa',
    tags: ['편의점', '카페', '체크'],
    aliases: ['굿라이프', '굿 라이프'],
    benefits: {
      convenience: { rate: 0.07, cap: 7000,  type: 'cashback', label: '편의점 7% 캐시백' },
      cafe:        { rate: 0.05, cap: 5000,  type: 'cashback', label: '카페 5% 캐시백' },
      general:     { rate: 0.01, cap: 15000, type: 'cashback', label: '전 가맹점 1% 캐시백' },
    },
  },
  {
    id: 'nh-living', issuer: 'NH농협', brand: 'nh', name: '올바른 생활 카드', short: 'NH',
    annual: 5000, network: 'visa',
    tags: ['마트', '배달앱', '온라인'],
    aliases: ['올바른생활', '올바른 생활'],
    benefits: {
      grocery:  { rate: 0.05, cap: 15000, type: 'discount', label: '마트 5% 청구할인' },
      delivery: { rate: 0.05, cap: 8000,  type: 'discount', label: '배달앱 5% 청구할인' },
      general:  { rate: 0.005, cap: 10000, type: 'point',   label: '기본 0.5% 포인트' },
    },
  },
];

// 사용자 기본 등록 카드 (앱 최초 실행 시 샘플)
const CARDS = [
  { ...CARD_CATALOG.find(c => c.id === 'shinhan-mr'),   spent: 14200, capTotal: 50000 },
  { ...CARD_CATALOG.find(c => c.id === 'hyundai-zero'), spent: 31500, capTotal: 50000 },
  { ...CARD_CATALOG.find(c => c.id === 'kb-toktok'),    spent:  8400, capTotal: 40000 },
  { ...CARD_CATALOG.find(c => c.id === 'samsung-tap'),  spent: 22100, capTotal: 40000 },
  { ...CARD_CATALOG.find(c => c.id === 'woori-every'),  spent: 18600, capTotal: 45000 },
  { ...CARD_CATALOG.find(c => c.id === 'toss-check'),   spent:  5200, capTotal: 30000 },
];

const RECOMMEND = [
  { id: 'hana-1q',       issuer: '하나',       brand: 'hana',    name: '1Q 카드',              expectedSave: 22400, reason: '온라인 쇼핑(쿠팡·네이버)과 교통비가 매월 40만원 이상',      keyBenefit: '온라인쇼핑 3% + 교통 10% 청구할인', annual: 10000 },
  { id: 'lotte-movie',   issuer: '롯데',       brand: 'lotte',   name: '로카 무비',             expectedSave: 16000, reason: '월 2~3회 CGV·롯데시네마 이용 패턴 감지',                    keyBenefit: '영화 최대 50% 할인 (월 2회)',        annual:  5000 },
  { id: 'lotte-365',     issuer: '롯데',       brand: 'lotte',   name: 'LOCA 365',              expectedSave: 14200, reason: '주말에 카페·편의점 결제 비중이 높음',                        keyBenefit: '주말 카페·편의점 3% + 전 가맹점 1%', annual:     0 },
  { id: 'nh-flex',       issuer: 'NH농협',     brand: 'nh',      name: '올바른 FLEX',           expectedSave: 19800, reason: '출퇴근 교통비 + 마트·주유 결제가 매월 50만원 이상',          keyBenefit: '교통 10% + 마트 5% + 주유 50원/L',  annual:  5000 },
  { id: 'kakao-check',   issuer: '카카오뱅크', brand: 'kakao',   name: '카카오뱅크 체크카드',   expectedSave:  9600, reason: '카페·편의점 소액 결제가 월 40회 이상',                       keyBenefit: '편의점 5% + 카페 3% 캐시백',         annual:     0 },
  { id: 'bc-baro',       issuer: 'BC',         brand: 'bc',      name: '바로 포인트',           expectedSave: 11000, reason: '다양한 가맹점에서 고르게 소비하는 패턴',                    keyBenefit: '전 가맹점 1.5% 포인트 균일 적립',    annual:  5000 },
  { id: 'kbank-codek',   issuer: '케이뱅크',   brand: 'kbank',   name: '코드K 체크카드',        expectedSave: 13400, reason: '배달앱·카페 결제가 매월 15만원 이상',                        keyBenefit: '배달앱 5% + 카페 7% 캐시백',         annual:     0 },
  { id: 'shinhan-deep',  issuer: '신한',       brand: 'shinhan', name: 'Deep Dream',            expectedSave: 17600, reason: '배달앱·온라인 구독 결제 비중이 높음',                        keyBenefit: '배달앱·편의점·카페 10% 청구할인',    annual: 15000 },
  { id: 'hyundai-m',     issuer: '현대',       brand: 'hyundai', name: 'M 에디션2',             expectedSave: 20100, reason: '백화점·대형마트 월 소비가 30만원 이상',                      keyBenefit: '전 가맹점 1% M포인트 + 백화점 추가', annual: 20000 },
  { id: 'samsung-idon',  issuer: '삼성',       brand: 'samsung', name: 'iD ON',                 expectedSave: 15300, reason: '신세계·이마트·스타벅스 결제 비중이 높음',                   keyBenefit: '신세계/이마트 5% + 영화 최대 40%',   annual: 10000 },
  { id: 'ibk-itouch',    issuer: 'IBK기업은행', brand: 'ibk',   name: 'i-Touch 카드',           expectedSave: 10200, reason: '직장인 외식·온라인 쇼핑 결제가 잦음',                        keyBenefit: '외식 5% + 온라인쇼핑 3% 청구할인',  annual:  5000 },
];

const SPEND_PATTERN = [
  { cat: 'cafe',        label: '카페',    amount: 142000, color: '#D88A2B' },
  { cat: 'restaurant',  label: '음식점',  amount: 318000, color: '#1A1714' },
  { cat: 'delivery',    label: '배달앱',  amount:  98000, color: '#C5543A' },
  { cat: 'online',      label: '온라인',  amount: 156000, color: '#1b6fb3' },
  { cat: 'convenience', label: '편의점',  amount:  86000, color: '#4A8A5C' },
  { cat: 'transport',   label: '교통',    amount:  72000, color: '#5C544A' },
  { cat: 'grocery',     label: '마트',    amount: 124000, color: '#9A9082' },
];

const BENEFIT_TYPE_LABEL = {
  cashback: '캐시백',
  point:    '포인트',
  discount: '청구할인',
};

function calcBenefit(card, category, amount) {
  const benefit = card.benefits[category] || card.benefits.general;
  if (!benefit || !benefit.rate) return { value: 0, label: '혜택 없음', capped: false, type: null, rate: 0 };
  const raw   = Math.floor(amount * benefit.rate);
  const value = benefit.cap ? Math.min(raw, benefit.cap) : raw;
  const capped = benefit.cap && raw >= benefit.cap;
  return { value, label: benefit.label, capped, rate: benefit.rate, type: benefit.type };
}

window.CardBData = { CATEGORIES, STORES, CARDS, CARD_CATALOG, RECOMMEND, SPEND_PATTERN, calcBenefit, BENEFIT_TYPE_LABEL };
