import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Animated,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinGrad, Stop, Rect } from 'react-native-svg';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { INTERESTS, findInterest, interestLabel } from '../constants/data';
import InterestIcon from '../components/InterestIcon';
import NickAvatar from '../components/NickAvatar';
import { useStore } from '../store';
import { containsProfanity } from '../utils/filter';
import { useT, useLang } from '../i18n';

const NICK_MAX = 6;

/** Twitter-style circular character counter — visible only near limit */
function CharRing({ count, max, size = 20 }: { count: number; max: number; size?: number }) {
  const r = size / 2 - 2;
  const circ = 2 * Math.PI * r;
  const ratio = count / max;
  const offset = circ * (1 - Math.min(ratio, 1));
  const remaining = max - count;
  const color = ratio >= 1 ? '#EF4444' : ratio >= 0.85 ? '#F59E0B' : Colors.primary;
  // Show only when ≥ 70% of limit used
  if (remaining > Math.ceil(max * 0.3)) return null;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.g2} strokeWidth={1.5} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={1.5} fill="none"
          strokeDasharray={[circ, circ]}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90} originX={size / 2} originY={size / 2}
        />
      </Svg>
      {remaining <= 2 && (
        <Text style={{ position: 'absolute', fontSize: 7, fontWeight: '800', color }}>{remaining}</Text>
      )}
    </View>
  );
}

interface Props {}

const SW = 1.8;

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
  const { setLoggedIn, authEmail } = useStore();
  const t    = useT();
  const lang = useLang();
  const [step,      setStep]     = useState<'nick'|'profile'|'interest'>('nick');
  const [nick,      setNick]     = useState('');
  const [email,     setEmail]    = useState('');
  const [gender,    setGender]   = useState<'male'|'female'|null>(null);
  const [birthYear, setBirthYear]= useState('');
  const [selected,  setSelected] = useState<string[]>([]);

  // authEmail (소셜 로그인에서 받은 이메일) 자동 입력
  useEffect(() => {
    if (authEmail) setEmail(authEmail);
  }, [authEmail]);

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

  const handleNickChange = (text: string) => {
    // Block if adding new char would introduce profanity
    if (containsProfanity(text)) {
      Alert.alert(t('alert_profanity'));
      return;
    }
    setNick(text);
  };

  const handleNickNext = () => {
    const trimmed = nick.trim();
    if (trimmed.length < 1) { Alert.alert(t('alert_nick_empty')); return; }
    if (containsProfanity(trimmed)) { Alert.alert(t('alert_nick_bad')); return; }
    setStep('profile');
  };

  const handleProfileNext = () => {
    if (!email.trim()) { Alert.alert('이메일을 입력해주세요'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { Alert.alert('올바른 이메일 주소를 입력해주세요'); return; }
    if (!gender) { Alert.alert('성별을 선택해주세요'); return; }
    const year = parseInt(birthYear, 10);
    if (!birthYear || isNaN(year) || year < 1900 || year > new Date().getFullYear() - 5) {
      Alert.alert('올바른 생년을 입력해주세요 (예: 1995)'); return;
    }
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

  const handleStart = () => {
    if (selected.length === 0) { Alert.alert(t('alert_interest_min')); return; }
    setLoggedIn({
      id: 'local-' + Date.now(),
      nickname: nick.trim(),
      interests: selected,
      regionGu: '',
      regionLabel: '',
      email: email.trim() || undefined,
      gender: gender,
      birthYear: birthYear ? parseInt(birthYear, 10) : null,
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView ref={interestScrollRef} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* 로고 */}
          <View style={s.logoWrap}>
            {/* 그라디언트 배경 + 말풍선 SVG */}
            <View style={s.logoBox}>
              <Svg width={84} height={84} viewBox="0 0 84 84">
                <Defs>
                  <SvgLinGrad id="spotBg" x1="0" y1="0" x2="84" y2="84" gradientUnits="userSpaceOnUse">
                    <Stop offset="0" stopColor="#72EDB8" />
                    <Stop offset="1" stopColor="#40D3B6" />
                  </SvgLinGrad>
                </Defs>
                {/* 그라디언트 둥근 사각형 배경 */}
                <Rect x="0" y="0" width="84" height="84" rx="20" ry="20" fill="url(#spotBg)" />
                {/* 말풍선 (왼쪽 아래 꼬리) */}
                <Path
                  d="M26 11 H58 Q71 11 71 22 V43 Q71 54 58 54 H36 L16 68 L24 54 H26 Q13 54 13 43 V22 Q13 11 26 11 Z"
                  fill="white"
                />
                {/* 점 3개 (타이핑 인디케이터) */}
                <Circle cx="30" cy="32" r="4.5" fill="#40D3B6" />
                <Circle cx="42" cy="32" r="4.5" fill="#40D3B6" />
                <Circle cx="54" cy="32" r="4.5" fill="#40D3B6" />
              </Svg>
            </View>
            <Text style={s.logoTitle}>Locotalk</Text>
          </View>

          {step === 'nick' ? (
            <View style={s.nickPage}>
              {/* ── 아바타 미리보기 ── */}
              <View style={s.nickAvatarSection}>
                <View style={[s.nickAvatarRing, nick.trim().length > 0 && s.nickAvatarRingActive]}>
                  <NickAvatar nick={nick.trim() || '?'} size={90} />
                </View>
                <Text style={[s.nickAvatarLabel, nick.trim().length > 0 && s.nickAvatarLabelActive]}>
                  {nick.trim().length > 0 ? nick.trim() : t('onboarding_preview')}
                </Text>
              </View>

              {/* ── 타이틀 ── */}
              <View style={s.nickTitleBlock}>
                <Text style={s.nickTitle}>{t('onboarding_nick_title')}</Text>
                <Text style={s.nickSub}>{t('onboarding_nick_sub')}</Text>
              </View>

              {/* ── 입력 ── */}
              <View style={s.nickInputWrap}>
                <TextInput
                  style={[s.nickInput, nick.trim().length > 0 && s.nickInputActive]}
                  value={nick}
                  onChangeText={handleNickChange}
                  placeholder={t('onboarding_nick_input_placeholder')}
                  placeholderTextColor={Colors.g3}
                  maxLength={NICK_MAX}
                  textAlign="center"
                  returnKeyType="next"
                  onSubmitEditing={handleNickNext}
                  autoFocus
                />
                <View style={s.nickRingWrap}>
                  <CharRing count={[...nick].length} max={NICK_MAX} size={22} />
                </View>
              </View>

              {/* ── 힌트 칩 ── */}
              <View style={s.nickHintRow}>
                {([t('onboarding_nick_hint1'), t('onboarding_nick_hint2'), t('onboarding_nick_hint3')] as string[]).map(h => (
                  <View key={h} style={s.nickHintPill}>
                    <Text style={s.nickHintTxt}>{h}</Text>
                  </View>
                ))}
              </View>

              {/* ── 다음 버튼 ── */}
              <TouchableOpacity
                style={[s.btn, nick.trim().length === 0 && s.btnOff]}
                onPress={handleNickNext}
                disabled={nick.trim().length === 0}
                activeOpacity={0.85}
              >
                <View style={s.btnInner}>
                  <Text style={s.btnTxt}>{t('onboarding_nick_next')}</Text>
                  <IcoArrow color={nick.trim().length > 0 ? '#fff' : Colors.g3} />
                </View>
              </TouchableOpacity>
            </View>

          ) : step === 'profile' ? (
            /* ── 프로필 스텝: 이메일/성별/생년 ───────────────── */
            <View style={s.card}>
              <TouchableOpacity style={s.backBtn} onPress={() => setStep('nick')}>
                <View style={s.backBtnInner}>
                  <IcoBack color={Colors.primary} />
                  <Text style={s.backTxt}>{t('onboarding_back_btn')}</Text>
                </View>
              </TouchableOpacity>

              <Text style={s.cardTitle}>{'기본 정보 입력'}</Text>
              <Text style={s.cardSub}>{'가입 완료를 위해 정보를 입력해주세요'}</Text>

              {/* 이메일 */}
              <View style={s.profileField}>
                <Text style={s.profileLabel}>이메일</Text>
                <TextInput
                  style={s.profileInput}
                  placeholder="이메일 주소"
                  placeholderTextColor={Colors.g3}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* 성별 */}
              <View style={s.profileField}>
                <Text style={s.profileLabel}>성별</Text>
                <View style={s.genderRow}>
                  <TouchableOpacity
                    style={[s.genderBtn, gender === 'male' && s.genderBtnSel]}
                    onPress={() => setGender('male')}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.genderTxt, gender === 'male' && s.genderTxtSel]}>남성</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.genderBtn, gender === 'female' && s.genderBtnSel]}
                    onPress={() => setGender('female')}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.genderTxt, gender === 'female' && s.genderTxtSel]}>여성</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 생년 */}
              <View style={s.profileField}>
                <Text style={s.profileLabel}>생년</Text>
                <TextInput
                  style={s.profileInput}
                  placeholder="예: 1995"
                  placeholderTextColor={Colors.g3}
                  value={birthYear}
                  onChangeText={t => setBirthYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              <TouchableOpacity
                style={[s.btn, (!email || !gender || birthYear.length < 4) && s.btnOff]}
                onPress={handleProfileNext}
                disabled={!email || !gender || birthYear.length < 4}
              >
                <Text style={s.btnTxt}>{'다음으로'}</Text>
              </TouchableOpacity>
            </View>

          ) : (
            <View style={s.card}>
              {/* 뒤로 버튼 */}
              <TouchableOpacity style={s.backBtn} onPress={() => setStep('profile')}>
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
                style={[s.btn, selected.length === 0 && s.btnOff]}
                onPress={handleStart}
                disabled={selected.length === 0}
              >
                <Text style={s.btnTxt}>{t('onboarding_start')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex:1, backgroundColor:'#EDFBF4' },
  scroll: { flexGrow:1, alignItems:'center', paddingHorizontal:Spacing.lg, paddingVertical:Spacing.xl },

  logoWrap:  { alignItems:'center', marginBottom:32 },
  logoBox:   { width:84, height:84, borderRadius:20, shadowColor:'#40D3B6', shadowOffset:{width:0,height:10}, shadowOpacity:0.45, shadowRadius:22, elevation:16 },
  logoTitle: { fontSize:26, fontWeight:'900', color:'#0A2419', letterSpacing:-0.5, marginTop:14 },

  card: { width:'100%', backgroundColor:'rgba(255,255,255,0.92)', borderRadius:Radius.xxl, padding:Spacing.lg, borderWidth:1, borderColor:'rgba(255,255,255,0.7)', ...Shadow.glass },

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

  // 입력
  nickInputWrap:       { width:'100%', position:'relative' },
  nickInput:           { borderWidth:1.5, borderColor:Colors.separator, borderRadius:Radius.pill, paddingVertical:17, paddingHorizontal:52, fontSize:Typography.title3, fontWeight:'700', color:Colors.dark, backgroundColor:'rgba(255,255,255,0.9)', textAlign:'center', width:'100%' },
  nickInputActive:     { borderColor:Colors.primary, backgroundColor:'#fff', shadowColor:Colors.primary, shadowOffset:{width:0,height:4}, shadowOpacity:0.12, shadowRadius:12, elevation:4 },
  nickRingWrap:        { position:'absolute', right:16, top:0, bottom:0, justifyContent:'center' },

  // 힌트 칩
  nickHintRow:         { flexDirection:'row', gap:7, flexWrap:'wrap', justifyContent:'center' },
  nickHintPill:        { backgroundColor:'rgba(26,158,110,0.09)', borderRadius:Radius.pill, paddingVertical:5, paddingHorizontal:13, borderWidth:1, borderColor:'rgba(26,158,110,0.2)' },
  nickHintTxt:         { fontSize:11, fontWeight:'700', color:Colors.primaryD },

  // 프로필 스텝 스타일
  profileField: { marginTop: 20 },
  profileLabel: { fontSize: 13, fontWeight: '600', color: Colors.g4, marginBottom: 6 },
  profileInput: { height: 48, borderWidth: 1.5, borderColor: Colors.g2, borderRadius: Radius.md, paddingHorizontal: 14, fontSize: 15, color: Colors.dark, backgroundColor: Colors.g1 },
  genderRow:    { flexDirection: 'row', gap: 10 },
  genderBtn:    { flex: 1, height: 48, borderWidth: 1.5, borderColor: Colors.g2, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.g1 },
  genderBtnSel: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  genderTxt:    { fontSize: 15, fontWeight: '600', color: Colors.g4 },
  genderTxtSel: { color: Colors.primary },

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

  btn:     { width:'100%', backgroundColor:Colors.primary, borderRadius:Radius.pill, height:52, justifyContent:'center', ...Shadow.button },
  btnOff:  { opacity:0.3 },
  btnInner:{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8 },
  btnTxt:  { fontSize:Typography.headline, fontWeight:'700', color:'#fff' },

  // interest count header
  interestSubRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:Spacing.lg },
  selCount:       { fontSize:Typography.footnote, fontWeight:'800', color:Colors.g3 },
  selCountFull:   { color:Colors.primary },

  grid:          { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:Spacing.lg },
  chip:          { width:'100%', paddingVertical:11, borderRadius:Radius.lg, borderWidth:1.5, borderColor:Colors.g2, backgroundColor:Colors.sf, alignItems:'center', gap:5, position:'relative' },
  chipSel:       { borderColor:Colors.primary, backgroundColor:'#ECFDF5' },
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
