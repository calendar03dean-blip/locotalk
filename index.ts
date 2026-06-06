import { registerRootComponent } from 'expo';
import * as Font from 'expo-font';
import React from 'react';
import { Text, TextInput } from 'react-native';
import App from './App';

// ── Pretendard 전역 폰트 (리디자인 — Wanted/Toss 타이포) ──────────────
// 런타임 로드(번들 에셋). 로드 전엔 시스템 폰트(Apple SD Gothic Neo) 폴백.
Font.loadAsync({ Pretendard: require('./assets/fonts/PretendardVariable.ttf') }).catch(() => {});

// 모든 Text / TextInput 의 기본 폰트를 Pretendard 로 (render 앞에 주입 → 개별 style 우선).
const FONT = { fontFamily: 'Pretendard' as const };
function patchFont(Comp: any) {
  if (!Comp || Comp.__fontPatched || typeof Comp.render !== 'function') return;
  const orig = Comp.render;
  Comp.__fontPatched = true;
  Comp.render = function (...args: any[]) {
    const el = orig.apply(this, args);
    return el ? React.cloneElement(el, { style: [FONT, el.props.style] }) : el;
  };
}
patchFont(Text);
patchFont(TextInput);

registerRootComponent(App);
