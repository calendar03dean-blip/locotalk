/**
 * 전국 주요 시/구 목록 (프리미엄 지역 선택용)
 */

export interface District {
  city  : string;   // 시/도
  gu    : string;   // 구/군
  label : string;   // 표시명 (시·구)
}

export const DISTRICTS: District[] = [
  // 서울특별시
  { city: '서울', gu: '강남구',   label: '서울 · 강남구'   },
  { city: '서울', gu: '강동구',   label: '서울 · 강동구'   },
  { city: '서울', gu: '강북구',   label: '서울 · 강북구'   },
  { city: '서울', gu: '강서구',   label: '서울 · 강서구'   },
  { city: '서울', gu: '관악구',   label: '서울 · 관악구'   },
  { city: '서울', gu: '광진구',   label: '서울 · 광진구'   },
  { city: '서울', gu: '구로구',   label: '서울 · 구로구'   },
  { city: '서울', gu: '금천구',   label: '서울 · 금천구'   },
  { city: '서울', gu: '노원구',   label: '서울 · 노원구'   },
  { city: '서울', gu: '도봉구',   label: '서울 · 도봉구'   },
  { city: '서울', gu: '동대문구', label: '서울 · 동대문구' },
  { city: '서울', gu: '동작구',   label: '서울 · 동작구'   },
  { city: '서울', gu: '마포구',   label: '서울 · 마포구'   },
  { city: '서울', gu: '서대문구', label: '서울 · 서대문구' },
  { city: '서울', gu: '서초구',   label: '서울 · 서초구'   },
  { city: '서울', gu: '성동구',   label: '서울 · 성동구'   },
  { city: '서울', gu: '성북구',   label: '서울 · 성북구'   },
  { city: '서울', gu: '송파구',   label: '서울 · 송파구'   },
  { city: '서울', gu: '양천구',   label: '서울 · 양천구'   },
  { city: '서울', gu: '영등포구', label: '서울 · 영등포구' },
  { city: '서울', gu: '용산구',   label: '서울 · 용산구'   },
  { city: '서울', gu: '은평구',   label: '서울 · 은평구'   },
  { city: '서울', gu: '종로구',   label: '서울 · 종로구'   },
  { city: '서울', gu: '중구',     label: '서울 · 중구'     },
  { city: '서울', gu: '중랑구',   label: '서울 · 중랑구'   },
  // 경기도
  { city: '경기', gu: '수원시',   label: '경기 · 수원시'   },
  { city: '경기', gu: '성남시',   label: '경기 · 성남시'   },
  { city: '경기', gu: '고양시',   label: '경기 · 고양시'   },
  { city: '경기', gu: '용인시',   label: '경기 · 용인시'   },
  { city: '경기', gu: '부천시',   label: '경기 · 부천시'   },
  { city: '경기', gu: '안산시',   label: '경기 · 안산시'   },
  { city: '경기', gu: '안양시',   label: '경기 · 안양시'   },
  { city: '경기', gu: '남양주시', label: '경기 · 남양주시' },
  { city: '경기', gu: '화성시',   label: '경기 · 화성시'   },
  { city: '경기', gu: '평택시',   label: '경기 · 평택시'   },
  { city: '경기', gu: '의정부시', label: '경기 · 의정부시' },
  { city: '경기', gu: '시흥시',   label: '경기 · 시흥시'   },
  { city: '경기', gu: '파주시',   label: '경기 · 파주시'   },
  { city: '경기', gu: '김포시',   label: '경기 · 김포시'   },
  { city: '경기', gu: '광명시',   label: '경기 · 광명시'   },
  // 인천광역시
  { city: '인천', gu: '남동구',   label: '인천 · 남동구'   },
  { city: '인천', gu: '부평구',   label: '인천 · 부평구'   },
  { city: '인천', gu: '서구',     label: '인천 · 서구'     },
  { city: '인천', gu: '연수구',   label: '인천 · 연수구'   },
  { city: '인천', gu: '미추홀구', label: '인천 · 미추홀구' },
  { city: '인천', gu: '계양구',   label: '인천 · 계양구'   },
  // 부산광역시
  { city: '부산', gu: '해운대구', label: '부산 · 해운대구' },
  { city: '부산', gu: '부산진구', label: '부산 · 부산진구' },
  { city: '부산', gu: '동래구',   label: '부산 · 동래구'   },
  { city: '부산', gu: '북구',     label: '부산 · 북구'     },
  { city: '부산', gu: '사상구',   label: '부산 · 사상구'   },
  { city: '부산', gu: '연제구',   label: '부산 · 연제구'   },
  { city: '부산', gu: '수영구',   label: '부산 · 수영구'   },
  { city: '부산', gu: '남구',     label: '부산 · 남구'     },
  // 대구광역시
  { city: '대구', gu: '달서구',   label: '대구 · 달서구'   },
  { city: '대구', gu: '북구',     label: '대구 · 북구'     },
  { city: '대구', gu: '수성구',   label: '대구 · 수성구'   },
  { city: '대구', gu: '동구',     label: '대구 · 동구'     },
  // 광주광역시
  { city: '광주', gu: '광산구',   label: '광주 · 광산구'   },
  { city: '광주', gu: '북구',     label: '광주 · 북구'     },
  { city: '광주', gu: '서구',     label: '광주 · 서구'     },
  { city: '광주', gu: '남구',     label: '광주 · 남구'     },
  // 대전광역시
  { city: '대전', gu: '서구',     label: '대전 · 서구'     },
  { city: '대전', gu: '유성구',   label: '대전 · 유성구'   },
  { city: '대전', gu: '대덕구',   label: '대전 · 대덕구'   },
  { city: '대전', gu: '동구',     label: '대전 · 동구'     },
  // 울산광역시
  { city: '울산', gu: '남구',     label: '울산 · 남구'     },
  { city: '울산', gu: '북구',     label: '울산 · 북구'     },
  { city: '울산', gu: '울주군',   label: '울산 · 울주군'   },
];

/** 도시 목록 (중복 제거) */
export const CITIES = [...new Set(DISTRICTS.map(d => d.city))];

/** 특정 도시의 구 목록 */
export function getDistricts(city: string): District[] {
  return DISTRICTS.filter(d => d.city === city);
}
