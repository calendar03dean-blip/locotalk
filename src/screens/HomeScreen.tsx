import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Linking,
  Modal, ScrollView, TextInput, Animated, Easing, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { useStore } from '../store';
import { Colors, Typography, Spacing, Radius, Shadow, tinted } from '../constants/theme';
import { containsProfanity } from '../utils/filter';
import { findInterest, interestLabel } from '../constants/data';
import { useT, useLang, translate } from '../i18n';
import { regionIconId } from '../constants/regions';
import NickAvatar from '../components/NickAvatar';
import InterestIcon from '../components/InterestIcon';
import UpgradeModal from '../components/UpgradeModal';
import { connectSocket, getSocket } from '../services/socket';

// Legacy pool kept for offline/error fallback only
const MATCH_POOL = ['달리기왕','커피러버','책벌레','음악대장','사진작가','요리사','등산객'];


const COMPOSE_MAX = 100;

type FeedItem = { id: string; nick: string; interest: string; time: string; msg: string };

const DEFAULT_FEED: FeedItem[] = [];

/** Twitter-style circular character counter — visible only near limit */
function CharRing({ count, max, size = 22 }: { count: number; max: number; size?: number }) {
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
      {remaining <= 20 && (
        <Text style={{ position: 'absolute', fontSize: 7, fontWeight: '800', color }}>{remaining}</Text>
      )}
    </View>
  );
}

const SW = 1.8;

// ─── Icon helpers ─────────────────────────────────────────────────
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
function IcoMap({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M1 6v15l7-3 8 3 7-3V3l-7 3-8-3-7 3z" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 3v15M16 6v15" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoSparkles({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7L19 14z"
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
function IcoRefresh({ color, size = 11 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12a9 9 0 11-3.5-7.1" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 3v6h-6" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoChatFilled({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H9l-5 4V6a2 2 0 012-2z" />
    </Svg>
  );
}
function IcoPeople({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={9} cy={7} r={4} stroke={color} strokeWidth={SW} />
      <Path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function HomeScreen() {
  const navigation   = useNavigation<any>();
  const {
    user, peer, updateRegion, setPeer, setRoomId,
    matchHistory, addToMatchHistory,
    isPremium, matchCountThisHour, consumeMatchSlot, resetMatchCountIfNeeded,
    userLat, userLng, setUserCoords,
    blockedUsers,
    customRegionGu, customRegionLabel,
  } = useStore();
  const t    = useT();
  const lang = useLang();

  const [locLoading,    setLocLoading]    = useState(false);
  const [searching,     setSearching]     = useState(false);
  const [showUpgrade,   setShowUpgrade]   = useState(false);
  const [composeText,   setComposeText]   = useState('');
  const [feed,          setFeed]          = useState<FeedItem[]>(DEFAULT_FEED);
  const [feedLimit,     setFeedLimit]     = useState(5);
  const [pressedPost,   setPressedPost]   = useState<FeedItem | null>(null);

  // Ripple animation values
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const r3 = useRef(new Animated.Value(0)).current;
  // Bounce dot values
  const b1 = useRef(new Animated.Value(0)).current;
  const b2 = useRef(new Animated.Value(0)).current;
  const b3 = useRef(new Animated.Value(0)).current;
  // match_found / error 리스너 정리 함수 (타이밍 버그 방지용 인라인 등록)
  const matchListenerCleanup = useRef<(() => void) | null>(null);
  // 매칭 타임아웃 (상대 없음)
  const matchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { detectLocation(); }, []);

  // ── 동네 피드 실시간 수신 ────────────────────────────────────
  useEffect(() => {
    if (!user?.regionGu) return;
    const socket = connectSocket();

    const doJoinRegion = () => socket.emit('join_region', { region: user.regionGu });
    if (socket.connected) doJoinRegion();
    else socket.once('connect', doJoinRegion);
    socket.on('connect', doJoinRegion); // 재연결 시 재진입

    // 접속 시 서버 히스토리 수신
    const onFeedHistory = (posts: FeedItem[]) => {
      setFeed(posts);
    };
    socket.on('feed_history', onFeedHistory);

    const onNewPost = (item: FeedItem) => {
      const { lang: curLang } = useStore.getState();
      setFeed(prev => [{ ...item, time: translate('home_just_now', curLang) }, ...prev]);
    };
    socket.on('new_feed_post', onNewPost);

    return () => {
      socket.off('connect',       doJoinRegion);
      socket.off('feed_history',  onFeedHistory);
      socket.off('new_feed_post', onNewPost);
    };
  }, [user?.regionGu]);

  // Start / stop ripple + bounce animations with searching state
  useEffect(() => {
    if (!searching) {
      [r1, r2, r3, b1, b2, b3].forEach(v => v.setValue(0));
      return;
    }
    const rippleLoop = (v: Animated.Value) => Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1, duration: 2000,
          useNativeDriver: true,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    const bounceLoop = (v: Animated.Value) => Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: -5, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(v, { toValue: 0,  duration: 500, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
        Animated.delay(400),
      ])
    );
    const ripples = Animated.stagger(667, [rippleLoop(r1), rippleLoop(r2), rippleLoop(r3)]);
    const bounces = Animated.stagger(150, [bounceLoop(b1), bounceLoop(b2), bounceLoop(b3)]);
    ripples.start();
    bounces.start();
    return () => { ripples.stop(); bounces.stop(); };
  }, [searching]);

  const detectLocation = async () => {
    setLocLoading(true);
    try {
      const Location = await import('expo-location');

      // ── 권한 요청 ──────────────────────────────────────
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { lang: curLang } = useStore.getState();
        Alert.alert(
          translate('alert_gps_denied_title', curLang),
          translate('alert_gps_denied_msg', curLang),
          [
            { text: translate('alert_gps_denied_cancel', curLang), style: 'cancel' },
            { text: translate('alert_gps_denied_settings', curLang), onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      // ── 좌표 수신 ──────────────────────────────────────
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // 좌표 store에 저장 (매칭 거리 계산용)
      setUserCoords(loc.coords.latitude, loc.coords.longitude);

      // ── 역지오코딩 (좌표 → 행정구역) ──────────────────
      const [geo] = await Location.reverseGeocodeAsync({
        latitude : loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      // iOS 필드: district=구, subregion=동, city=시
      const gu   = geo?.district || geo?.subregion || geo?.city || '';
      const dong = geo?.district && geo?.subregion ? geo.subregion : '';
      const label = dong ? `${gu} · ${dong}` : gu;

      if (gu) {
        updateRegion(gu, label);
      } else {
        throw new Error('주소 변환 실패');
      }
    } catch {
      // GPS 에러 알림 suppression (스크린샷용)
    } finally {
      setLocLoading(false);
    }
  };

  const startMatch = () => {
    if (!user) return;

    // 아직 채팅방에 있으면 채팅 화면으로 이동 (재매칭 방지)
    if (peer) {
      navigation.navigate('채팅');
      return;
    }

    // 매칭 횟수 리셋 체크 후 한도 확인
    resetMatchCountIfNeeded();
    if (!consumeMatchSlot()) {
      setShowUpgrade(true);
      return;
    }

    // 버튼 탭 즉시 레이더 애니메이션 시작
    setSearching(true);

    try {
      const socket = connectSocket();

      const doJoin = () => {
        // 이전 리스너 먼저 정리
        matchListenerCleanup.current?.();

        // ⚠️ join_queue emit 전에 리스너 등록해야 함
        // useEffect 방식은 React 렌더 후 등록되어 서버 즉시 응답 시 이벤트 유실
        const onMatchFound = ({ roomId, peer }: {
          roomId: string;
          peer: { nick: string; interests: string[]; region: string; roomId: string; distanceKm?: number | null };
        }) => {
          matchListenerCleanup.current?.();
          matchListenerCleanup.current = null;
          if (matchTimeoutRef.current) { clearTimeout(matchTimeoutRef.current); matchTimeoutRef.current = null; }

          const isRepeat = matchHistory.includes(peer.nick);
          addToMatchHistory(peer.nick);

          const proceed = () => {
            setPeer({ nick: peer.nick, interests: peer.interests, region: peer.region, roomId, distanceKm: peer.distanceKm ?? null });
            setRoomId(roomId);
            setSearching(false);
            setTimeout(() => navigation.navigate('채팅'), 350);
          };

          if (isRepeat) {
            const { lang: curLang } = useStore.getState();
            setSearching(false);
            Alert.alert(
              translate('alert_repeat_match_title', curLang),
              translate('alert_repeat_match_msg', curLang).replace('{{nick}}', peer.nick),
              [
                { text: translate('alert_repeat_match_cancel', curLang), style: 'cancel' },
                { text: translate('alert_repeat_match_ok', curLang), onPress: proceed },
              ],
            );
          } else {
            proceed();
          }
        };

        const onError = ({ message }: { message: string }) => {
          matchListenerCleanup.current?.();
          matchListenerCleanup.current = null;
          setSearching(false);
          Alert.alert(translate('alert_match_error', useStore.getState().lang), message);
        };

        // 큐 대기 중 상대방이 새로 join_queue해서 match_request가 오면 searching 모달 닫기
        // (RootNavigator 에서 수락/거절 UI 처리)
        const onMatchRequest = () => { setSearching(false); };

        socket.on('match_found',   onMatchFound);
        socket.on('match_request', onMatchRequest);
        socket.on('error',         onError);
        matchListenerCleanup.current = () => {
          socket.off('match_found',   onMatchFound);
          socket.off('match_request', onMatchRequest);
          socket.off('error',         onError);
        };

        // 리스너 등록 완료 후 emit
        // 프리미엄 커스텀 지역 설정 시 해당 지역으로 매칭
        const matchRegion = (isPremium && customRegionGu)
          ? customRegionGu
          : user.regionGu || '마포구';

        socket.emit('join_queue', {
          nick        : user.nickname,
          interests   : (user.interests || []).filter(i => i !== 'none'),
          region      : matchRegion,
          lat         : (isPremium && customRegionGu) ? null : userLat, // 커스텀 지역이면 좌표 무시
          lng         : (isPremium && customRegionGu) ? null : userLng,
          isPremium   : isPremium,
          blockedUsers: blockedUsers,
        });

        // 30초 안에 매칭 없으면 → 상대 없음 알림
        if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
        matchTimeoutRef.current = setTimeout(() => {
          matchTimeoutRef.current = null;
          matchListenerCleanup.current?.();
          matchListenerCleanup.current = null;
          socket.emit('leave_queue');
          setSearching(false);
          const { lang: curLang } = useStore.getState();
          Alert.alert(
            translate('alert_no_match_title', curLang),
            translate('alert_no_match_msg', curLang),
            [{ text: translate('alert_no_match_ok', curLang) }],
          );
        }, 30000);
      };

      if (socket.connected) {
        doJoin();
      } else {
        socket.once('connect', doJoin);
        setTimeout(() => {
          if (!socket.connected) {
            socket.off('connect', doJoin);
            startMatchOffline();
          }
        }, 5000);
      }
    } catch {
      startMatchOffline();
    }
  };

  /** 서버 없을 때 로컬 시뮬레이션 폴백 */
  const startMatchOffline = () => {
    setTimeout(() => {
      const nick   = MATCH_POOL[Math.floor(Math.random() * MATCH_POOL.length)];
      const region = user?.regionGu || '마포구';
      const roomId = 'room-local-' + Date.now();
      const FALLBACK = ['coffee','run','book','music','food','photo','hike'];
      const userInts = (user?.interests || []).filter(i => i !== 'none');
      const pool = userInts.length > 0 ? userInts : FALLBACK;
      const matchIntId = pool[Math.floor(Math.random() * pool.length)];

      const isRepeat = matchHistory.includes(nick);
      addToMatchHistory(nick);

      // 오프라인 시뮬레이션: 랜덤 거리 (0.3 ~ 5.9km)
      const mockDist = isPremium
        ? Math.round((0.3 + Math.random() * 5.6) * 10) / 10
        : null;

      const proceed = () => {
        setPeer({ nick, interests: [matchIntId], region, roomId, distanceKm: mockDist });
        setRoomId(roomId);
        setSearching(false);
        setTimeout(() => navigation.navigate('채팅'), 350);
      };

      if (isRepeat) {
        const { lang: curLang } = useStore.getState();
        setSearching(false);
        Alert.alert(
          translate('alert_repeat_match_title', curLang),
          translate('alert_repeat_match_msg', curLang).replace('{{nick}}', nick),
          [
            { text: translate('alert_repeat_match_cancel', curLang), style: 'cancel' },
            { text: translate('alert_repeat_match_ok', curLang), onPress: proceed },
          ],
        );
      } else {
        proceed();
      }
    }, 2500);
  };

  const handleCompose = () => {
    const text = composeText.trim();
    if (!text) return;
    if (containsProfanity(text)) {
      Alert.alert(t('alert_compose_blocked_title'), t('alert_compose_blocked_msg'));
      return;
    }
    const newItem: FeedItem = {
      id      : Date.now().toString(),
      nick    : user?.nickname || '나',
      interest: (user?.interests || []).find(i => i !== 'none') || 'none',
      time    : t('home_just_now'),
      msg     : text,
    };
    setFeed(prev => [newItem, ...prev]);
    setComposeText('');

    // 동네 실시간 브로드캐스트
    const socket = getSocket();
    if (socket?.connected && user?.regionGu) {
      socket.emit('post_feed', {
        text,
        nick    : user.nickname,
        interest: newItem.interest,
        region  : user.regionGu,
      });
    }
  };

  const myInts = (user?.interests || []).filter(i => i !== 'none');

  const INFO_ITEMS = [
    { Icon: IcoShield, title: t('home_info_anon'),     desc: t('home_info_anon_desc') },
    { Icon: IcoWind,   title: t('home_info_once'),     desc: t('home_info_once_desc') },
    { Icon: IcoMap,    title: t('home_info_my_hood'),  desc: t('home_info_my_hood_desc') },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── 상단바 ─────────────────────────────────────── */}
      <View style={s.topBar}>
        <View style={s.topLeft}>
          <NickAvatar nick={user?.nickname || '?'} size={36} />
          <View style={{ marginLeft: 10 }}>
            <Text style={s.nickTxt}>{user?.nickname}</Text>
            <TouchableOpacity style={s.locRow} onPress={detectLocation}>
              {locLoading
                ? <ActivityIndicator size={10} color={Colors.g4} />
                : <IcoPin color={Colors.g4} size={11} />
              }
              <Text style={s.locTxt}>{user?.regionLabel || t('home_detecting_location')}</Text>
              <IcoRefresh color={Colors.g3} size={11} />
            </TouchableOpacity>
          </View>
        </View>
        {myInts.length > 0 && (
          <View style={s.myIntRow}>
            {myInts.map(id => {
              const it = findInterest(id);
              if (!it) return null;
              return (
                <View key={id} style={s.myIntBadge}>
                  <InterestIcon id={id} size={12} color={Colors.primaryD} strokeWidth={1.7} />
                  <Text style={s.myIntTxt}>{interestLabel(it, lang)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* ── 히어로 ─────────────────────────────────────── */}
        <View style={s.heroCard}>
          <View style={s.heroBubble1} />
          <View style={s.heroBubble2} />
          <View style={s.heroEyebrowRow}>
            <IcoPin color="rgba(255,255,255,0.85)" size={12} />
            <Text style={s.heroEyebrow}>
              {isPremium && customRegionLabel
                ? `⭐ ${customRegionLabel}`
                : (user?.regionLabel || t('home_my_hood'))
              } {t('home_nearby')}
            </Text>
          </View>
          <Text style={s.heroTitle}>{t('home_hero_title')}</Text>
          <Text style={s.heroDesc}>{t('home_hero_desc')}</Text>
          <TouchableOpacity
            style={[s.matchBtn, !user?.regionLabel && s.matchBtnOff]}
            onPress={user?.regionLabel ? startMatch : detectLocation}
            activeOpacity={0.85}
          >
            {locLoading && <ActivityIndicator size={16} color={Colors.primaryD} />}
            <Text style={[s.matchBtnTxt, !user?.regionLabel && s.matchBtnTxtOff]}>
              {user?.regionLabel ? t('home_match_start') : t('home_match_checking_gps')}
            </Text>
          </TouchableOpacity>

          {/* 매칭 횟수 카운터 */}
          {user?.regionLabel && (
            <TouchableOpacity onPress={() => setShowUpgrade(true)} style={s.matchCountRow}>
              {isPremium
                ? <Text style={s.matchCountPremium}>⭐ PREMIUM · 30회/시간</Text>
                : <Text style={s.matchCountFree}>
                    {t('premium_match_count')
                      .replace('{{used}}', String(matchCountThisHour))
                      .replace('{{limit}}', '10')}
                  </Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* ── 안내 카드 ──────────────────────────────────── */}
        <View style={s.infoRow}>
          {INFO_ITEMS.map(item => (
            <View key={item.title} style={s.infoCard}>
              <item.Icon color={Colors.primary} size={20} />
              <Text style={s.infoTitle}>{item.title}</Text>
              <Text style={s.infoDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>

        {/* ── 지금 우리 동네 ──────────────────────────────── */}
        <View>
          <View style={s.activityHeader}>
            <View style={s.activityHeaderLeft}>
              <IcoPeople color={Colors.g4} size={14} />
              <Text style={s.activitySectionTitle}>{t('home_activity_title')}</Text>
            </View>
            <View style={s.liveChip}>
              <View style={s.liveDot} />
              <Text style={s.liveTxt}>{user?.regionGu || '우리 동네'}</Text>
            </View>
          </View>
          <View style={s.activityList}>
            {/* ── 글 작성 ── */}
            <View style={s.composeRow}>
              <NickAvatar nick={user?.nickname || '?'} size={32} />
              <TextInput
                style={s.composeInput}
                placeholder={t('home_compose_placeholder')}
                placeholderTextColor={Colors.g3}
                value={composeText}
                onChangeText={t => composeText.length < COMPOSE_MAX || t.length < composeText.length ? setComposeText(t) : null}
                maxLength={COMPOSE_MAX}
                returnKeyType="send"
                onSubmitEditing={handleCompose}
              />
              {composeText.length > 0 && (
                <View style={s.composeActions}>
                  <CharRing count={composeText.length} max={COMPOSE_MAX} size={22} />
                  <TouchableOpacity style={s.composeBtn} onPress={handleCompose}>
                    <Text style={s.composeBtnTxt}>{t('home_compose_submit')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {feed.slice(0, feedLimit).map((item, i, arr) => (
              <TouchableOpacity
                key={item.id}
                style={[s.activityRow, i === arr.length - 1 && !(feed.length > feedLimit) && s.activityRowLast]}
                onLongPress={() => setPressedPost(item)}
                delayLongPress={400}
                activeOpacity={0.7}
              >
                <NickAvatar nick={item.nick} size={36} />
                <View style={s.activityBody}>
                  <View style={s.activityNameRow}>
                    <Text style={s.activityNick}>{item.nick}</Text>
                    {item.interest !== 'none' && (
                      <InterestIcon id={item.interest} size={13} color={Colors.primary} strokeWidth={1.7} />
                    )}
                  </View>
                  <Text style={s.activityMsg} numberOfLines={1}>{item.msg}</Text>
                </View>
                <Text style={s.activityTime}>{item.time}</Text>
              </TouchableOpacity>
            ))}

            {/* ── 더 보기 ── */}
            {feed.length > feedLimit && (
              <TouchableOpacity
                style={s.loadMoreBtn}
                onPress={() => setFeedLimit(prev => prev + 5)}
                activeOpacity={0.7}
              >
                <Text style={s.loadMoreTxt}>
                  {t('home_load_more', { count: feed.length - feedLimit })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── 업그레이드 모달 ──────────────────────────────── */}
      <UpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason="limit"
      />

      {/* ── 탐색 중 모달 — ripple ──────────────────────── */}
      <Modal visible={searching} transparent animationType="fade">
        <View style={s.searchBg}>
          {/* Ripple rings + Logo center */}
          <View style={s.rippleOuter}>
            {/* Rings — absolute so they expand without affecting layout */}
            <View style={[s.rippleWrap, { position: 'absolute' }]}>
              {[r1, r2, r3].map((anim, i) => (
                <Animated.View key={i} style={[s.rippleRing, {
                  transform: [{ scale: anim.interpolate({ inputRange: [0,1], outputRange: [0.4, 1.8] }) }],
                  opacity:           anim.interpolate({ inputRange: [0,1], outputRange: [0.6, 0] }),
                }]} />
              ))}
            </View>
            {/* Center circle — rendered last so it sits above the rings */}
            <View style={s.rippleCenter}>
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 52, height: 52 }}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={s.searchTitle}>{t('home_searching_title')}</Text>
          <Text style={s.searchSub}>{t('home_searching_sub', { region: user?.regionLabel || '' })}</Text>

          {/* Bounce dots */}
          <View style={s.bounceRow}>
            {[b1, b2, b3].map((anim, i) => (
              <Animated.View key={i} style={[s.bounceDot, { transform: [{ translateY: anim }] }]} />
            ))}
          </View>

          <TouchableOpacity style={s.cancelBtn} onPress={() => {
              getSocket()?.emit('leave_queue');
              matchListenerCleanup.current?.();
              matchListenerCleanup.current = null;
              if (matchTimeoutRef.current) { clearTimeout(matchTimeoutRef.current); matchTimeoutRef.current = null; }
              setSearching(false);
            }}>
            <Text style={s.cancelTxt}>{t('home_searching_cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── 게시글 전체 보기 모달 ─────────────────────── */}
      <Modal visible={!!pressedPost} transparent animationType="fade" onRequestClose={() => setPressedPost(null)}>
        <TouchableOpacity style={s.postModalBg} activeOpacity={1} onPress={() => setPressedPost(null)}>
          <View style={s.postModalCard}>
            <View style={s.postModalHeader}>
              <NickAvatar nick={pressedPost?.nick || '?'} size={42} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={s.postModalNick}>{pressedPost?.nick}</Text>
                <View style={s.postModalMetaRow}>
                  {pressedPost && pressedPost.interest !== 'none' && (
                    <InterestIcon id={pressedPost.interest} size={12} color={Colors.primary} strokeWidth={1.7} />
                  )}
                  <Text style={s.postModalTime}>{pressedPost?.time}</Text>
                </View>
              </View>
            </View>
            <Text style={s.postModalMsg}>{pressedPost?.msg}</Text>
            <TouchableOpacity style={s.postModalClose} onPress={() => setPressedPost(null)}>
              <Text style={s.postModalCloseTxt}>{t('home_post_close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },

  // Top bar
  topBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.sf, paddingHorizontal: Spacing.lg, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.separator },
  topLeft:    { flexDirection: 'row', alignItems: 'center' },
  nickTxt:    { fontSize: Typography.footnote, fontWeight: '700', color: Colors.dark },
  locRow:     { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locTxt:     { fontSize: Typography.caption2, color: Colors.g4 },
  myIntRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', flexShrink: 1, maxWidth: '60%' },
  myIntBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: tinted(Colors.primary, 0.12), borderRadius: Radius.pill, paddingVertical: 5, paddingHorizontal: 11, borderWidth: 1, borderColor: tinted(Colors.primary, 0.25) },
  myIntTxt:   { fontSize: Typography.caption1, fontWeight: '700', color: Colors.primaryD },

  // Scroll body
  body: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 130 },

  // Hero card
  heroCard:        { backgroundColor: Colors.primary, borderRadius: 28, padding: 26, overflow: 'hidden', minHeight: 280, justifyContent: 'flex-end' },
  heroBubble1:     { position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.10)' },
  heroBubble2:     { position: 'absolute', top: 30, right: 24, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroEyebrowRow:  { position: 'absolute', top: 22, left: 24, flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroEyebrow:     { fontSize: Typography.caption1, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
  heroTitle:       { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: -1.2, lineHeight: 40, marginBottom: 12 },
  heroDesc:        { fontSize: Typography.footnote, color: 'rgba(255,255,255,0.78)', lineHeight: 20, marginBottom: 22 },
  matchBtn:        { backgroundColor: '#ECFDF5', borderRadius: Radius.pill, height: 54, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  matchBtnOff:     { backgroundColor: 'rgba(255,255,255,0.5)' },
  matchBtnTxt:     { fontSize: Typography.headline, fontWeight: '800', color: Colors.primaryD },
  matchBtnTxtOff:  { color: Colors.g3 },
  matchCountRow:   { alignItems: 'center', marginTop: 8 },
  matchCountFree:  { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  matchCountPremium: { fontSize: 12, color: '#FFD700', fontWeight: '700' },

  // Info cards
  infoRow:   { flexDirection: 'row', gap: 8 },
  infoCard:  { flex: 1, backgroundColor: Colors.sf, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 5, borderWidth: 0.5, borderColor: Colors.separator },
  infoTitle: { fontSize: Typography.caption1, fontWeight: '800', color: Colors.dark },
  infoDesc:  { fontSize: 10, color: Colors.g4, textAlign: 'center', lineHeight: 14 },

  // Activity feed
  activityHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  activityHeaderLeft:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  activitySectionTitle: { fontSize: 12, fontWeight: '800', color: Colors.g4, textTransform: 'uppercase', letterSpacing: 0.5 },
  liveChip:             { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot:              { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green },
  liveTxt:              { fontSize: 11, color: Colors.g4 },
  activityList:         { backgroundColor: Colors.sf, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.separator },
  composeRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 0.5, borderBottomColor: Colors.separator },
  composeInput:         { flex: 1, fontSize: 13, color: Colors.dark, paddingVertical: 4 },
  composeActions:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  composeBtn:           { paddingVertical: 5, paddingHorizontal: 12, borderRadius: Radius.pill, backgroundColor: tinted(Colors.primary, 0.12), borderWidth: 1, borderColor: tinted(Colors.primary, 0.25) },
  composeBtnTxt:        { fontSize: 12, fontWeight: '700', color: Colors.primaryD },
  activityRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderBottomWidth: 0.5, borderBottomColor: Colors.separator },
  activityRowLast:      { borderBottomWidth: 0 },
  loadMoreBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: Colors.separator },
  loadMoreTxt:          { fontSize: 12, fontWeight: '700', color: Colors.primary },
  activityBody:         { flex: 1, minWidth: 0 },
  activityNameRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  activityNick:         { fontSize: 14, fontWeight: '700', color: Colors.dark },
  activityMsg:          { fontSize: 12, color: Colors.g4 },
  activityTime:         { fontSize: 11, color: Colors.g3 },

  // Search modal — ripple design
  searchBg:    { flex: 1, backgroundColor: 'rgba(14,24,22,0.88)', alignItems: 'center', justifyContent: 'center' },
  rippleOuter: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  rippleWrap:  { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  rippleRing:  { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(64,211,182,0.35)' },
  rippleCenter:{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#40D3B6', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  searchTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  searchSub:   { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8, marginBottom: 28 },
  bounceRow:   { flexDirection: 'row', gap: 6, marginBottom: 28 },
  bounceDot:   { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.75)' },
  cancelBtn:   { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', paddingVertical: 11, paddingHorizontal: 28, borderRadius: Radius.pill },
  cancelTxt:   { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Post detail modal
  postModalBg:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  postModalCard:     { width: '100%', backgroundColor: Colors.sf, borderRadius: Radius.xxl, padding: Spacing.lg, ...Shadow.glass },
  postModalHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  postModalNick:     { fontSize: Typography.headline, fontWeight: '700', color: Colors.dark },
  postModalMetaRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  postModalTime:     { fontSize: Typography.caption2, color: Colors.g3 },
  postModalMsg:      { fontSize: Typography.body, color: Colors.dark, lineHeight: 24 },
  postModalClose:    { alignSelf: 'flex-end', marginTop: 18, paddingVertical: 8, paddingHorizontal: 20, borderRadius: Radius.pill, backgroundColor: Colors.g1 },
  postModalCloseTxt: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.g4 },

});
