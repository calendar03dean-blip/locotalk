import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Keyboard, Platform, Alert, AppState, AppStateStatus, Share, Image as RNImage,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Notifications from 'expo-notifications';
import { useStore } from '../store';
import { setChatFocused } from '../services/notifications';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { LT } from '../constants/lt';
import { findInterest, interestLabel } from '../constants/data';
import { useT, useLang, translate } from '../i18n';
import { regionIconId } from '../constants/regions';
import NickAvatar from '../components/NickAvatar';
import RegionIcon from '../components/RegionIcon';
import { connectSocket, getSocket } from '../services/socket';

interface Message {
  id: string; text: string; mine: boolean; time: string; isNotice?: boolean;
  status?: 'sent' | 'failed';
  imageData?: string;   // base64 이미지
  imgWidth?: number;
  imgHeight?: number;
  read?: boolean;       // 상대방 읽음 여부
}
const AUTOS_KO = ['안녕하세요! 반가워요 😊','네 맞아요!','좋아요~ 같이 해봐요!','저도 그 근처예요','오늘 날씨 너무 좋네요'];
const AUTOS_EN = ["Hello! Nice to meet you 😊", "Yeah, that's right!", "Sounds great, let's do it!", "I'm near there too", "The weather is so nice today"];

/** Korean keyword → context-aware quick replies */
function getQuickRepliesKo(m: string): string[] {
  if (!m)                                              return ['안녕하세요 😊', '어디세요?', '같이 해요!', '조금 늦어요'];
  if (/안녕|반가|하이|처음/.test(m))                  return ['안녕하세요 😊', '반가워요!', '잘 부탁해요', '저도 반가워요'];
  if (/어디|근처|동네|지역|어느/.test(m))              return ['합정 근처요', '홍대예요', '마포구요', '이동 중이에요'];
  if (/같이|함께|할래|할 사람|모집/.test(m))           return ['좋아요!', '언제요?', '어디서요?', '저도 할게요!'];
  if (/커피|카페|아메리|라떼|에스프레소/.test(m))      return ['어떤 카페요?', '같이 가요!', '추천해줘요 ☕', '저도 커피 좋아요'];
  if (/러닝|달리|뛰|조깅|한강|km/.test(m))            return ['같이 뛰어요!', '몇 km요?', '한강이요?', '저도 달려요!'];
  if (/맛집|밥|먹|음식|식당|점심|저녁|배고/.test(m))  return ['어디요?', '같이 가요!', '추천해줘요', '저도 배고파요 😋'];
  if (/책|독서|읽|도서관|서점/.test(m))               return ['무슨 책요?', '저도 좋아해요!', '같이 읽어요', '추천해줘요'];
  if (/날씨|덥|춥|비|맑|좋네|추워|더워/.test(m))      return ['그러게요!', '오늘 좋죠?', '저도 그래요', '조심하세요'];
  if (/언제|몇시|오늘|내일|주말|시간/.test(m))         return ['오늘이요!', '주말 어때요?', '저녁에요', '지금 가능해요'];
  if (/좋아|맞아|그래|맞죠|동의|완전/.test(m))         return ['저도요!', '맞아요!', '그렇죠?', '완전 동의해요'];
  if (/늦|기다|잠깐|조금만|잠시/.test(m))             return ['괜찮아요!', '천천히요 😊', '기다릴게요', '얼마나요?'];
  if (/감사|고마|고맙|감동/.test(m))                  return ['천만에요!', '별말씀을요 😊', '저도요!', '같이해요'];
  if (/헬스|운동|gym|바벨|프레스/.test(m))            return ['어느 헬스장요?', '같이 해요!', '몇 시에요?', '저도 운동해요'];
  if (/등산|산|트레킹|하이킹/.test(m))                return ['어느 산요?', '같이 가요!', '코스 추천요?', '저도 좋아해요'];
  if (/사진|카메라|찍|포토/.test(m))                  return ['어디서요?', '같이 찍어요!', '잘 찍어요?', '피사체 돼드려요 😄'];
  if (/게임|플레이|온라인/.test(m))                   return ['뭐 하세요?', '같이 해요!', '어떤 게임요?', '저도 좋아해요'];
  return ['네!', '좋아요!', '그렇군요 😊', '더 얘기해요'];
}

/** English keyword → context-aware quick replies */
function getQuickRepliesEn(m: string): string[] {
  if (!m)                                              return ['Hey! 😊', 'Where are you?', "Let's do it!", 'Running a bit late'];
  const lm = m.toLowerCase();
  if (/hi|hello|hey|nice to meet|first time/.test(lm)) return ['Hey there! 😊', 'Nice to meet you!', 'Great to chat!', 'Same here!'];
  if (/where|area|neighborhood|location|which/.test(lm)) return ['Near Hapjeong', 'Near Hongdae', 'In Mapo-gu', 'On my way'];
  if (/together|join|anyone|want to|looking for/.test(lm)) return ['Sounds good!', 'When?', 'Where at?', "I'm in!"];
  if (/coffee|cafe|latte|espresso|cappuccino/.test(lm)) return ['Which café?', "Let's go!", 'Recommend one ☕', 'I love coffee too'];
  if (/run|jog|running|km|river/.test(lm))            return ["Let's run!", 'How many km?', 'Han River?', 'I run too!'];
  if (/food|eat|restaurant|lunch|dinner|hungry/.test(lm)) return ['Where?', "Let's go!", 'Recommend it!', "I'm hungry too 😋"];
  if (/book|read|library|bookstore/.test(lm))          return ['What book?', 'I like it too!', "Let's read together", 'Recommend one!'];
  if (/weather|hot|cold|rain|sunny|nice day/.test(lm)) return ['Right?', 'Lovely today!', 'Same here', 'Take care!'];
  if (/when|what time|today|tomorrow|weekend/.test(lm)) return ['Today!', 'This weekend?', 'In the evening', 'Available now'];
  if (/agree|same|right|exactly|totally/.test(lm))    return ['Same here!', 'Totally!', 'Exactly!', 'Agreed!'];
  if (/wait|later|hold on|just a sec/.test(lm))       return ["No worries!", 'Take your time 😊', "I'll wait", 'How long?'];
  if (/thanks|thank you|appreciate|grateful/.test(lm)) return ['Of course!', 'No problem 😊', 'Same to you!', "Let's hang!"];
  if (/gym|workout|exercise|weights|fitness/.test(lm)) return ['Which gym?', "Let's work out!", 'What time?', 'I work out too'];
  if (/hike|mountain|trail|trekking/.test(lm))        return ['Which mountain?', "Let's go!", 'Trail rec?', 'I love hiking too'];
  if (/photo|camera|shoot|picture/.test(lm))          return ['Where?', "Let's take pics!", 'Good at it?', "I'll be your subject 😄"];
  if (/game|gaming|play|online/.test(lm))             return ['What are you playing?', "Let's play!", 'Which game?', 'I love gaming too'];
  return ['Yes!', 'Sounds good!', "I see 😊", "Let's chat more"];
}

/** Returns context-aware quick replies based on the last message and current language */
function getQuickReplies(lastMsg: string, lang: 'ko' | 'en'): string[] {
  return lang === 'en' ? getQuickRepliesEn(lastMsg) : getQuickRepliesKo(lastMsg);
}
const SW = 1.8;

function timeStr(lang: 'ko' | 'en' = 'ko') {
  const d  = new Date();
  const h  = d.getHours();
  const m  = String(d.getMinutes()).padStart(2, '0');
  const hh = ((h + 11) % 12) + 1;
  if (lang === 'en') {
    const ap = h < 12 ? 'AM' : 'PM';
    return `${hh}:${m} ${ap}`;
  }
  const ap = h < 12 ? '오전' : '오후';
  return `${ap} ${hh}:${m}`;
}

// ─── Icon helpers ─────────────────────────────────────────────────
function IcoArrowLeft({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoSend({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5M5 12l7-7 7 7" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoMore({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={5}  r={1.2} fill={color} />
      <Circle cx={12} cy={12} r={1.2} fill={color} />
      <Circle cx={12} cy={19} r={1.2} fill={color} />
    </Svg>
  );
}
function IcoLeave({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoBlock({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={SW} />
      <Path d="M5.6 5.6l12.8 12.8" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}
function IcoSparkles({ color }: { color: string }) {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z"
        stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const INIT_MESSAGES = (noSaveText: string): Message[] => [
  { id: '0', text: noSaveText, mine: false, time: '', isNotice: true },
];

/** 로컬 푸시 알림 — 채팅 화면 밖에 있거나 앱이 백그라운드일 때 */
async function scheduleLocalNotif(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: null, // 즉시
    });
  } catch { /* 권한 없으면 무시 */ }
}

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const isFocused  = useIsFocused();
  const { user, peer, setPeer, setRoomId, blockUser, isPremium } = useStore();
  const t    = useT();
  const lang = useLang();

  const [messages,    setMessages]    = useState<Message[]>(() => {
    const { lang: initLang } = useStore.getState();
    return INIT_MESSAGES(translate('chat_notice_no_save', initLang));
  });
  const [input,       setInput]       = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [lastPeerMsg, setLastPeerMsg] = useState('');
  const [peerGone,    setPeerGone]    = useState(false);
  const [isOffline,   setIsOffline]   = useState(false);

  const listRef      = useRef<FlatList>(null);
  const prevRoomId   = useRef<string | null>(peer?.roomId ?? null);
  const appStateRef  = useRef<AppStateStatus>(AppState.currentState);
  const isFocusedRef = useRef(isFocused);

  // isFocused ref 동기화 + 알림 배너 제어
  // 화면이 꺼지면(AppState → background) 채팅 포커스 해제 → 알림 배너 허용
  useEffect(() => {
    isFocusedRef.current = isFocused;
    setChatFocused(isFocused && AppState.currentState === 'active');

    const appSub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      setChatFocused(isFocused && nextState === 'active');
    });

    return () => {
      appSub.remove();
      setChatFocused(false);
    };
  }, [isFocused]);

  // 키보드가 열리면 KeyboardAvoidingView 가 리스트 높이를 줄이는데, 그 리사이즈가
  // 끝나기 전에 스크롤하면 '줄어들기 전' 바닥으로 가서 마지막 메시지가 가려진다.
  // → 리사이즈가 안정될 시간을 두고 여러 번(0/120/300ms) 끝으로 스크롤(animated:false).
  useEffect(() => {
    const scrollEnd = () => listRef.current?.scrollToEnd({ animated: false });
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      scrollEnd();
      setTimeout(scrollEnd, 120);
      setTimeout(scrollEnd, 300);
    });
    // 키보드 등장 시작 시점에도 한 번 (iOS keyboardWillShow)
    const subWill = Keyboard.addListener('keyboardWillShow', () => setTimeout(scrollEnd, 10));
    return () => { sub.remove(); subWill.remove(); };
  }, []);

  // 채팅 화면이 포커스(active)일 때, 받은 상대 메시지를 읽음 처리해 상대에게 '읽음' 전송.
  // (수신 즉시 처리 외에, 다른 탭에 있다가 들어온 경우까지 커버)
  useEffect(() => {
    if (!isFocused || AppState.currentState !== 'active' || !peer?.roomId) return;
    const socket = getSocket();
    if (!socket?.connected) return;
    messages.forEach(m => {
      if (!m.mine && !m.isNotice) {
        socket.emit('read_message', { roomId: peer.roomId, messageId: m.id });
      }
    });
  }, [isFocused, messages, peer?.roomId]);

  // ── 새 매칭 시작 → 대화 내역 초기화 + 프리미엄 히스토리 로드 ──
  useEffect(() => {
    if (!peer) { prevRoomId.current = null; return; }
    if (peer.roomId !== prevRoomId.current) {
      prevRoomId.current = peer.roomId;
      setMessages(INIT_MESSAGES(translate('chat_notice_no_save', useStore.getState().lang)));
      setLastPeerMsg('');
      setInput('');
      setMenuVisible(false);
      setPeerGone(false);
      setIsOffline(peer.roomId.startsWith('room-local-'));

      // 프리미엄: 이전 대화 히스토리 요청
      if (isPremium && !peer.roomId.startsWith('room-local-')) {
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit('get_chat_history', { roomId: peer.roomId });
        }
      }
    }
  }, [peer?.roomId]);

  // ── Feature 3: 앱 상태 변화 → 포그라운드 복귀 시 소켓 재연결 ──
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev !== 'active' && nextState === 'active' && peer?.roomId && !isOffline) {
        const socket = getSocket();
        const doRejoin = (s: ReturnType<typeof getSocket>) => {
          s?.emit('rejoin_room', { roomId: peer.roomId, nick: user?.nickname });
        };

        if (!socket || !socket.connected) {
          const newSocket = connectSocket();
          newSocket.once('connect', () => doRejoin(newSocket));
        } else {
          doRejoin(socket);
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [peer?.roomId, isOffline, user?.nickname]);

  // ── 소켓 이벤트 연결 ────────────────────────────────────────────
  useEffect(() => {
    if (!peer || isOffline) return;

    const socket = getSocket();
    if (!socket) return;

    const addNotice = (text: string) =>
      setMessages(p => [...p, { id: Date.now().toString(), text, mine: false, time: '', isNotice: true }]);

    // 소켓이 조용히 재연결되면(네트워크 끊김 등 AppState 변화 없는 경우) socket.id 가
    // 바뀌어 서버 방 멤버십이 stale 해집니다 → 재연결 즉시 rejoin_room 으로 재바인딩.
    // (서버에도 send 시 self-heal 이 있지만, 읽음·수신 이벤트까지 즉시 복구하려면 필요)
    const onReconnect = () => {
      if (peer?.roomId) socket.emit('rejoin_room', { roomId: peer.roomId, nick: user?.nickname });
    };

    const onReceiveMessage = ({ id, text, time }: { id: string; text: string; time: string }) => {
      // rejoin 재전송분 중복 방지 — 이미 있는 id면 무시
      setMessages(p => p.some(m => m.id === id) ? p : [...p, { id, text, mine: false, time }]);
      setLastPeerMsg(text);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      // 채팅 화면 포커스 중이면 즉시 읽음 처리
      if (isFocusedRef.current && peer?.roomId) {
        socket.emit('read_message', { roomId: peer.roomId, messageId: id });
      }

      // Feature 2: 채팅 탭이 포커스 없거나 앱이 백그라운드이면 로컬 알림
      if (!isFocusedRef.current || appStateRef.current !== 'active') {
        scheduleLocalNotif(peer.nick || '이웃', text);
      }
    };

    const onPeerLeft = () => {
      addNotice(translate('chat_peer_left', useStore.getState().lang));
      setPeerGone(true);
    };

    // 화면 꺼짐·백그라운드로 인한 소켓 단절 — 정상 상황이므로 UI 표시 안 함.
    // 상대가 화면을 다시 켜면 자동 재연결되고 채팅이 이어집니다.
    const onPeerTemporarilyDisconnected = () => {
      // 의도적으로 아무것도 표시하지 않음
    };

    // 재연결 성공 — 위에서 메시지를 안 띄웠으므로 여기서도 생략
    const onPeerReconnected = () => {
      setPeerGone(false);
    };

    // 최종 연결 끊김 (30분 grace period 만료 → 방 삭제됨)
    const onPeerDisconnected = () => {
      addNotice(translate('chat_peer_long_gone', useStore.getState().lang));
      setPeerGone(true);
    };

    // 프리미엄 채팅 히스토리 수신
    const onChatHistory = ({ messages: history }: { messages: Array<{id:string;senderNick:string;text:string;time:string}> }) => {
      if (!history?.length) return;
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const historyMsgs = history.map(m => ({
          id  : m.id,
          text: m.text,
          mine: m.senderNick === user?.nickname,
          time: m.time,
        })).filter(m => !existingIds.has(m.id));
        return historyMsgs.length > 0
          ? [prev[0], ...historyMsgs, ...prev.slice(1)] // 공지 다음에 히스토리 삽입
          : prev;
      });
    };

    socket.on('receive_message',              onReceiveMessage);
    socket.on('peer_left',                    onPeerLeft);
    socket.on('peer_temporarily_disconnected', onPeerTemporarilyDisconnected);
    socket.on('peer_reconnected',             onPeerReconnected);
    socket.on('peer_disconnected',            onPeerDisconnected);
    // ── 읽음 확인 ──────────────────────────────────────────────────
    const onMessageRead = ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));
    };

    // ── 이미지 수신 ────────────────────────────────────────────────
    const onReceiveImage = ({ id, imageData, width, height, time }: any) => {
      // rejoin 재전송분 중복 방지 (오프라인 중 받은 이미지가 복귀 시 채팅창에 나타남)
      setMessages(p => p.some(m => m.id === id) ? p : [...p, { id, text: '', mine: false, time, imageData, imgWidth: width, imgHeight: height }]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      // 채팅 화면 포커스 중이면 즉시 읽음 처리 (이미지도 텍스트와 동일)
      if (isFocusedRef.current && peer?.roomId) {
        socket.emit('read_message', { roomId: peer.roomId, messageId: id });
      }
    };

    socket.on('chat_history',                 onChatHistory);
    socket.on('message_read',                 onMessageRead);
    socket.on('receive_image',                onReceiveImage);
    socket.on('connect',                      onReconnect);

    return () => {
      socket.off('connect',                      onReconnect);
      socket.off('receive_message',              onReceiveMessage);
      socket.off('peer_left',                    onPeerLeft);
      socket.off('peer_temporarily_disconnected', onPeerTemporarilyDisconnected);
      socket.off('peer_reconnected',             onPeerReconnected);
      socket.off('peer_disconnected',            onPeerDisconnected);
      socket.off('chat_history',                 onChatHistory);
      socket.off('message_read',                 onMessageRead);
      socket.off('receive_image',                onReceiveImage);
    };
  }, [peer?.roomId, isOffline]);

  // ── Empty state ─────────────────────────────────────────────────
  if (!peer) {
    return (
      <SafeAreaView style={s.emptySafe} edges={['top']}>
        <View style={s.empty}>
          <View style={s.emptyLogoCircle}>
            <RNImage
              source={require('../../assets/lt-logo-teal.png')}
              style={s.emptyLogoImg}
              resizeMode="contain"
            />
          </View>
          <Text style={s.emptyTitle}>{t('chat_empty_title')}</Text>
          <Text style={s.emptyDesc}>{t('chat_empty_desc')}</Text>
          <TouchableOpacity
            style={s.emptyBtn}
            onPress={() => { navigation.navigate('홈'); useStore.getState().requestAutoMatch(); }}
            activeOpacity={0.85}
          >
            <Text style={s.emptyBtnTxt}>{t('home_match_start')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const send = (text: string, retryMsgId?: string) => {
    if (!text.trim() || peerGone) return;

    const msgId = retryMsgId ?? Date.now().toString();

    if (retryMsgId) {
      // 재시도: 기존 메시지 상태 초기화
      setMessages(p => p.map(m => m.id === retryMsgId ? { ...m, status: 'sent' as const, time: timeStr(lang) } : m));
    } else {
      const myMsg: Message = { id: msgId, text: text.trim(), mine: true, time: timeStr(lang), status: 'sent' };
      setMessages(p => [...p, myMsg]);
      setInput('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }

    const socket = getSocket();
    if (!isOffline && socket?.connected && peer?.roomId) {
      socket.emit('send_message', { roomId: peer.roomId, text: text.trim(), clientId: msgId, nick: user?.nickname });
      return;
    }

    if (!isOffline) {
      // 소켓 끊김 → 전송 실패 표시
      setMessages(p => p.map(m => m.id === msgId ? { ...m, status: 'failed' as const } : m));
      return;
    }

    // 오프라인 폴백
    setTimeout(() => {
      const autos = lang === 'en' ? AUTOS_EN : AUTOS_KO;
      const reply = autos[Math.floor(Math.random() * autos.length)];
      setMessages(p => [...p, { id: Date.now().toString(), text: reply, mine: false, time: timeStr(lang) }]);
      setLastPeerMsg(reply);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }, 1000 + Math.random() * 800);
  };

  /** 실제 나가기 로직 — leave_room 전송 + standby 복귀 + store 초기화 */
  const doLeave = () => {
    const socket = getSocket();
    if (socket?.connected && peer?.roomId) {
      socket.emit('leave_room', { roomId: peer.roomId });
    }
    const storeState = useStore.getState();
    if (storeState.acceptsChat && storeState.user && socket?.connected) {
      socket.emit('join_standby', {
        nick     : storeState.user.nickname,
        interests: (storeState.user.interests || []).filter(i => i !== 'none'),
        region   : storeState.user.regionGu || '',
      });
    }
    setPeer(null); setRoomId(null);
    navigation.navigate('홈');
  };

  // ── 사진 전송 ────────────────────────────────────────────────────
  const handleSendImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('사진 권한 필요', '사진 접근 권한을 허용해주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    let uri = asset.uri;
    let w = asset.width || 1024;
    let h = asset.height || 1024;

    // 1MB 이상이면 자동 압축
    const fileSize = asset.fileSize ?? 0;
    if (fileSize > 1024 * 1024) {
      const scale = Math.sqrt((1024 * 1024) / fileSize);
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: Math.round(w * scale), height: Math.round(h * scale) } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      uri = compressed.uri;
      w = compressed.width ?? w;
      h = compressed.height ?? h;
      // base64 직접 전송
      const socket = getSocket();
      if (socket?.connected && peer?.roomId) {
        const msgId = Date.now().toString();
        socket.emit('send_image', { roomId: peer.roomId, imageData: `data:image/jpeg;base64,${compressed.base64}`, width: w, height: h, clientId: msgId, nick: user?.nickname });
        setMessages(p => [...p, { id: msgId, text: '', mine: true, time: '', imageData: uri, imgWidth: w, imgHeight: h }]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      }
      return;
    }

    // 1MB 미만: 파일 읽어서 base64 전송
    const fileContent = await fetch(uri);
    const blob = await fileContent.blob();
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const socket = getSocket();
      if (socket?.connected && peer?.roomId) {
        const msgId = Date.now().toString();
        socket.emit('send_image', { roomId: peer.roomId, imageData: base64, width: w, height: h, clientId: msgId, nick: user?.nickname });
        setMessages(p => [...p, { id: msgId, text: '', mine: true, time: '', imageData: uri, imgWidth: w, imgHeight: h }]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      }
    };
    reader.readAsDataURL(blob);
  };

  const handleLeave = () => {
    Alert.alert(t('chat_leave_title'), t('chat_leave_msg'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('chat_leave_confirm'), style: 'destructive', onPress: doLeave },
    ]);
  };

  const handleBlock = () => {
    setMenuVisible(false);
    Alert.alert(t('chat_block_title'), t('chat_block_msg', { nick: peer?.nick || '' }), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('chat_block_confirm'), style: 'destructive', onPress: () => {
        if (peer) blockUser(peer.nick);
        doLeave();
      }},
    ]);
  };

  const handleReport = () => {
    setMenuVisible(false);
    Alert.alert(
      '신고',
      `${peer?.nick || '이 유저'}를 신고하시겠어요?\n신고된 내용은 검토 후 처리됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '욕설/비방',
          onPress: () => submitReport('욕설/비방'),
        },
        {
          text: '불쾌한 내용',
          style: 'destructive',
          onPress: () => submitReport('불쾌한 내용'),
        },
      ],
    );
  };

  const submitReport = (reason: string) => {
    // 서버에 신고 전송
    const socket = getSocket();
    if (socket?.connected && peer?.roomId) {
      socket.emit('report_user', {
        reportedNick: peer.nick,
        roomId      : peer.roomId,
        reason,
        reporterNick: user?.nickname || '익명',
      });
    }
    // 신고 후 차단 + 나가기
    if (peer) blockUser(peer.nick);
    Alert.alert('신고 완료', '신고가 접수됐어요. 검토 후 조치합니다.', [
      { text: '확인', onPress: doLeave },
    ]);
  };

  // 상대가 이미 나간 상태(peerGone)에서 뒤로 가기 → 확인 없이 바로 나가기
  // 상대가 아직 있는 상태 → 홈으로만 이동 (방은 유지, 재매칭 방지)
  const handleBack = () => {
    if (peerGone) {
      doLeave();
    } else {
      navigation.navigate('홈');
    }
  };
  const peerInts = (peer.interests || [])
    .filter(i => i !== 'none')
    .map(id => findInterest(id))
    .filter(Boolean);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
          <IcoArrowLeft color={Colors.dark} />
        </TouchableOpacity>

        <View style={s.peerRow}>
          <NickAvatar nick={peer?.nick || '?'} size={36} />
          <View style={{ marginLeft: 8 }}>
            {/* 닉네임 + 인증배지 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={s.peerName}>{peer?.nick || t('chat_anon')}</Text>
              {peer?.isVerified && (
                <View style={s.verifiedChip}>
                  <Text style={s.verifiedChipTxt}>✓ 인증</Text>
                </View>
              )}
            </View>
            <View style={s.peerSubRow}>
              <RegionIcon id={regionIconId(peer?.region || '')} size={11} color={Colors.g3} />
              <Text style={s.peerSub}>
                {peer?.region || t('chat_region_unknown')}{peerInts.length > 0 ? ` · ${peerInts.map(i => interestLabel(i!, lang)).join(' · ')}` : ''}
              </Text>
            </View>
            {/* 프리미엄 전용: 거리 + 성별/생년 */}
            {isPremium && (
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {peer?.distanceKm != null && (
                  <View style={s.distanceBadge}>
                    <Text style={s.distanceTxt}>📍 {peer.distanceKm}km</Text>
                  </View>
                )}
                {peer?.gender && (
                  <View style={s.distanceBadge}>
                    <Text style={s.distanceTxt}>{peer.gender === 'male' ? '👤 남성' : '👤 여성'}</Text>
                  </View>
                )}
                {peer?.birthYear && (
                  <View style={s.distanceBadge}>
                    <Text style={s.distanceTxt}>🎂 {peer.birthYear}년생</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn} onPress={() => setMenuVisible(true)}>
            <IcoMore color={Colors.g4} />
          </TouchableOpacity>
          <TouchableOpacity style={s.leaveBtn} onPress={handleLeave}>
            <IcoLeave color="#EF4444" />
            <Text style={s.leaveTxt}>{t('chat_leave_btn')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── Messages ─────────────────────────────────── */}
        <FlatList
          ref={listRef}
          style={s.list}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={s.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            if (item.isNotice) {
              return (
                <View style={s.notice}>
                  <Text style={s.noticeTxt}>{item.text}</Text>
                </View>
              );
            }
            return (
              <View style={[s.msgRow, item.mine && s.msgRowMine]}>
                {!item.mine && (
                  <NickAvatar nick={peer?.nick || '?'} size={28}
                    style={{ marginRight: 6, alignSelf: 'flex-end' }} />
                )}
                <View style={item.mine ? s.bubbleColMine : s.bubbleColPeer}>
                  <View style={[s.bubble, item.mine ? s.bubbleMine : s.bubblePeer,
                    item.status === 'failed' && s.bubbleFailed,
                    !!item.imageData && s.bubbleImg]}>
                    {item.imageData ? (
                      <RNImage
                        source={{ uri: item.imageData }}
                        style={{ width: 200, height: 200 * ((item.imgHeight||1) / (item.imgWidth||1)), borderRadius: 10 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={[s.bubbleTxt, item.mine && s.bubbleTxtMine]}>{item.text}</Text>
                    )}
                  </View>
                  {item.mine && item.status === 'failed' && (
                    <TouchableOpacity style={s.retryBtn} onPress={() => send(item.text, item.id)} activeOpacity={0.7}>
                      <Text style={s.retryTxt}>{t('chat_send_failed')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {/* 시간 + 읽음 표시 (버블 바깥 하단) */}
                <View style={item.mine ? s.timeReadRowMine : s.timeReadRow}>
                  {item.mine && (
                    <Text style={item.read ? s.readDone : s.readPending}>✓</Text>
                  )}
                  <Text style={[s.timeStr, item.mine && s.timeStrMine]}>{item.time}</Text>
                </View>
              </View>
            );
          }}
        />

        {/* ── Quick replies ─────────────────────────────── */}
        <View style={s.quickRow}>
          {getQuickReplies(lastPeerMsg, lang).map(q => (
            <TouchableOpacity key={q} style={s.quickChip} onPress={() => send(q)}>
              <Text style={s.quickTxt}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Input bar ────────────────────────────────── */}
        <View style={[s.inputBar, peerGone && s.inputBarGone]}>
          {/* 사진 버튼 */}
          <TouchableOpacity style={s.photoBtn} onPress={handleSendImage} disabled={peerGone}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
                stroke={peerGone ? Colors.g3 : Colors.g4} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
              <Circle cx="12" cy="13" r="4" stroke={peerGone ? Colors.g3 : Colors.g4} strokeWidth={1.8}/>
            </Svg>
          </TouchableOpacity>
          <TextInput
            style={s.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={peerGone ? t('chat_input_placeholder_gone') : t('chat_input_placeholder')}
            placeholderTextColor={Colors.g3}
            multiline maxLength={300}
            editable={!peerGone}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || peerGone) && s.sendBtnOff]}
            onPress={() => send(input)}
            disabled={!input.trim() || peerGone}
          >
            <IcoSend color={(input.trim() && !peerGone) ? '#fff' : Colors.g3} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Menu sheet ───────────────────────────────────── */}
      {menuVisible && (
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={s.menuSheet}>
            <View style={s.handle} />

            {/* 프리미엄 채팅 내보내기 */}
            {isPremium && (
              <TouchableOpacity style={s.menuItem} onPress={() => {
                setMenuVisible(false);
                const chatText = messages
                  .filter(m => !m.isNotice)
                  .map(m => `[${m.time}] ${m.mine ? user?.nickname : peer?.nick}: ${m.text}`)
                  .join('\n');
                Alert.alert('채팅 내보내기', chatText.length > 0 ? `총 ${messages.filter(m=>!m.isNotice).length}개 메시지\n\n(클립보드에 복사됩니다)` : '대화 내역이 없어요', [
                  { text: '취소', style: 'cancel' },
                  { text: '내보내기', onPress: () => {
                    Share.share({ message: chatText, title: 'Locotalk 채팅 내보내기' });
                  }},
                ]);
              }}>
                <View style={s.menuItemInner}>
                  <Text style={{ fontSize: 15 }}>💾</Text>
                  <Text style={s.menuItemNormal}>채팅 내보내기 (프리미엄)</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.menuItem} onPress={handleReport}>
              <View style={s.menuItemInner}>
                <Text style={{ fontSize: 15 }}>🚨</Text>
                <Text style={s.menuItemDanger}>신고하기</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={s.menuItem} onPress={handleBlock}>
              <View style={s.menuItemInner}>
                <IcoBlock color="#EF4444" />
                <Text style={s.menuItemDanger}>{t('chat_block_menu', { nick: peer?.nick || '' })}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuVisible(false); handleLeave(); }}>
              <View style={s.menuItemInner}>
                <IcoLeave color="#EF4444" />
                <Text style={s.menuItemDanger}>{t('chat_leave_menu')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[s.menuItem, { borderBottomWidth: 0, marginTop: 8 }]}
              onPress={() => setMenuVisible(false)}>
              <View style={s.menuItemInner}>
                <Text style={s.menuItemNormal}>{t('chat_menu_cancel')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  emptySafe:   { flex: 1, backgroundColor: LT.bg },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8, backgroundColor: LT.bg },
  emptyLogoCircle: { width: 104, height: 104, borderRadius: 52, backgroundColor: LT.brandTint, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyLogoImg:{ width: 58, height: 58 },
  emptyIcon:   { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.g1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle:  { fontSize: 21, fontWeight: '800', color: LT.label, textAlign: 'center', letterSpacing: -0.4 },
  emptyDesc:   { fontSize: 14.5, color: LT.label3, textAlign: 'center', lineHeight: 22 },
  emptyBtn:    { marginTop: 18, backgroundColor: LT.brand, borderRadius: Radius.pill, height: 54, justifyContent: 'center', paddingHorizontal: 30 },
  emptyBtnTxt: { fontSize: 16, fontWeight: '800', color: LT.brandOn },

  header:        { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.sf, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.separator, gap: 6 },
  backBtn:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  peerRow:       { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  peerName:      { fontSize: Typography.footnote, fontWeight: '800', color: Colors.dark },
  peerSubRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  peerSub:       { fontSize: Typography.caption2, color: Colors.g3 },
  distanceBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 3, backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  distanceTxt:   { fontSize: 11, color: LT.brandStrong, fontWeight: '600' },
  verifiedChip:  { backgroundColor: LT.brand, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  verifiedChipTxt: { fontSize: 10, color: '#fff', fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  iconBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.g1, alignItems: 'center', justifyContent: 'center' },
  leaveBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: Radius.pill, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  leaveTxt:      { fontSize: Typography.caption1, fontWeight: '700', color: '#EF4444' },

  list:          { flex: 1 },
  msgList:       { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: 36, gap: 8 },
  notice:        { alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: Radius.pill, paddingVertical: 5, paddingHorizontal: 14, marginVertical: 4 },
  noticeTxt:     { fontSize: 11, color: Colors.g4 },
  msgRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  msgRowMine:    { flexDirection: 'row-reverse' },
  bubbleColMine: { alignItems: 'flex-end', maxWidth: '72%' },
  bubbleColPeer: { alignItems: 'flex-start', maxWidth: '72%' },
  bubble:        { borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 },
  bubblePeer:    { backgroundColor: Colors.sf, borderWidth: 0.5, borderColor: Colors.separator, borderBottomLeftRadius: 4 },
  bubbleMine:    { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleImg:     { padding: 4, backgroundColor: 'transparent' },
  readReceipt:     { fontSize: 10, color: Colors.primary, fontWeight: '600', marginTop: 2, alignSelf: 'flex-end' },
  readReceiptSent: { color: Colors.g3 },
  photoBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  bubbleFailed:  { backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)' },
  bubbleTxt:     { fontSize: Typography.footnote, color: Colors.dark, lineHeight: 20 },
  bubbleTxtMine: { color: '#fff' },
  retryBtn:      { marginTop: 4, paddingVertical: 2, paddingHorizontal: 6 },
  retryTxt:      { fontSize: 11, color: '#EF4444', fontWeight: '600' },
  timeStr:       { fontSize: 10, color: Colors.g3, marginLeft: 4, alignSelf: 'flex-end', marginBottom: 2 },
  timeStrMine:   { marginLeft: 0, marginRight: 4 },
  timeReadRow:     { flexDirection: 'row', alignItems: 'flex-end', marginLeft: 4 },
  timeReadRowMine: { flexDirection: 'row', alignItems: 'flex-end', marginRight: 4, justifyContent: 'flex-end' },
  readDone:    { fontSize: 11, color: Colors.primary, fontWeight: '700', marginRight: 2, marginBottom: 2 },
  readPending: { fontSize: 11, color: Colors.g3,      fontWeight: '600', marginRight: 2, marginBottom: 2 },

  quickRow:  { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 8, backgroundColor: Colors.sf, borderTopWidth: 0.5, borderTopColor: Colors.separator },
  quickChip: { backgroundColor: Colors.g1, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.g2 },
  quickTxt:  { fontSize: 11, fontWeight: '600', color: Colors.dark },

  inputBar:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: Spacing.md, paddingBottom: 24, backgroundColor: Colors.sf, borderTopWidth: 0.5, borderTopColor: Colors.separator },
  inputBarGone: { opacity: 0.5 },
  textInput:    { flex: 1, borderWidth: 1, borderColor: Colors.separator, borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 14, fontSize: Typography.footnote, color: Colors.dark, backgroundColor: Colors.g1, maxHeight: 96 },
  sendBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: LT.brand, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff:   { backgroundColor: Colors.g2 },

  overlay:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  menuSheet:      { backgroundColor: Colors.sf, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: Spacing.lg, paddingBottom: 36, paddingTop: 12 },
  handle:         { width: 36, height: 4, backgroundColor: Colors.g2, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  menuItem:       { borderBottomWidth: 0.5, borderBottomColor: Colors.separator },
  menuItemInner:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  menuItemDanger: { fontSize: Typography.body, fontWeight: '600', color: '#EF4444' },
  menuItemNormal: { fontSize: Typography.body, fontWeight: '600', color: Colors.g4, textAlign: 'center' },
});
