import React, { useState, useRef, useEffect } from 'react';
import { useFonts } from 'expo-font';
import { saveUserProfile } from '../services/userApi';
import {
  View, Text, TouchableOpacity, Animated,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { LT } from '../constants/lt';
import { INTERESTS, findInterest, interestLabel } from '../constants/data';
import InterestIcon from '../components/InterestIcon';
import NickAvatar from '../components/NickAvatar';
import { useStore } from '../store';
import { generateCodename, rerollHex } from '../constants/codename';
import { recordProfileWithQueue } from '../services/profileQueue';
import { useT, useLang } from '../i18n';

interface Props {}

const SW = 1.8;

function IcoRefresh({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M23 4v6h-6M1 20v-6h6"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IcoArrow({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M12 5l7 7-7 7"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoBack({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoCheck({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoStar({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7l3-7z"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function OnboardingScreen() {
  const { setLoggedIn, authEmail, authUserId, pendingVerified, setPendingVerified } = useStore();
  const t    = useT();
  const lang = useLang();
  const [fontsLoaded] = useFonts({ 'JUA-Regular': require('../../assets/fonts/JUA-Regular.ttf') });
  const [step,      setStep]     = useState<'nick'|'interest'>('nick');
  const [code,      setCode]     = useState<string>(() => generateCodename());
  const [rolling,   setRolling]  = useState(false);
  const [saving,    setSaving]   = useState(false);
  const [selected,  setSelected] = useState<string[]>([]);

  // ── 코드네임 리롤 spin 애니메이션 ──────────────────────────
  const spin = useRef(new Animated.Value(0)).current;

  // ── 관심사 ScrollView ref (자동 스크롤용) ───────────────────
  const interestScrollRef = useRef<any>(null);

  // ── 관심사 3개 선택 시 시작하기 버튼으로 자동 스크롤 ───────
  React.useEffect(() => {
    if (selected.length === 3) {
      setTimeout(() => interestScrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [selected.length]);

  // ── 관심사 칩 spring 애니메이션 ────────────────────────────
  const chipScales = useRef<Map<string, Animated.Value>>(new Map());
  function getChipScale(id: string) {
    if (!chipScales.current.has(id)) {
      chipScales.current.set(id, new Animated.Value(1));
    }
    return chipScales.current.get(id)!;
  }
  function animateChip(id: string) {
    const scale = getChipScale(id);
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.84, useNativeDriver: true, speed: 60, bounciness: 0 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 14, bounciness: 14 }),
    ]).start();
  }

  const handleReroll = () => {
    setCode(generateCodename());
    spin.setValue(0);
    setRolling(true);
    Animated.timing(spin, { toValue: 1, duration: 420, useNativeDriver: true })
      .start(() => setRolling(false));
  };

  const handleNickNext = () => {
    setStep('interest');
  };

  const toggleInterest = (id: string) => {
    setSelected(prev => {
      if (id === 'none') {
        // 없음 선택 시 나머지 모두 해제
        return prev.includes('none') ? [] : ['none'];
      }
      // 일반 관심사 선택 시 '없음' 제거
      const filtered = prev.filter(x => x !== 'none');
      if (filtered.includes(id)) return filtered.filter(x => x !== id);
      if (filtered.length >= 3) {
        Alert.alert(t('alert_interest_max'));
        return prev;
      }
      return [...filtered, id];
    });
  };

  const handleStart = async () => {
    if (selected.length === 0) { Alert.alert(t('alert_interest_min')); return; }
    if (saving) return;
    setSaving(true);

    const userId = authUserId || ('local-' + Date.now());
    // 본인인증=로그인: 진입이 곧 본인인증이므로 온보딩 완료 유저는 isVerified=true.
    // 성별/생년은 로그인 시 stash 한 pendingVerified 에서 반영(서버는 이미 is_verified·birth_year 저장됨).
    const pv = pendingVerified;
    const baseProfile = {
      id: userId,
      interests: selected,
      regionGu: '',
      regionLabel: '',
      email: authEmail || undefined,
      isVerified: true,
      ...(pv?.gender    ? { gender: pv.gender }       : {}),
      ...(pv?.birthYear ? { birthYear: pv.birthYear } : {}),
    };

    // 코드네임 확정(온라인 1차): 충돌(409)은 즉시 hex 재생성 후 재시도(사용자가 보는 그 자리에서 해소).
    let finalCode = code;
    let saved = false;
    let lastStatus = -1;
    for (let attempt = 0; attempt < 5; attempt++) {
      const r = await saveUserProfile(userId, { ...baseProfile, nickname: finalCode });
      lastStatus = r.status;
      if (r.ok) { saved = true; break; }                     // 서버 영속 성공
      if (r.status === 409) { finalCode = rerollHex(finalCode); continue; }  // 중복 → 재생성
      break;  // 400(형식)·0(네트워크)·5xx — 루프 종료(아래서 분기)
    }

    // 오프라인 봉합: 온라인 영속 실패 시 분기.
    //   400(형식 위반 — 생성 코드네임에선 사실상 불가)은 진짜 오류 → 차단/재시도 유도.
    //   0(네트워크)·5xx(서버 일시오류)는 로컬 큐에 적재하고 '진입 허용'(하드 차단 제거).
    //   백그라운드 flush 가 재연결 시 서버 영속(+409 시 재배정→표시 닉 동기화)을 책임진다.
    if (!saved) {
      if (lastStatus === 400) {
        setSaving(false);
        setCode(finalCode);
        Alert.alert(t('alert_codename_retry'));
        return;
      }
      await recordProfileWithQueue(userId, { ...baseProfile, nickname: finalCode });
    }

    setCode(finalCode);
    setLoggedIn({ ...baseProfile, nickname: finalCode });
    setPendingVerified(null); // 1회성 — 소비 후 정리
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView ref={interestScrollRef} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {step === 'nick' ? (
            <View style={s.nickPage}>
              {/* ── 아바타 미리보기 ── */}
              <View style={s.nickAvatarSection}>
                <View style={[s.nickAvatarRing, s.nickAvatarRingActive]}>
                  <NickAvatar nick={code} size={90} />
                </View>
                <Text style={[s.nickAvatarLabel, s.nickAvatarLabelActive]}>
                  {t('onboarding_preview')}
                </Text>
              </View>

              {/* ── 타이틀 ── */}
              <View style={s.nickTitleBlock}>
                <Text style={s.nickTitle}>{t('onboarding_nick_title')}</Text>
                <Text style={s.nickSub}>{t('onboarding_codename_sub')}</Text>
              </View>

              {/* ── 코드네임 표시 ── */}
              <View style={s.codeCard}>
                <Text style={s.codeText}>{code}</Text>
              </View>

              {/* ── 다시 생성(리롤) ── */}
              <TouchableOpacity style={s.rerollBtn} onPress={handleReroll} activeOpacity={0.7} disabled={rolling}>
                <Animated.View style={{
                  transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
                }}>
                  <IcoRefresh color={Colors.primary} />
                </Animated.View>
                <Text style={s.rerollTxt}>{t('onboarding_codename_reroll')}</Text>
              </TouchableOpacity>

              {/* ── 힌트 칩 ── */}
              <View style={s.nickHintRow}>
                {([t('onboarding_codename_hint1'), t('onboarding_codename_hint2'), t('onboarding_codename_hint3')] as string[]).map(h => (
                  <View key={h} style={s.nickHintPill}>
                    <Text style={s.nickHintTxt}>{h}</Text>
                  </View>
                ))}
              </View>

              {/* ── 다음 버튼 ── */}
              <TouchableOpacity
                style={s.btn}
                onPress={handleNickNext}
                activeOpacity={0.85}
              >
                <View style={s.btnInner}>
                  <Text style={s.btnTxt}>{t('onboarding_nick_next')}</Text>
                  <IcoArrow color="#fff" />
                </View>
              </TouchableOpacity>
            </View>

          ) : (
            <View style={s.card}>
              {/* 뒤로 버튼 */}
              <TouchableOpacity style={s.backBtn} onPress={() => setStep('nick')}>
                <View style={s.backBtnInner}>
                  <IcoBack color={Colors.primary} />
                  <Text style={s.backTxt}>{t('onboarding_back_btn')}</Text>
                </View>
              </TouchableOpacity>

              <Text style={s.cardTitle}>{t('onboarding_interest_title')}</Text>
              <View style={s.interestSubRow}>
                <Text style={s.cardSub}>{t('onboarding_interest_sub')}</Text>
                <Text style={[s.selCount, selected.length === 3 && s.selCountFull]}>
                  {selected.length}/3
                </Text>
              </View>

              {/* 관심사 그리드 */}
              <View style={s.grid}>
                {INTERESTS.filter(it => it.id !== 'none').map(it => {
                  const sel      = selected.includes(it.id);
                  const hasNone  = selected.includes('none');
                  const disabled = !sel && (selected.filter(x => x !== 'none').length >= 3 || hasNone);
                  return (
                    <Animated.View key={it.id} style={{ width: '22%', transform: [{ scale: getChipScale(it.id) }] }}>
                      <TouchableOpacity
                        style={[s.chip, sel && s.chipSel, disabled && s.chipDim]}
                        onPress={() => { animateChip(it.id); toggleInterest(it.id); }}
                        activeOpacity={1}
                      >
                        {sel && (
                          <View style={s.chipCheck}>
                            <IcoCheck color={Colors.primary} />
                          </View>
                        )}
                        <View style={[s.chipIcon, sel && s.chipIconSel]}>
                          <InterestIcon
                            id={it.id} size={26}
                            color={sel ? Colors.primary : disabled ? Colors.g2 : Colors.g4}
                            strokeWidth={1.7}
                          />
                        </View>
                        <Text style={[s.chipLabel, sel && s.chipLabelSel, disabled && s.chipLabelDim]}>
                          {interestLabel(it, lang)}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}

                {/* ── 없음 칩 ── */}
                {(() => {
                  const sel = selected.includes('none');
                  return (
                    <Animated.View key="none" style={{ width: '22%', transform: [{ scale: getChipScale('none') }] }}>
                      <TouchableOpacity
                        style={[s.chip, s.chipNone, sel && s.chipNoneSel]}
                        onPress={() => { animateChip('none'); toggleInterest('none'); }}
                        activeOpacity={1}
                      >
                        {sel && (
                          <View style={s.chipCheck}>
                            <IcoCheck color={Colors.g4} />
                          </View>
                        )}
                        <View style={[s.chipIcon, sel && s.chipNoneIconSel]}>
                          <Text style={[s.noneIcon, sel && s.noneIconSel]}>—</Text>
                        </View>
                        <Text style={[s.chipLabel, sel && s.chipNoneLabelSel]}>{t('onboarding_interest_none')}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })()}
              </View>

              {/* 시작하기 버튼 */}
              <TouchableOpacity
                style={[s.btn, (selected.length === 0 || saving) && s.btnOff]}
                onPress={handleStart}
                disabled={selected.length === 0 || saving}
              >
                <View style={s.btnInner}>
                  <Text style={s.btnTxt}>{t('onboarding_start')}</Text>
                  <IcoCheck color={selected.length > 0 ? '#fff' : Colors.g3} />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex:1, backgroundColor:LT.surface },
  scroll: { flexGrow:1, alignItems:'center', paddingHorizontal:Spacing.lg, paddingVertical:Spacing.xl },

  logoWrap:  { alignItems:'center', marginBottom:32 },
  logoImg:   { width:84, height:84 },
  logoTitle: { fontSize:32, fontWeight:'900', color:'#fff', letterSpacing:4, marginTop:12 },

  card: { width:'100%', backgroundColor:'rgba(255,255,255,0.95)', borderRadius:Radius.xxl, padding:Spacing.lg, borderWidth:0, ...Shadow.glass },

  // ── 닉네임 페이지 (카드 없는 풀-페이지 레이아웃) ──────────────
  nickPage:            { width:'100%', alignItems:'center', gap:28 },

  // 아바타 섹션
  nickAvatarSection:   { alignItems:'center', gap:10 },
  nickAvatarRing:      { width:116, height:116, borderRadius:58, alignItems:'center', justifyContent:'center', borderWidth:2.5, borderColor:Colors.g2, backgroundColor:'rgba(255,255,255,0.85)', ...Shadow.glass },
  nickAvatarRingActive:{ borderColor:Colors.primary, shadowColor:Colors.primary, shadowOffset:{width:0,height:0}, shadowOpacity:0.3, shadowRadius:20, elevation:10 },
  nickAvatarLabel:     { fontSize:Typography.footnote, color:Colors.g3, fontWeight:'600', letterSpacing:0.2 },
  nickAvatarLabelActive:{ color:Colors.primaryD, fontWeight:'800' },

  // 타이틀
  nickTitleBlock:      { alignItems:'center', gap:6 },
  nickTitle:           { fontSize:38, fontWeight:'900', color:Colors.dark, letterSpacing:-1.2, textAlign:'center', lineHeight:46 },
  nickSub:             { fontSize:Typography.footnote, color:Colors.g4, textAlign:'center' },

  // 코드네임 표시 카드
  codeCard:            { width:'100%', borderWidth:1.5, borderColor:Colors.primary, borderRadius:Radius.pill, paddingVertical:17, paddingHorizontal:24, backgroundColor:'#fff', alignItems:'center', shadowColor:Colors.primary, shadowOffset:{width:0,height:4}, shadowOpacity:0.12, shadowRadius:12, elevation:4 },
  codeText:            { fontSize:Typography.title3, fontWeight:'800', color:Colors.dark, letterSpacing:0.2 },

  // 다시 생성(리롤)
  rerollBtn:           { flexDirection:'row', alignItems:'center', gap:7, paddingVertical:8, paddingHorizontal:16, borderRadius:Radius.pill, backgroundColor:'rgba(26,158,110,0.09)', borderWidth:1, borderColor:'rgba(26,158,110,0.2)' },
  rerollTxt:           { fontSize:Typography.footnote, fontWeight:'800', color:Colors.primaryD },

  // 힌트 칩
  nickHintRow:         { flexDirection:'row', gap:7, flexWrap:'wrap', justifyContent:'center' },
  nickHintPill:        { backgroundColor:'rgba(26,158,110,0.09)', borderRadius:Radius.pill, paddingVertical:5, paddingHorizontal:13, borderWidth:1, borderColor:'rgba(26,158,110,0.2)' },
  nickHintTxt:         { fontSize:11, fontWeight:'700', color:Colors.primaryD },

  backBtn:      { marginBottom:Spacing.sm },
  backBtnInner: { flexDirection:'row', alignItems:'center', gap:6 },
  backTxt:      { fontSize:Typography.footnote, color:Colors.primary, fontWeight:'700' },

  cardTitle: { fontSize:Typography.title2, fontWeight:'800', color:Colors.dark, letterSpacing:-0.5, marginBottom:6 },
  cardSub:   { fontSize:Typography.footnote, color:Colors.g4 },
  preview:   { alignItems:'center', marginBottom:Spacing.lg },

  // nickname input with counter ring
  inputWrap: { position:'relative', marginBottom:Spacing.md },
  input:     { borderWidth:1.5, borderColor:Colors.separator, borderRadius:Radius.pill, paddingVertical:14, paddingHorizontal:44, fontSize:Typography.title3, fontWeight:'700', color:Colors.dark, backgroundColor:Colors.g1, textAlign:'center' },
  ringWrap:  { position:'absolute', right:14, top:0, bottom:0, justifyContent:'center' },

  btn:     { width:'100%', backgroundColor:LT.brand, borderRadius:Radius.pill, height:52, justifyContent:'center', alignItems:'center', shadowColor:LT.brand, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:8 },
  btnOff:  { opacity:0.3 },
  btnInner:{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8 },
  btnTxt:  { fontSize:Typography.headline, fontWeight:'700', color:'#fff' },

  // interest count header
  interestSubRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:Spacing.lg },
  selCount:       { fontSize:Typography.footnote, fontWeight:'800', color:LT.label3 },
  selCountFull:   { color:LT.brandStrong },

  grid:          { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:Spacing.lg },
  chip:          { width:'100%', paddingVertical:11, borderRadius:Radius.lg, borderWidth:1.5, borderColor:Colors.g2, backgroundColor:Colors.sf, alignItems:'center', gap:5, position:'relative' },
  chipSel:       { borderColor:LT.brand, backgroundColor:LT.brandTint },
  chipDim:       { opacity:0.38 },
  chipCheck:     { position:'absolute', top:4, right:4 },
  chipIcon:      { width:38, height:38, borderRadius:11, backgroundColor:Colors.g1, justifyContent:'center', alignItems:'center' },
  chipIconSel:   { backgroundColor:'rgba(26,158,110,0.12)' },
  chipLabel:     { fontSize:9, fontWeight:'700', color:Colors.g4, textAlign:'center' },
  chipLabelSel:  { color:Colors.primaryD },
  chipLabelDim:  { color:Colors.g2 },

  // 없음 칩
  chipNone:        { borderStyle:'dashed' as const, borderColor:Colors.g2, backgroundColor:Colors.g1 },
  chipNoneSel:     { borderStyle:'solid' as const, borderColor:Colors.g4, backgroundColor:Colors.g1 },
  chipNoneIconSel: { backgroundColor:Colors.g2 },
  noneIcon:        { fontSize:20, color:Colors.g3, fontWeight:'300' },
  noneIconSel:     { color:Colors.g4 },
  chipNoneLabelSel:{ color:Colors.dark },
});
