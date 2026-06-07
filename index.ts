import { registerRootComponent } from 'expo';
import * as Font from 'expo-font';
import React from 'react';
import { Text, TextInput, Alert, Settings, Platform } from 'react-native';
import App from './App';
import DiagErrorBoundary from './src/components/DiagErrorBoundary';

// ── 🔍 전역 JS 에러 핸들러 (진단) — try/catch 밖 비동기/브리지 에러 포착 ──
const _EU: any = (global as any).ErrorUtils;
if (_EU?.setGlobalHandler) {
  const _prev = _EU.getGlobalHandler?.();
  _EU.setGlobalHandler((err: any, isFatal?: boolean) => {
    try {
      Alert.alert('🔍 전역 크래시 (진단)', `fatal=${isFatal}\nname=${err?.name}\nmsg=${err?.message}\n\n${String(err?.stack || '').slice(0, 700)}`);
    } catch {}
    if (_prev) _prev(err, isFatal);
  });
}

// ── 🔴 직전 실행의 네이티브 uncaught NSException 사유 표시 (AppDelegate가 저장) ──
if (Platform.OS === 'ios') {
  try {
    const last = (Settings as any)?.get?.('LT_lastException');
    if (last) {
      (Settings as any).set({ LT_lastException: null });
      setTimeout(() => Alert.alert('🔴 직전 네이티브 크래시', String(last).slice(0, 1500)), 1800);
    }
  } catch {}
}

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

registerRootComponent(() => React.createElement(DiagErrorBoundary, null, React.createElement(App)));
