/**
 * Profanity / banned-word filter
 * Korean + basic English — profanity, hate speech, sexual content.
 * Checks substring matches (ignores spaces/case).
 */

// ── 욕설 / 혐오 ──────────────────────────────────────────────────
const BANNED_PROFANITY = [
  '씨발','시발','씨바','시바','ㅅㅂ','ㅆㅂ',
  '개새끼','개새','ㄱㅅ','개소리',
  '병신','ㅂㅅ','빙신',
  '미친','미친놈','미친년','미친새끼','ㅁㅊ',
  '지랄','ㅈㄹ',
  '존나','ㅈㄴ','졸라',
  '좆','ㅈ같','좆같',
  '창녀','창년',
  '걸레',
  '개년','개놈','개잡년',
  '꺼져','꺼지','닥쳐','닥쳐라',
  '죽어','뒤져','죽어라',
  '찐따','찐다','쩐따',
  '강간','성폭행',
  // English
  'fuck','shit','bitch','asshole','bastard','cunt','nigger','faggot','dick','pussy',
];

// ── 선정적 / 성인 콘텐츠 ─────────────────────────────────────────
const BANNED_SEXUAL = [
  '보지','보짓','자지','후장','항문','음경','음부','성기',
  '야동','포르노','음란','에로','섹스','섹시녀','섹시남',
  '빨아','빨어','핥아','핥어',
  '오럴','애무','자위','발기','삽입','사정','전립선',
  '원나잇','원나이트','조건만남','조건녀','성매매','원조교제',
  '노출','벗방','벗어줘','몸매','19금','av','avnbi',
  // English sexual
  'porn','sex','nude','naked','blowjob','handjob','masturbat','orgasm','erotic',
  'hentai','xxx','nsfw','horny','slutty','whore',
];

const BANNED = [...BANNED_PROFANITY, ...BANNED_SEXUAL];

/** Returns true if text contains any banned word (ignores spaces/case). */
export function containsProfanity(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\s+/g, '');
  return BANNED.some(w => normalized.includes(w.toLowerCase()));
}

/** Returns the banned word found, or null. */
export function findProfanity(text: string): string | null {
  const normalized = text.toLowerCase().replace(/\s+/g, '');
  return BANNED.find(w => normalized.includes(w.toLowerCase())) ?? null;
}
