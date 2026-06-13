/**
 * NickAvatar — 닉네임(코드네임) 아바타. 전 화면 공용 진입점.
 *
 *   코드네임("분홍토끼" 등)이면 CodenameAvatar 가 전신 라인 캐릭터 + 색 그라데이션으로 렌더,
 *   그 외 닉네임은 닉 해시색 이니셜 원으로 폴백한다. (기존 호출부 API 유지: nick/size/style)
 */
import React from 'react';
import CodenameAvatar from './CodenameAvatar';

interface Props { nick: string; size?: number; style?: object; }

export default function NickAvatar({ nick, size = 40, style }: Props) {
  return <CodenameAvatar codename={nick} size={size} style={style} />;
}
