import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Easing,
} from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle } from 'react-native-svg';
import { useStore } from '../store';
import { Colors, Typography, Spacing, Radius, Shadow, tinted } from '../constants/theme';
import { connectSocket, getSocket, disconnectSocket } from '../services/socket';
import { loadChatSession, clearChatSession } from '../store';
import { findInterest, interestLabel } from '../constants/data';
import { useT, useLang } from '../i18n';
import {
  registerForPushNotificationsAsync,
  sendPushTokenToServer,
} from '../services/notifications';
import NickAvatar from '../components/NickAvatar';

// Global navigation ref — used by DevTools / screenshots
export const navRef = createNavigationContainerRef<any>();
(global as any).spotaNav = navRef;

import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen       from '../screens/HomeScreen';
import MyInfoScreen     from '../screens/MyInfoScreen';
import ChatScreen       from '../screens/ChatScreen';

const Root = createNativeStackNavigator();
const Tab  = createBottomTabNavigator();

const SW = 1.8;

// ─── Icons (outline + filled variants) ───────────────────────────
function IcoHome({ color, filled = false }: { color: string; filled?: boolean }) {
  if (filled) {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
        <Path d="M3 11.5L12 4l9 7.5V20a1.5 1.5 0 01-1.5 1.5h-3.5V14h-4v7.5H4.5A1.5 1.5 0 013 20v-8.5z" />
      </Svg>
    );
  }
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11.5L12 4l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-8.5z"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 21V14h6v7"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IcoChat({ color, filled = false }: { color: string; filled?: boolean }) {
  if (filled) {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
        <Path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H9l-5 4V6a2 2 0 012-2z" />
      </Svg>
    );
  }
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IcoPerson({ color, filled = false }: { color: string; filled?: boolean }) {
  if (filled) {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
        <Circle cx={12} cy={8} r={4} fill={color} />
        <Path d="M4 21a8 8 0 0116 0v1H4z" fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={SW} />
      <Path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Floating Glass Tab Bar ───────────────────────────────────────
function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const peer = useStore(s => s.peer);
  const t    = useT();

  // Hide entirely on the chat screen
  const activeRouteName = state.routes[state.index]?.name;
  if (activeRouteName === '채팅') return null;

  const TAB_CONFIG: Record<string, { Icon: React.FC<{ color: string; filled?: boolean }>; label: string }> = {
    '홈':    { Icon: IcoHome,   label: t('tab_home') },
    '채팅':  { Icon: IcoChat,   label: t('tab_chat') },
    '내정보':{ Icon: IcoPerson, label: t('tab_myinfo') },
  };

  return (
    <View style={ts.container} pointerEvents="box-none">
      <View style={ts.pill}>
        {state.routes.map((route, index) => {
          const cfg = TAB_CONFIG[route.name];
          if (!cfg) return null;

          const isFocused  = state.index === index;
          const isChatTab  = route.name === '채팅';
          const showDot    = isChatTab && !!peer && !isFocused;

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.75}
              onPress={() => {
                if (!isFocused) navigation.navigate(route.name);
              }}
              style={[ts.tab, isFocused && ts.tabActive]}
            >
              <cfg.Icon color={isFocused ? '#fff' : Colors.g4} filled={isFocused} />
              {isFocused && <Text style={ts.tabLabel}>{cfg.label}</Text>}
              {showDot && <View style={ts.dot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const ts = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 28, left: 0, right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 999,
    paddingHorizontal: 6, paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14, shadowRadius: 28,
    elevation: 14, gap: 4,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 999, position: 'relative',
  },
  tabActive: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38, shadowRadius: 18,
    elevation: 8,
  },
  tabLabel: {
    marginLeft: 6, fontSize: 13, fontWeight: '800', color: '#fff',
  },
  dot: {
    position: 'absolute', top: 6, right: 6,
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 2, borderColor: '#fff',
  },
});

// ─── Incoming match request modal ─────────────────────────────────
interface MatchRequest {
  requestId : string;
  fromNick  : string;
  fromInterest: string;
  fromRegion: string;
}

function IncomingMatchModal({ request, onAccept, onDecline }: {
  request: MatchRequest;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const t    = useT();
  const lang = useLang();

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
  }, []);

  const fromInterestLabel = interestLabel(findInterest(request.fromInterest), lang);

  return (
    <Modal visible transparent animationType="none">
      <View style={ms.backdrop}>
        <Animated.View style={[ms.card, { transform: [{ scale }], opacity }]}>
          <View style={ms.handle} />
          <Text style={ms.eyebrow}>{t('match_request_title')}</Text>
          <NickAvatar nick={request.fromNick} size={72} />
          <Text style={ms.nick}>{request.fromNick}</Text>
          <Text style={ms.meta}>
            {request.fromRegion}{fromInterestLabel ? ` · ${fromInterestLabel}` : ''} · {t('match_anon')}
          </Text>
          <View style={ms.btnRow}>
            <TouchableOpacity style={ms.declineBtn} onPress={onDecline} activeOpacity={0.8}>
              <Text style={ms.declineTxt}>{t('match_decline')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ms.acceptBtn, Shadow.button]} onPress={onAccept} activeOpacity={0.85}>
              <Text style={ms.acceptTxt}>{t('match_accept')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={ms.hint}>{t('match_hint')}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  card:       { backgroundColor: Colors.sf, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: Spacing.xl, paddingBottom: 48, paddingTop: 16, alignItems: 'center', gap: 10 },
  handle:     { width: 36, height: 4, backgroundColor: Colors.g2, borderRadius: 2, marginBottom: 8 },
  eyebrow:    { fontSize: Typography.caption1, fontWeight: '800', color: Colors.primary },
  nick:       { fontSize: Typography.title2, fontWeight: '900', color: Colors.dark, letterSpacing: -0.5 },
  meta:       { fontSize: Typography.footnote, color: Colors.g4 },
  btnRow:     { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
  declineBtn: { flex: 1, height: 50, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.separator, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.g1 },
  declineTxt: { fontSize: Typography.headline, fontWeight: '700', color: Colors.g4 },
  acceptBtn:  { flex: 2, height: 50, borderRadius: Radius.pill, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  acceptTxt:  { fontSize: Typography.headline, fontWeight: '700', color: '#fff' },
  hint:       { fontSize: 10, color: Colors.g3, textAlign: 'center', marginTop: 4 },
});

// ─── Tab navigator ────────────────────────────────────────────────
function AppTabs() {
  const { user, acceptsChat, peer, setPeer, setRoomId } = useStore();
  const [incomingRequest, setIncomingRequest] = useState<MatchRequest | null>(null);
  const declineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 앱 재시작 시 이전 채팅 세션 복원 ───────────────────────
  useEffect(() => {
    if (!user) return;

    loadChatSession().then(session => {
      if (!session) return;

      // 세션 만료 확인 (30분)
      if (Date.now() - session.savedAt > 30 * 60 * 1000) {
        clearChatSession().catch(() => {});
        return;
      }

      const socket = connectSocket();
      const doRejoin = () => {
        socket.emit('rejoin_room', { roomId: session.roomId, nick: user.nickname });

        const onRejoined = () => {
          socket.off('peer_left', onExpired);
          setPeer(session.peer);
          setRoomId(session.roomId);
          // 채팅 탭으로 자동 이동
          setTimeout(() => {
            if (navRef.isReady()) navRef.navigate('채팅' as never);
          }, 500);
        };

        const onExpired = () => {
          socket.off('peer_reconnected', onRejoined);
          clearChatSession().catch(() => {});
        };

        socket.once('peer_reconnected', onRejoined);
        socket.once('peer_left',        onExpired);

        // 10초 안에 응답 없으면 포기
        setTimeout(() => {
          socket.off('peer_reconnected', onRejoined);
          socket.off('peer_left',        onExpired);
        }, 10000);
      };

      if (socket.connected) doRejoin();
      else socket.once('connect', doRejoin);
    }).catch(() => {});
  }, [user?.nickname]); // 로그인 완료 후 1회 실행

  // ── 소켓 연결 + 대기 모드 진입 (채팅 받기 ON일 때) ──────────
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket();

    // 푸시 토큰 등록 (Feature 3) — nick 포함해야 앱 종료 후 재연결 없이도 push 가능
    registerForPushNotificationsAsync().then(token => {
      if (token) sendPushTokenToServer(token, user.nickname);
    });

    // 소켓 연결 완료 시 standby 등록 + 놓친 match_request 재확인
    const registerStandby = () => {
      if (!user) return;
      if (acceptsChat) {
        socket.emit('join_standby', {
          nick     : user.nickname,
          interests: (user.interests || []).filter(i => i !== 'none'),
          region   : user.regionGu || '',
        });
      } else {
        socket.emit('leave_standby');
      }
      // 연결/재연결 시 서버에 pending match_request 있으면 재발송 요청
      socket.emit('check_pending_match', { nick: user.nickname });
    };

    // once → on: 재연결 때도 항상 실행 (리스너 교체 없으므로 중복 등록 안됨)
    if (socket.connected) registerStandby();
    socket.on('connect', registerStandby);

    // ── match_request 수신 (패시브 매칭) ──────────────────────
    const onMatchRequest = ({ requestId, fromNick, fromInterest, fromRegion }: MatchRequest) => {
      // 이미 채팅 중이면 자동 거절
      const currentPeer = useStore.getState().peer;
      if (currentPeer) {
        socket.emit('decline_match', { requestId });
        return;
      }
      setIncomingRequest({ requestId, fromNick, fromInterest, fromRegion });

      // 30초 자동 거절 타이머
      declineTimerRef.current = setTimeout(() => {
        socket.emit('decline_match', { requestId });
        setIncomingRequest(null);
      }, 60000);
    };

    // ── passive_match_found: 수동 매칭 완료 (능동 match_found 와 구분) ──
    // 능동 사용자(버튼 누른)는 HomeScreen 에서 match_found 처리
    // 수동 사용자(채팅 받기 ON)는 여기서 passive_match_found 처리
    const onPassiveMatchFound = ({ roomId, peer }: {
      roomId: string;
      peer: { nick: string; interests: string[]; region: string };
    }) => {
      setPeer({ nick: peer.nick, interests: peer.interests, region: peer.region, roomId });
      setRoomId(roomId);
      setIncomingRequest(null);
      // 채팅 화면으로 이동
      setTimeout(() => {
        if (navRef.isReady()) navRef.navigate('채팅' as never);
      }, 300);
    };

    socket.on('match_request',       onMatchRequest);
    socket.on('passive_match_found', onPassiveMatchFound);

    return () => {
      socket.off('connect',            registerStandby);
      socket.off('match_request',       onMatchRequest);
      socket.off('passive_match_found', onPassiveMatchFound);
    };
  }, [user?.nickname, acceptsChat]);

  // ── acceptsChat 토글 → standby 업데이트 ──────────────────────
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket?.connected) return;

    if (acceptsChat) {
      socket.emit('join_standby', {
        nick     : user.nickname,
        interests: (user.interests || []).filter(i => i !== 'none'),
        region   : user.regionGu || '',
      });
    } else {
      socket.emit('leave_standby');
    }
  }, [acceptsChat]);

  const handleAccept = () => {
    if (!incomingRequest) return;
    if (declineTimerRef.current) clearTimeout(declineTimerRef.current);
    getSocket()?.emit('accept_match', { requestId: incomingRequest.requestId });
    setIncomingRequest(null);
  };

  const handleDecline = () => {
    if (!incomingRequest) return;
    if (declineTimerRef.current) clearTimeout(declineTimerRef.current);
    getSocket()?.emit('decline_match', { requestId: incomingRequest.requestId });
    setIncomingRequest(null);
  };

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="홈"     component={HomeScreen}   />
        <Tab.Screen name="채팅"   component={ChatScreen}   />
        <Tab.Screen name="내정보" component={MyInfoScreen} />
      </Tab.Navigator>

      {/* 수신 매칭 요청 모달 */}
      {incomingRequest && (
        <IncomingMatchModal
          request={incomingRequest}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
    </>
  );
}

export default function RootNavigator() {
  const isLoggedIn = useStore(s => s.isLoggedIn);
  return (
    <NavigationContainer ref={navRef}>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn
          ? <Root.Screen name="App"        component={AppTabs} />
          : <Root.Screen name="Onboarding" component={OnboardingScreen} />
        }
      </Root.Navigator>
    </NavigationContainer>
  );
}
