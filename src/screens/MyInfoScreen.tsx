import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Switch, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useStore } from '../store';
import { Colors, Typography, Spacing, Radius, Shadow, tinted } from '../constants/theme';
import { findInterest, INTERESTS, interestLabel } from '../constants/data';
import { useT, useLang, type Lang } from '../i18n';
import { regionIconId } from '../constants/regions';
import NickAvatar from '../components/NickAvatar';
import InterestIcon from '../components/InterestIcon';
import RegionIcon from '../components/RegionIcon';
import UpgradeModal from '../components/UpgradeModal';
import RegionPickerModal from '../components/RegionPickerModal';
import IdentityVerifyModal from '../components/IdentityVerifyModal';

const SW = 1.8;

// ─── Icon helpers ─────────────────────────────────────────────────
function IcoEdit({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoBlock({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={SW} />
      <Path d="M5.6 5.6l12.8 12.8" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}
function IcoBell({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.7 21a2 2 0 01-3.4 0"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoChatReceive({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 8v5M9.5 10.5L12 13l2.5-2.5"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoChevron({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoLogout({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoSave({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 21v-8H7v8M7 3v5h8"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoShield({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 12l2 2 4-4"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoWind({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9.59 4.59A2 2 0 1111 8H2"  stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17.73 2.7A2.5 2.5 0 1119.5 7H2" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14.83 21.41A2 2 0 1116.25 18H2" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoMapPin({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M1 6v15l7-3 8 3 7-3V3l-7 3-8-3-7 3z"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 3v15M16 6v15"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoPin({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={9} r={2.5} stroke={color} strokeWidth={SW} />
    </Svg>
  );
}

export default function MyInfoScreen() {
  const {
    user, setLoggedOut, blockedUsers, updateInterests,
    acceptsChat, setAcceptsChat, lang, setLang,
    isPremium, matchCountThisHour,
    customRegionGu, customRegionLabel, setCustomRegion,
  } = useStore();
  const t    = useT();
  const curLang = useLang();
  const [intModal,     setIntModal]     = useState(false);
  const [blockedModal, setBlockedModal] = useState(false);
  const [tmpInts,      setTmpInts]      = useState<string[]>([]);
  const [notifOn,      setNotifOn]      = useState(true);
  const [showUpgrade,    setShowUpgrade]    = useState(false);
  const [showRegionPick, setShowRegionPick] = useState(false);
  const [showVerify,     setShowVerify]     = useState(false);

  const myInts = (user?.interests || []).filter(i => i !== 'none');
  const myInt  = findInterest(myInts[0] || '');

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

  // 관심사 토글 (최대 3개)
  const toggleTmpInt = (id: string) => {
    setTmpInts(prev => {
      if (id === 'none') return prev.includes('none') ? [] : ['none'];
      const filtered = prev.filter(x => x !== 'none');
      if (filtered.includes(id)) return filtered.filter(x => x !== id);
      if (filtered.length >= 3) { Alert.alert(t('myinfo_int_max')); return prev; }
      return [...filtered, id];
    });
  };

  const INFO_ITEMS = [
    { Icon: IcoShield,  title: t('myinfo_info_anon'), desc: t('myinfo_info_anon_desc') },
    { Icon: IcoWind,    title: t('myinfo_info_once'), desc: t('myinfo_info_once_desc') },
    { Icon: IcoMapPin,  title: t('myinfo_info_gps'),  desc: t('myinfo_info_gps_desc') },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── 대형 타이틀 ───────────────────────────────── */}
      <View style={s.topBar}>
        <Text style={s.title}>{t('myinfo_title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── 프로필 카드 ───────────────────────────────── */}
        <View style={s.profileCard}>
          <NickAvatar nick={user?.nickname || '?'} size={80} />
          <View style={s.nicknameRow}>
            <Text style={s.nickname}>{user?.nickname}</Text>
            {user?.isVerified && (
              <View style={s.verifiedBadge}>
                <Text style={s.verifiedTxt}>✓ 인증</Text>
              </View>
            )}
          </View>
          {/* 이메일 */}
          {user?.email && (
            <Text style={s.emailTxt}>{user.email}</Text>
          )}
          {/* 성별/생년 — 본인 프로필에서는 항상 표시 */}
          {(user?.gender || user?.birthYear) && (
            <View style={s.profileInfoRow}>
              {user?.gender && (
                <Text style={s.profileInfoTxt}>{user.gender === 'male' ? '남성' : '여성'}</Text>
              )}
              {user?.gender && user?.birthYear && <Text style={s.profileInfoSep}>·</Text>}
              {user?.birthYear && (
                <Text style={s.profileInfoTxt}>{user.birthYear}년생</Text>
              )}
            </View>
          )}
          <View style={s.locRow}>
            <IcoPin color={Colors.g4} size={12} />
            <Text style={s.locTxt}>{user?.regionLabel || t('myinfo_location_unset')}</Text>
          </View>
          {myInt && (
            <View style={s.intBadge}>
              <InterestIcon id={myInt.id} size={13} color={Colors.primaryD} strokeWidth={1.7} />
              <Text style={s.intBadgeTxt}>{interestLabel(myInt, curLang)}</Text>
            </View>
          )}
          {/* 본인인증 버튼 */}
          <TouchableOpacity
            style={[s.verifyBtn, user?.isVerified && s.verifyBtnDone]}
            onPress={() => !user?.isVerified && setShowVerify(true)}
            activeOpacity={user?.isVerified ? 1 : 0.8}
          >
            <Text style={[s.verifyBtnTxt, user?.isVerified && s.verifyBtnTxtDone]}>
              {user?.isVerified ? '✓ 본인인증 완료' : '본인인증 하기 (선택)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 플랜 카드 ─────────────────────────────────── */}
        <TouchableOpacity
          style={[s.planCard, isPremium ? s.planCardPremium : s.planCardFree]}
          onPress={() => !isPremium && setShowUpgrade(true)}
          activeOpacity={isPremium ? 1 : 0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={[s.planBadge, isPremium ? s.planBadgePremium : s.planBadgeFree]}>
              {isPremium ? '⭐ PREMIUM' : '무료 플랜'}
            </Text>
            <Text style={s.planMatchTxt}>
              {isPremium
                ? `매칭 ${matchCountThisHour}/30회 사용`
                : `매칭 ${matchCountThisHour}/10회 사용`
              }
            </Text>
          </View>
          {!isPremium && (
            <View style={s.upgradeChip}>
              <Text style={s.upgradeChipTxt}>업그레이드 →</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── 지역 설정 (프리미엄 전용) ────────────────── */}
        <Text style={s.sectionLabel}>{t('myinfo_region_setting')}</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={s.row}
            onPress={() => isPremium ? setShowRegionPick(true) : setShowUpgrade(true)}
            activeOpacity={0.7}
          >
            <View style={s.rowLeft}>
              <Text style={{ fontSize: 15 }}>📍</Text>
              <View>
                <Text style={s.rowTitle}>{t('myinfo_region_custom')}</Text>
                {!isPremium && (
                  <Text style={s.premiumOnlyTxt}>{t('myinfo_region_premium_only')}</Text>
                )}
              </View>
            </View>
            <View style={s.rowRight}>
              {isPremium
                ? <Text style={s.rowValue}>{customRegionLabel || t('myinfo_region_current')}</Text>
                : <View style={s.lockBadge}><Text style={s.lockTxt}>🔒</Text></View>
              }
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 설정 ──────────────────────────────────────── */}
        <Text style={s.sectionLabel}>{t('myinfo_settings_section')}</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row}
            onPress={() => { setTmpInts(user?.interests || []); setIntModal(true); }}>
            <View style={s.rowLeft}>
              <IcoEdit color={Colors.g4} />
              <Text style={s.rowTitle}>{t('myinfo_interests_change')}</Text>
            </View>
            <View style={s.rowRight}>
              <Text style={s.rowValue}>
                {myInts.length > 0
                  ? myInts.map(id => interestLabel(findInterest(id), curLang)).filter(Boolean).join(' · ')
                  : t('myinfo_interest_unset')}
              </Text>
              <IcoChevron color={Colors.g3} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.row} onPress={() => setBlockedModal(true)}>
            <View style={s.rowLeft}>
              <IcoBlock color={Colors.g4} />
              <Text style={s.rowTitle}>{t('myinfo_blocked_list')}</Text>
            </View>
            <View style={s.rowRight}>
              <Text style={s.rowValue}>{t('myinfo_blocked_count', { count: blockedUsers.length })}</Text>
              <IcoChevron color={Colors.g3} />
            </View>
          </TouchableOpacity>

          {/* 채팅 받기 — 패시브 매칭 토글 */}
          <View style={s.row}>
            <View style={s.rowLeft}>
              <IcoChatReceive color={Colors.g4} />
              <View>
                <Text style={s.rowTitle}>{t('myinfo_accepts_chat')}</Text>
                <Text style={s.rowHint}>{t('myinfo_accepts_chat_hint')}</Text>
              </View>
            </View>
            <Switch
              value={acceptsChat}
              onValueChange={setAcceptsChat}
              trackColor={{ false: Colors.g2, true: '#034A93' }}
              thumbColor={acceptsChat ? '#ECFDF5' : Colors.g3}
              ios_backgroundColor={Colors.g2}
            />
          </View>

          {/* 알림 — 토글 스위치 */}
          <View style={s.row}>
            <View style={s.rowLeft}>
              <IcoBell color={Colors.g4} />
              <Text style={s.rowTitle}>{t('myinfo_notifications')}</Text>
            </View>
            <Switch
              value={notifOn}
              onValueChange={setNotifOn}
              trackColor={{ false: Colors.g2, true: '#034A93' }}
              thumbColor={notifOn ? '#ECFDF5' : Colors.g3}
              ios_backgroundColor={Colors.g2}
            />
          </View>

          {/* 언어 — Language toggle */}
          <View style={[s.row, s.rowLast]}>
            <View style={s.rowLeft}>
              <Text style={{ fontSize: 15 }}>{curLang === 'en' ? '🇺🇸' : '🇰🇷'}</Text>
              <Text style={s.rowTitle}>{t('myinfo_language')}</Text>
            </View>
            <TouchableOpacity
              style={s.langToggleBtn}
              onPress={() => setLang(curLang === 'ko' ? 'en' : 'ko')}
              activeOpacity={0.75}
            >
              <Text style={s.langToggleTxt}>{t('myinfo_language_value')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Locotalk 안내 ─────────────────────────────── */}
        <Text style={s.sectionLabel}>{t('myinfo_about_section')}</Text>
        <View style={s.infoCards}>
          {INFO_ITEMS.map((item, i) => (
            <View key={item.title} style={[s.infoCard, i === INFO_ITEMS.length - 1 && s.infoCardLast]}>
              <View style={s.infoIconBox}>
                <item.Icon color={Colors.primary} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoTitle}>{item.title}</Text>
                <Text style={s.infoDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── 로그아웃 버튼 ──────────────────────────────── */}
        <TouchableOpacity style={s.logoutBtn} onPress={() => {
          Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
            { text: '취소', style: 'cancel' },
            { text: '로그아웃', style: 'destructive', onPress: setLoggedOut },
          ]);
        }}>
          <View style={s.logoutBtnInner}>
            <IcoLogout color="#EF4444" />
            <Text style={[s.logoutTxt, { color: '#EF4444' }]}>로그아웃</Text>
          </View>
        </TouchableOpacity>

        <Text style={s.version}>Locotalk Beta · v1.0</Text>
      </ScrollView>

      {/* ── 업그레이드 모달 ──────────────────────────────── */}
      <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} reason="region" />

      {/* ── 본인인증 모달 ─────────────────────────────────── */}
      <IdentityVerifyModal visible={showVerify} onClose={() => setShowVerify(false)} />

      {/* ── 지역 선택 모달 (프리미엄) ────────────────────── */}
      <RegionPickerModal
        visible={showRegionPick}
        currentGu={customRegionGu}
        onSelect={(gu, label) => setCustomRegion(gu, label)}
        onClose={() => setShowRegionPick(false)}
      />

      {/* ── 관심사 변경 모달 (최대 3개) ───────────────── */}
      <Modal visible={intModal} transparent animationType="slide">
        <TouchableOpacity style={s.sheetBg} activeOpacity={1} onPress={() => setIntModal(false)}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetTitleRow}>
              <Text style={s.sheetTitle}>{t('myinfo_int_modal_title')}</Text>
              <Text style={[s.selBadge, tmpInts.filter(x=>x!=='none').length === 3 && s.selBadgeFull]}>
                {tmpInts.filter(x=>x!=='none').length}/3
              </Text>
            </View>
            <Text style={s.sheetSub}>{t('myinfo_int_modal_sub')}</Text>
            <View style={s.intGrid}>
              {INTERESTS.filter(it => it.id !== 'none').map(it => {
                const sel      = tmpInts.includes(it.id);
                const hasNone  = tmpInts.includes('none');
                const disabled = !sel && (tmpInts.filter(x=>x!=='none').length >= 3 || hasNone);
                return (
                  <Animated.View key={it.id} style={{ width: '22%', transform: [{ scale: getChipScale(it.id) }] }}>
                    <TouchableOpacity
                      style={[s.intChip, sel && s.intChipSel, disabled && s.intChipDim]}
                      onPress={() => { animateChip(it.id); toggleTmpInt(it.id); }}
                      activeOpacity={1}>
                      <InterestIcon id={it.id} size={24}
                        color={sel ? Colors.primary : disabled ? Colors.g2 : Colors.g4} strokeWidth={1.7} />
                      <Text style={[s.intLabel, sel && s.intLabelSel, disabled && s.intLabelDim]}>{interestLabel(it, curLang)}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
              {/* 없음 칩 */}
              {(() => {
                const sel = tmpInts.includes('none');
                return (
                  <Animated.View style={{ width: '22%', transform: [{ scale: getChipScale('none') }] }}>
                    <TouchableOpacity
                      style={[s.intChip, s.intChipNone, sel && s.intChipNoneSel]}
                      onPress={() => { animateChip('none'); toggleTmpInt('none'); }}
                      activeOpacity={1}>
                      <Text style={[s.noneIconTxt, sel && s.noneIconTxtSel]}>—</Text>
                      <Text style={[s.intLabel, sel && s.intLabelNoneSel]}>{t('myinfo_int_modal_none')}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })()}
            </View>
            <TouchableOpacity style={[s.saveBtn, Shadow.button]} onPress={() => {
              if (tmpInts.length === 0) { Alert.alert(t('myinfo_int_min')); return; }
              updateInterests(tmpInts);
              setIntModal(false);
            }}>
              <View style={s.saveBtnInner}>
                <IcoSave color="#fff" />
                <Text style={s.saveBtnTxt}>{t('save')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── 차단 목록 ──────────────────────────────────── */}
      <Modal visible={blockedModal} transparent animationType="slide">
        <TouchableOpacity style={s.sheetBg} activeOpacity={1} onPress={() => setBlockedModal(false)}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>{t('myinfo_blocked_title')}</Text>
            {blockedUsers.length === 0
              ? <Text style={s.sheetSub}>{t('myinfo_blocked_empty')}</Text>
              : blockedUsers.map((nick, i) => (
                <View key={i} style={s.blockedRow}>
                  <NickAvatar nick={nick} size={32} />
                  <Text style={[s.rowTitle, { flex: 1, marginLeft: 10 }]}>{nick}</Text>
                  <TouchableOpacity style={s.unblockBtn}>
                    <Text style={s.unblockTxt}>{t('myinfo_unblock')}</Text>
                  </TouchableOpacity>
                </View>
              ))
            }
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },

  topBar:  { backgroundColor: Colors.sf, paddingHorizontal: Spacing.lg, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.separator },
  title:   { fontSize: 28, fontWeight: '800', color: Colors.dark, letterSpacing: -0.8 },

  profileCard: { backgroundColor: Colors.sf, padding: Spacing.xl, alignItems: 'center', gap: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.separator },
  nickname:    { fontSize: Typography.title2, fontWeight: '900', color: Colors.dark, letterSpacing: -0.5 },
  nicknameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  verifiedBadge: { backgroundColor: '#034A93', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  verifiedTxt:   { fontSize: 11, color: '#fff', fontWeight: '700' },
  emailTxt:    { fontSize: 12, color: Colors.g4, marginTop: 2 },
  profileInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  profileInfoTxt: { fontSize: 13, color: Colors.g4 },
  profileInfoSep: { fontSize: 12, color: Colors.g3 },
  verifyBtn:      { marginTop: 12, paddingHorizontal: 16, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: '#034A93' },
  verifyBtnDone:  { borderColor: Colors.g2, backgroundColor: Colors.g1 },
  verifyBtnTxt:   { fontSize: 13, color: '#034A93', fontWeight: '600' },
  verifyBtnTxtDone: { color: Colors.g3 },
  locRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  locTxt:      { fontSize: Typography.footnote, color: Colors.g4 },
  intBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: tinted(Colors.primary, 0.1), borderRadius: Radius.pill, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, borderColor: tinted(Colors.primary, 0.25), marginTop: 4 },
  intBadgeTxt: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.primaryD },

  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: Colors.g4, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },

  // 플랜 카드
  planCard:         { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  planCardFree:     { backgroundColor: Colors.g1, borderWidth: 1, borderColor: Colors.g2 },
  planCardPremium:  { backgroundColor: '#034A93' },
  planBadge:        { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  planBadgeFree:    { color: Colors.g4 },
  planBadgePremium: { color: '#FFD700' },
  planMatchTxt:     { fontSize: 12, color: Colors.g4 },
  upgradeChip:      { backgroundColor: '#034A93', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  upgradeChipTxt:   { color: '#fff', fontSize: 12, fontWeight: '700' },

  // 지역 설정
  premiumOnlyTxt: { fontSize: 11, color: Colors.primary, marginTop: 2 },
  lockBadge:      { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.g1, alignItems: 'center', justifyContent: 'center' },
  lockTxt:        { fontSize: 14 },
  card:         { backgroundColor: Colors.sf, marginHorizontal: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.separator },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: Colors.separator, minHeight: 50 },
  rowLast:      { borderBottomWidth: 0 },
  rowLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowRight:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowTitle:     { fontSize: Typography.footnote, fontWeight: '600', color: Colors.dark },
  rowHint:      { fontSize: 10, color: Colors.g3, marginTop: 1 },
  rowValue:     { fontSize: Typography.footnote, color: Colors.g4 },

  // Spota info cards (list style)
  infoCards:   { backgroundColor: Colors.sf, marginHorizontal: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.separator },
  infoCard:    { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.separator },
  infoCardLast:{ borderBottomWidth: 0 },
  infoIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: tinted(Colors.primary, 0.12), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  infoTitle:   { fontSize: Typography.footnote, fontWeight: '700', color: Colors.dark, marginBottom: 2 },
  infoDesc:    { fontSize: Typography.caption1, color: Colors.g4, lineHeight: 16 },

  langToggleBtn:  { backgroundColor: tinted(Colors.primary, 0.1), borderRadius: Radius.pill, paddingVertical: 5, paddingHorizontal: 14, borderWidth: 1, borderColor: tinted(Colors.primary, 0.25) },
  langToggleTxt:  { fontSize: Typography.footnote, fontWeight: '700', color: Colors.primaryD },

  logoutBtn:      { margin: Spacing.lg, backgroundColor: Colors.g1, borderRadius: Radius.pill, height: 48, justifyContent: 'center', borderWidth: 0.5, borderColor: Colors.separator },
  logoutBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutTxt:      { fontSize: Typography.footnote, fontWeight: '700', color: Colors.g4 },
  version:        { textAlign: 'center', fontSize: 11, color: Colors.g3, marginBottom: 110 },

  sheetBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: Colors.sf, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.lg, paddingBottom: 40, maxHeight: '85%' },
  handle:       { width: 36, height: 4, backgroundColor: Colors.g2, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  sheetTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  sheetTitle:   { fontSize: Typography.title3, fontWeight: '800', color: Colors.dark },
  selBadge:     { fontSize: Typography.footnote, fontWeight: '800', color: Colors.g3, marginLeft: 4 },
  selBadgeFull: { color: '#034A93' },
  sheetSub:     { fontSize: Typography.footnote, color: Colors.g4, marginBottom: Spacing.md },

  intGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  intChip:       { width: '100%', paddingVertical: 10, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.g2, backgroundColor: Colors.sf, alignItems: 'center', gap: 4 },
  intChipSel:    { borderColor: '#034A93', backgroundColor: '#ECFDF5' },
  intChipDim:    { opacity: 0.35 },
  intChipNone:   { borderStyle: 'dashed' as const, borderColor: Colors.g2 },
  intChipNoneSel:{ borderStyle: 'solid' as const, borderColor: Colors.g4 },
  noneIconTxt:   { fontSize: 18, color: Colors.g3, fontWeight: '300' },
  noneIconTxtSel:{ color: Colors.g4 },
  intLabel:      { fontSize: 9, fontWeight: '700', color: Colors.g4 },
  intLabelSel:   { color: Colors.primaryD },
  intLabelDim:   { color: Colors.g2 },
  intLabelNoneSel:{ color: Colors.dark },

  saveBtn:     { backgroundColor: '#034A93', borderRadius: Radius.pill, height: 50, justifyContent: 'center', ...Shadow.button },
  saveBtnInner:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnTxt:  { fontSize: Typography.headline, fontWeight: '700', color: '#fff' },

  blockedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.separator },
  unblockBtn: { backgroundColor: tinted(Colors.primary, 0.1), borderRadius: Radius.pill, paddingVertical: 5, paddingHorizontal: 12 },
  unblockTxt: { fontSize: 12, fontWeight: '700', color: Colors.primaryD },
});
