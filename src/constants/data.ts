import type { Lang } from '../store';

export interface Interest {
  id: string;
  label: string;     // Korean
  labelEn: string;   // English
  emoji: string;
}

export const INTERESTS: Interest[] = [
  { id:'run',       label:'러닝',     labelEn:'Running',   emoji:'🏃' },
  { id:'coffee',    label:'커피',     labelEn:'Coffee',    emoji:'☕' },
  { id:'book',      label:'독서',     labelEn:'Reading',   emoji:'📚' },
  { id:'travel',    label:'여행',     labelEn:'Travel',    emoji:'✈️' },
  { id:'gym',       label:'헬스',     labelEn:'Gym',       emoji:'💪' },
  { id:'food',      label:'맛집',     labelEn:'Foodie',    emoji:'🍽️' },
  { id:'music',     label:'음악',     labelEn:'Music',     emoji:'🎵' },
  { id:'camp',      label:'캠핑',     labelEn:'Camping',   emoji:'⛺' },
  { id:'yoga',      label:'요가',     labelEn:'Yoga',      emoji:'🧘' },
  { id:'cook',      label:'요리',     labelEn:'Cooking',   emoji:'👨‍🍳' },
  { id:'movie',     label:'영화',     labelEn:'Movies',    emoji:'🎬' },
  { id:'drive',     label:'드라이브', labelEn:'Driving',   emoji:'🚗' },
  { id:'hike',      label:'등산',     labelEn:'Hiking',    emoji:'⛰️' },
  { id:'pet',       label:'반려동물', labelEn:'Pets',      emoji:'🐾' },
  { id:'game',      label:'게임',     labelEn:'Gaming',    emoji:'🎮' },
  { id:'study',     label:'공부',     labelEn:'Study',     emoji:'📖' },
  { id:'bike',      label:'자전거',   labelEn:'Cycling',   emoji:'🚴' },
  { id:'plant',     label:'식물',     labelEn:'Plants',    emoji:'🌱' },
  { id:'chat',      label:'친목',     labelEn:'Social',    emoji:'💬' },
  { id:'photo',     label:'사진',     labelEn:'Photo',     emoji:'📸' },
  { id:'art',       label:'미술',     labelEn:'Art',       emoji:'🎨' },
  { id:'coding',    label:'코딩',     labelEn:'Coding',    emoji:'💻' },
  { id:'soccer',    label:'축구',     labelEn:'Soccer',    emoji:'⚽' },
  { id:'tennis',    label:'테니스',   labelEn:'Tennis',    emoji:'🎾' },
  { id:'swim',      label:'수영',     labelEn:'Swimming',  emoji:'🏊' },
  { id:'beer',      label:'맥주',     labelEn:'Beer',      emoji:'🍺' },
  { id:'karaoke',   label:'노래방',   labelEn:'Karaoke',   emoji:'🎤' },
  { id:'fashion',   label:'패션',     labelEn:'Fashion',   emoji:'👗' },
  { id:'invest',    label:'투자',     labelEn:'Investing', emoji:'📈' },
  { id:'badminton', label:'배드민턴', labelEn:'Badminton', emoji:'🏸' },
  { id:'none',      label:'없음',     labelEn:'None',      emoji:'—'  },
];

export function findInterest(id: string): Interest | undefined {
  return INTERESTS.find(i => i.id === id);
}

/** Returns the localized label for an interest (falls back to Korean). */
export function interestLabel(
  interest: Interest | undefined | null,
  lang: Lang,
): string {
  if (!interest) return '';
  return lang === 'en' ? (interest.labelEn || interest.label) : interest.label;
}
