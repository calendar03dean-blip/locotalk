/**
 * Locotalk — Realtime Matching & Relay Server
 * Stack : Express + Socket.io (in-memory, no DB)
 * Port  : 4000
 *
 * Socket Events (client → server)
 *   join_queue          { nick, interests, region }
 *   leave_queue
 *   join_standby        { nick, interests, region }   ← 채팅 받기 ON
 *   leave_standby
 *   accept_match        { requestId }
 *   decline_match       { requestId }
 *   send_message        { roomId, text }
 *   leave_room          { roomId }
 *   rejoin_room         { roomId }                    ← 포그라운드 복귀
 *   register_push_token { token, nick }               ← 푸시 토큰 등록
 *
 * Socket Events (server → client)
 *   queue_joined        { position }
 *   match_found         { roomId, peer }              ← 능동 매칭 완료
 *   passive_match_found { roomId, peer }              ← 수동 매칭 완료
 *   match_request       { requestId, fromNick, fromInterest, fromRegion }
 *   receive_message     { id, text, time }
 *   peer_left
 *   peer_disconnected
 *   peer_reconnected
 *   error               { message }
 */
'use strict';

const express        = require('express');
const http           = require('http');
const { Server }     = require('socket.io');
const cors           = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs             = require('fs');
const path           = require('path');
const { Resend }     = require('resend');

// ─── Resend 이메일 클라이언트 ─────────────────────────────────────────
const resend = new Resend('re_LKSuS8YL_DgunADwa35vrmcbYttgdGAcw');

// OTP 임시 저장소 (이메일 → { code, expiresAt })
const otpStore = new Map();

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors        : { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout : 60000,
  pingInterval: 25000,
});

app.use(cors());
app.use(express.json());

// ─── 이메일 OTP 발송 ──────────────────────────────────────────────────
app.post('/auth/send-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'email and code required' });

  // OTP 저장 (3분 유효)
  otpStore.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + 3 * 60 * 1000,
  });

  try {
    const { data, error } = await resend.emails.send({
      from   : 'Locotalk <onboarding@resend.dev>',
      to     : [email],
      subject: '[Locotalk] 이메일 인증 코드',
      html   : `
        <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#f9fafb;">
          <div style="background:#40D3B6;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
            <h1 style="color:#fff;font-size:28px;margin:0;font-weight:800;">Locotalk</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">내 동네 이웃과 익명으로 대화해요</p>
          </div>
          <div style="background:#fff;border-radius:16px;padding:32px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <p style="color:#444;font-size:15px;margin:0 0 24px;">아래 인증 코드를 입력해주세요</p>
            <div style="background:#F0FBF9;border-radius:12px;padding:20px;margin-bottom:24px;">
              <span style="font-size:36px;font-weight:800;color:#034A93;letter-spacing:8px;">${code}</span>
            </div>
            <p style="color:#888;font-size:13px;margin:0;">이 코드는 <strong>3분</strong> 후 만료됩니다</p>
            <p style="color:#888;font-size:13px;margin:8px 0 0;">본인이 요청하지 않았다면 이 이메일을 무시하세요</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('[OTP] 이메일 발송 실패:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[OTP] ✅ 발송 완료 → ${email}  id=${data?.id}`);
    res.json({ success: true });
  } catch (e) {
    console.error('[OTP] 예외:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── OTP 검증 ────────────────────────────────────────────────────────
app.post('/auth/verify-otp', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'email and code required' });

  const entry = otpStore.get(email.toLowerCase());
  if (!entry)                       return res.status(400).json({ error: 'otp_not_found' });
  if (Date.now() > entry.expiresAt) return res.status(400).json({ error: 'otp_expired' });
  if (entry.code !== code)          return res.status(400).json({ error: 'otp_invalid' });

  otpStore.delete(email.toLowerCase()); // 사용 후 삭제
  console.log(`[OTP] ✅ 인증 완료 → ${email}`);
  res.json({ success: true });
});

app.get('/health', (_req, res) => {
  res.json({
    status  : 'ok',
    queue   : queue.size,
    standby : standby.size,
    rooms   : rooms.size,
    online  : io.engine.clientsCount,
  });
});

// ─── 디버그 엔드포인트 ────────────────────────────────────────────
// 등록된 토큰 목록 확인
app.get('/debug/tokens', (_req, res) => {
  const tokens = Object.fromEntries(pushTokensByNick);
  res.json({ count: pushTokensByNick.size, tokens });
});

// 특정 닉에게 테스트 push 전송
// 사용: curl -X POST http://localhost:4000/debug/push/닉네임
app.post('/debug/push/:nick', async (req, res) => {
  const { nick } = req.params;
  const token    = pushTokensByNick.get(nick);
  if (!token) {
    return res.status(404).json({ error: `no token for "${nick}"`, registered: [...pushTokensByNick.keys()] });
  }
  try {
    const fetchRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body   : JSON.stringify({
        to              : token,
        title           : '🔔 테스트 알림',
        body            : `${nick}에게 보낸 테스트 메시지입니다`,
        sound           : 'default',
        priority        : 'high',
        _contentAvailable: true,
        channelId       : 'default',
      }),
    });
    const json = await fetchRes.json();
    console.log(`[debug] test push to ${nick}:`, JSON.stringify(json));
    res.json({ token, expoResponse: json });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── In-memory state ──────────────────────────────────────────────
const queue              = new Map(); // socketId → QueueEntry
const standby            = new Map(); // socketId → StandbyEntry
const pendingMatches     = new Map(); // requestId → PendingMatch
const pendingFromSockets = new Set(); // socketIds that sent a pending standby→standby request
const rooms              = new Map(); // roomId → Room
const socketToRoom       = new Map(); // socketId → roomId
const reconnectTimers    = new Map(); // socketId → { timer, roomId }

// ─── 서버단 매칭 히스토리 (재매칭 방지) ──────────────────────────────
// nick → Set<matchedNick>  (세션 내 유지, 서버 재시작 시 초기화)
const serverMatchHistory = new Map();

// ─── 채팅 저장 (프리미엄 전용) ────────────────────────────────────────
// roomId → Message[]  (최대 200개, 서버 재시작 시 초기화)
const chatLogs = new Map();
const MAX_CHAT_LOG = 200;

// ─── 신고 카운트 ──────────────────────────────────────────────────────
// nick → 신고 횟수
const reportCounts = new Map();

/**
 * pushTokensByNick: nick → expoToken
 * 앱 종료 후 소켓이 끊겨도 토큰을 nick 기준으로 유지합니다.
 */
const pushTokensByNick = new Map();

/**
 * regionFeeds: region → FeedItem[]  (최신순, 최대 100개)
 * 새로 접속한 유저에게 동네 피드 히스토리 전송용
 */
const regionFeeds = new Map();

// ─── 서버 재시작 후에도 토큰·피드 유지 (JSON 파일 영속화) ────────────
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  try {
    const raw  = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (data.pushTokens) {
      Object.entries(data.pushTokens).forEach(([nick, token]) =>
        pushTokensByNick.set(nick, token));
    }
    if (data.feeds) {
      Object.entries(data.feeds).forEach(([region, posts]) =>
        regionFeeds.set(region, posts));
    }
    console.log(`[data] ✅ loaded  tokens=${pushTokensByNick.size}  feeds=${regionFeeds.size}`);
  } catch {
    console.log('[data] no saved data — starting fresh');
  }
}

let _savePending = false;
function saveData() {
  if (_savePending) return;
  _savePending = true;
  setTimeout(() => {
    _savePending = false;
    const payload = JSON.stringify({
      pushTokens: Object.fromEntries(pushTokensByNick),
      feeds      : Object.fromEntries(regionFeeds),
    });
    fs.writeFile(DATA_FILE, payload, (err) => {
      if (err) console.warn('[data] save failed', err.message);
    });
  }, 2000); // 2초 디바운스
}

loadData(); // 서버 시작 시 즉시 로드

// ─── Helpers ──────────────────────────────────────────────────────
function koreanTime() {
  return new Date().toLocaleTimeString('ko-KR', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function validate(user) {
  if (!user || typeof user !== 'object')               return '잘못된 데이터예요';
  if (!user.nick || user.nick.length > 8)              return '닉네임이 올바르지 않아요';
  if (!Array.isArray(user.interests))                  return '관심사 형식이 잘못됐어요';
  if (!user.region || typeof user.region !== 'string') return '지역 정보가 없어요';
  return null;
}

/**
 * Haversine 공식으로 두 좌표 간 거리 계산 (km)
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 두 유저가 매칭 가능한 거리인지 확인
 *  - 무료 유저: 6km 이내 (좌표 없으면 같은 구 기준)
 *  - 프리미엄 유저: 거리 제한 없음
 */
const FREE_RADIUS_KM = 6;

function isWithinMatchRange(userA, userB) {
  if (userA.isPremium || userB.isPremium) return true;
  if (userA.lat && userA.lng && userB.lat && userB.lng) {
    const dist = haversineKm(userA.lat, userA.lng, userB.lat, userB.lng);
    return dist <= FREE_RADIUS_KM;
  }
  return userA.region === userB.region;
}

/**
 * 매칭 점수 계산 (0 ~ 100)
 * ─────────────────────────────────────────────────────
 * 공통 관심사 3개 : +45
 * 공통 관심사 2개 : +30
 * 공통 관심사 1개 : +15
 * 같은 구(region) : +20
 * 프리미엄 유저   : +20 (둘 중 하나라도)
 * 대기 시간 보정  : 1분당 +1 (최대 +15 → 15분 대기)
 * 재매칭 페널티   : -30 (이전에 매칭된 적 있으면)
 */
function calcMatchScore(userA, userB) {
  let score = 0;

  // 공통 관심사
  const intA = new Set(userA.interests || []);
  const common = (userB.interests || []).filter(i => intA.has(i)).length;
  score += [0, 15, 30, 45][Math.min(common, 3)];

  // 같은 구
  if (userA.region === userB.region) score += 20;

  // 프리미엄
  if (userA.isPremium || userB.isPremium) score += 20;

  // 대기 시간 보정 (B 기준)
  const waitMin = Math.floor((Date.now() - userB.joinedAt) / 60000);
  score += Math.min(waitMin, 15);

  // 재매칭 페널티
  const histA = serverMatchHistory.get(userA.nick) || new Set();
  const histB = serverMatchHistory.get(userB.nick) || new Set();
  if (histA.has(userB.nick) || histB.has(userA.nick)) score -= 30;

  return score;
}

/** 서버단 매칭 히스토리 기록 */
function recordMatchHistory(nickA, nickB) {
  if (!serverMatchHistory.has(nickA)) serverMatchHistory.set(nickA, new Set());
  if (!serverMatchHistory.has(nickB)) serverMatchHistory.set(nickB, new Set());
  serverMatchHistory.get(nickA).add(nickB);
  serverMatchHistory.get(nickB).add(nickA);
}

/** 공통 Expo Push 발송 — 응답 로깅 포함 */
async function _sendExpoPush(payload, label) {
  try {
    const res    = await fetch('https://exp.host/--/api/v2/push/send', {
      method : 'POST',
      headers: {
        'Content-Type'   : 'application/json',
        'Accept'         : 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(payload),
    });
    const json   = await res.json();
    const result = json?.data;
    if (result?.status === 'error') {
      console.warn(`[push] ❌ ${label}: ${result.message} (${result.details?.error})`);
      return false;
    }
    console.log(`[push] ✅ ${label}  id=${result?.id ?? '?'}`);
    return true;
  } catch (e) {
    console.warn(`[push] ❌ ${label} 전송 실패:`, e.message);
    return false;
  }
}

/** 매칭 요청 push — 앱이 닫혀 있어도 잠금 화면에 알림 */
async function sendMatchRequestPush(toNick, fromNick, fromRegion, requestId) {
  const token = pushTokensByNick.get(toNick);
  if (!token) {
    console.warn(`[push] ⚠️  no token for ${toNick} (match_request) — skipped`);
    return;
  }
  await _sendExpoPush({
    to              : token,
    title           : `${fromNick}님의 채팅 요청`,
    body            : `${fromRegion}의 이웃이 채팅을 요청했어요! 지금 수락하세요 ✨`,
    data            : { type: 'match_request', requestId, fromNick, fromRegion },
    sound           : 'default',
    priority        : 'high',
    _contentAvailable: true,
    channelId       : 'default',
  }, `match_request→${toNick}`);
}

/** 채팅 메시지 push (앱이 종료/백그라운드/화면꺼짐 상태에서도 전달) */
async function sendPushToNick(recipientNick, senderNick, text) {
  const token = pushTokensByNick.get(recipientNick);
  if (!token) {
    console.warn(`[push] ⚠️  no token for ${recipientNick} — push skipped`);
    return;
  }
  await _sendExpoPush({
    to               : token,
    title            : senderNick,
    body             : text.length > 80 ? text.slice(0, 77) + '…' : text,
    data             : { type: 'chat_message' },
    sound            : 'default',
    priority         : 'high',          // iOS 화면꺼짐/백그라운드 즉시 전달
    _contentAvailable: true,            // iOS background wake (앱 깨워서 배지 갱신용)
    channelId        : 'default',       // Android 채널
  }, `chat→${recipientNick}`);
}

/**
 * 방 생성 + 양쪽에 이벤트 전송
 * eventA: 능동 사용자 또는 standby→standby 요청자에게 보낼 이벤트
 * eventB: 수락한 수동 사용자에게 보낼 이벤트
 */
function createRoom(socketA, userA, socketIdB, userB,
                    eventA = 'match_found', eventB = 'passive_match_found') {
  const roomId = 'room-' + uuidv4();

  queue.delete(socketA.id);
  queue.delete(socketIdB);

  const room = {
    roomId,
    sockets  : [socketA.id, socketIdB],
    users    : [userA, userB],
    createdAt: Date.now(),
  };
  rooms.set(roomId, room);
  socketToRoom.set(socketA.id, roomId);
  socketToRoom.set(socketIdB, roomId);

  socketA.join(roomId);
  io.sockets.sockets.get(socketIdB)?.join(roomId);

  // 두 유저 모두 좌표가 있으면 거리 계산 (프리미엄 전용 표시용)
  let distanceKm = null;
  if (userA.lat && userA.lng && userB.lat && userB.lng) {
    distanceKm = Math.round(haversineKm(userA.lat, userA.lng, userB.lat, userB.lng) * 10) / 10;
  }

  const peerForA = { nick: userB.nick, interests: userB.interests, region: userB.region, roomId, distanceKm };
  const peerForB = { nick: userA.nick, interests: userA.interests, region: userA.region, roomId, distanceKm };

  socketA.emit(eventA,       { roomId, peer: peerForA });
  io.to(socketIdB).emit(eventB, { roomId, peer: peerForB });

  // 서버단 매칭 히스토리 기록
  recordMatchHistory(userA.nick, userB.nick);

  // 채팅 로그 초기화 (프리미엄 유저 있으면 저장 활성)
  const hasPremium = userA.isPremium || userB.isPremium;
  if (hasPremium) {
    chatLogs.set(roomId, []);
  }

  console.log(`[match] ${userA.nick} ↔ ${userB.nick}  room=${roomId}  premium=${hasPremium}  [${eventA}/${eventB}]`);
  return true;
}

/**
 * queue → queue 매칭 (능동 사용자끼리)
 * 바로 방을 만들지 않고 match_request 흐름을 거쳐야
 * 상대가 오프라인이어도 push 알림이 가고, 수락 후 채팅이 시작됩니다.
 */
function tryMatch(socket, user) {
  const candidates = [...queue.entries()].filter(([id]) => id !== socket.id);
  if (candidates.length === 0) return false;

  // 1. 거리 필터
  const inRange = candidates.filter(([, c]) => isWithinMatchRange(user, c));
  if (inRange.length === 0) return false;

  // 2. 차단 유저 서버단 제외
  const blockedByA = new Set(user.blockedUsers || []);
  const eligible = inRange.filter(([, c]) => {
    const blockedByC = new Set(c.blockedUsers || []);
    return !blockedByA.has(c.nick) && !blockedByC.has(user.nick);
  });
  if (eligible.length === 0) return false;

  // 3. 매칭 점수 계산 후 내림차순 정렬
  const scored = eligible.map(([id, c]) => ({
    id, candidate: c,
    score: calcMatchScore(user, c),
  }));
  scored.sort((a, b) => b.score - a.score);

  const { id: candidateId, candidate, score: matchScore } = scored[0];
  const commonInts = (user.interests||[]).filter(i => (candidate.interests||[]).includes(i));
  console.log(`[match] 🎯 ${user.nick}↔${candidate.nick}  score=${matchScore}  공통관심사=[${commonInts.join(',')||'없음'}]`);

  const requestId      = uuidv4();
  const PENDING_TIMEOUT = 60 * 1000; // 60초 — 앱 재시작 후 수락 허용

  const timer = setTimeout(() => {
    pendingMatches.delete(requestId);
    pendingFromSockets.delete(socket.id);
    // 타임아웃 시 둘 다 큐로 복귀
    if (!socketToRoom.has(socket.id))    queue.set(socket.id,    { ...user,      joinedAt: Date.now() });
    if (!socketToRoom.has(candidateId))  queue.set(candidateId,  { ...candidate, joinedAt: Date.now() });
    console.log(`[queue] ⏱ request ${requestId} timed out, both returned to queue`);
  }, PENDING_TIMEOUT);

  pendingMatches.set(requestId, {
    requestId,
    fromSocketId: socket.id,
    toSocketId  : candidateId,
    fromUser    : user,
    toUser      : candidate,
    timer,
    fromPassive : false,
    toFromQueue : true,   // 수락자도 queue 출신
  });

  pendingFromSockets.add(socket.id);
  queue.delete(socket.id);    // 대기 중엔 queue 에서 제거 (pendingFromSockets 상태)
  queue.delete(candidateId);  // 수락 대기자도 queue 에서 제거

  io.to(candidateId).emit('match_request', {
    requestId,
    fromNick    : user.nick,
    fromInterest: user.interests?.[0] || '',
    fromRegion  : user.region,
  });
  sendMatchRequestPush(candidate.nick, user.nick, user.region, requestId);

  console.log(`[queue] 📨 ${user.nick} → ${candidate.nick}  req=${requestId}  queue↔queue`);
  return true;
}

/**
 * queue/standby → standby 매칭 요청
 * fromPassive=true 이면 요청자도 passive_match_found 를 받음 (standby→standby)
 */
function requestToStandby(fromSocket, fromUser, fromPassive = false) {
  // standby 풀에서 자신 및 이미 pending 인 소켓 제외
  const candidates = [...standby.entries()]
    .filter(([id]) => id !== fromSocket.id);
  if (candidates.length === 0) return false;

  const sameRegion = candidates.filter(([, c]) => c.region === fromUser.region);
  const pool       = sameRegion.length > 0 ? sameRegion : candidates;
  pool.sort((a, b) => a[1].joinedAt - b[1].joinedAt);

  const [candidateId, candidate] = pool[0];
  const requestId = uuidv4();

  const PENDING_TIMEOUT = 60 * 1000; // 60초 — 앱 재시작 후 수락 허용
  const timer = setTimeout(() => {
    pendingMatches.delete(requestId);
    pendingFromSockets.delete(fromSocket.id);
    console.log(`[standby] ⏱ request ${requestId} timed out`);
  }, PENDING_TIMEOUT);

  pendingMatches.set(requestId, {
    requestId,
    fromSocketId: fromSocket.id,
    toSocketId  : candidateId,
    fromUser,
    toUser      : candidate,
    timer,
    fromPassive,         // standby→standby 여부
  });

  pendingFromSockets.add(fromSocket.id);
  standby.delete(candidateId); // 응답 대기 중엔 standby 풀에서 제거

  io.to(candidateId).emit('match_request', {
    requestId,
    fromNick    : fromUser.nick,
    fromInterest: fromUser.interests?.[0] || '',
    fromRegion  : fromUser.region,
  });

  // 앱이 닫혀 있거나 화면이 꺼져 있어도 수신할 수 있도록 push 발송
  sendMatchRequestPush(candidate.nick, fromUser.nick, fromUser.region, requestId);

  console.log(`[standby] 📨 ${fromUser.nick} → ${candidate.nick}  req=${requestId}  passive=${fromPassive}`);
  return true;
}

/**
 * Feature 5: 연결 끊김 시 grace period
 * - 화면 꺼짐/백그라운드로 인한 소켓 단절은 정상이므로 상대에게 알리지 않음
 * - GRACE_MS 내 rejoin → 상대방에게 'peer_reconnected'
 * - GRACE_MS 경과 → 방 제거 + 상대방에게 'peer_disconnected' (최종)
 */
const GRACE_MS = 30 * 60 * 1000; // 30분 — 앱 재시작 후 재진입 허용

function handleDisconnectFromRoom(socketId) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) {
    socketToRoom.delete(socketId);
    return;
  }

  const existing = reconnectTimers.get(socketId);
  if (existing) {
    clearTimeout(existing.timer);
    // softTimer 제거됨 — peer_temporarily_disconnected 더 이상 전송 안 함
  }

  const timer = setTimeout(() => {
    reconnectTimers.delete(socketId);
    const r = rooms.get(roomId);
    if (!r) return;
    const oid = r.sockets.find(id => id !== socketId);
    if (oid) io.to(oid).emit('peer_disconnected');
    r.sockets.forEach(id => { socketToRoom.delete(id); });
    rooms.delete(roomId);
    console.log(`[room] 🗑  ${roomId} cleaned up after grace period`);
  }, GRACE_MS);

  reconnectTimers.set(socketId, { timer, roomId });
  console.log(`[room] 🔌 ${socketId} disconnected from ${roomId}, grace=${GRACE_MS/1000}s`);
}

function cleanupRoom(roomId, leavingSocketId) {
  const room = rooms.get(roomId);
  if (!room) return;

  // 타이머 전체 취소
  room.sockets.forEach(id => {
    const t = reconnectTimers.get(id);
    if (t) { clearTimeout(t.timer); reconnectTimers.delete(id); }
  });

  // ⚠️ 나가는 쪽만 socketToRoom 에서 제거
  // 남은 쪽은 직접 leave_room 을 보내기 전까지 socketToRoom 에 유지 → 재매칭 방지
  socketToRoom.delete(leavingSocketId);
  io.sockets.sockets.get(leavingSocketId)?.leave(roomId);

  rooms.delete(roomId);

  const otherId = room.sockets.find(id => id !== leavingSocketId);
  if (otherId) io.to(otherId).emit('peer_left');
  console.log(`[room] 🚪 ${leavingSocketId} left ${roomId}, other=${otherId || 'none'}`);
}

// ─── Socket handlers ──────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ── join_queue ──────────────────────────────────────────────────
  socket.on('join_queue', (user) => {
    const err = validate(user);
    if (err) { socket.emit('error', { message: err }); return; }
    if (socketToRoom.has(socket.id)) { socket.emit('error', { message: '이미 채팅 중이에요' }); return; }

    // 매칭 시작 시 standby 풀에서 제거 (중복 상태 방지)
    standby.delete(socket.id);

    const entry = {
      socketId    : socket.id,
      nick        : user.nick.trim(),
      interests   : user.interests,
      region      : user.region.trim(),
      lat         : typeof user.lat === 'number' ? user.lat : null,
      lng         : typeof user.lng === 'number' ? user.lng : null,
      isPremium   : user.isPremium === true,
      blockedUsers: Array.isArray(user.blockedUsers) ? user.blockedUsers : [],
      joinedAt    : Date.now(),
    };
    queue.set(socket.id, entry);
    const coordStr = entry.lat ? `(${entry.lat.toFixed(4)}, ${entry.lng.toFixed(4)})` : '(좌표없음)';
    console.log(`[queue] +${entry.nick} ${coordStr} premium=${entry.isPremium}  queue=${queue.size}`);

    if (tryMatch(socket, entry)) return;          // queue↔queue
    if (requestToStandby(socket, entry)) {        // queue→standby
      socket.emit('queue_joined', { position: queue.size });
      return;
    }
    socket.emit('queue_joined', { position: queue.size });
  });

  // ── leave_queue ─────────────────────────────────────────────────
  socket.on('leave_queue', () => {
    if (queue.delete(socket.id))
      console.log(`[queue] -${socket.id}  queue=${queue.size}`);

    // 이 소켓에서 보낸 pending 요청 취소
    for (const [rid, pm] of pendingMatches.entries()) {
      if (pm.fromSocketId === socket.id) {
        clearTimeout(pm.timer);
        pendingMatches.delete(rid);
        pendingFromSockets.delete(socket.id);
        // 상대 원래 풀로 복구
        if (pm.toUser) {
          if (pm.toFromQueue) {
            if (!socketToRoom.has(pm.toSocketId))
              queue.set(pm.toSocketId, { ...pm.toUser, joinedAt: Date.now() });
          } else {
            standby.set(pm.toSocketId, { ...pm.toUser, joinedAt: Date.now() });
          }
        }
      }
    }
  });

  // ── join_standby ─────────────────────────────────────────────────
  socket.on('join_standby', (user) => {
    if (!user?.nick) return;
    if (socketToRoom.has(socket.id)) return;  // 채팅 중이면 무시

    const entry = {
      socketId : socket.id,
      nick     : (user.nick || '').trim(),
      interests: Array.isArray(user.interests) ? user.interests : [],
      region   : (user.region || '').trim(),
      joinedAt : Date.now(),
    };
    standby.set(socket.id, entry);
    console.log(`[standby] +${entry.nick}  standby=${standby.size}`);

    // ── 큐에서 대기 중인 유저가 있으면 즉시 매칭 시도 ──────────────
    // 시나리오: 상대방이 나가기 → 내가 doLeave() → join_standby 전송
    //           → 이미 join_queue 로 기다리던 유저와 바로 연결
    const waitingInQueue = [...queue.entries()].filter(
      ([id]) => !pendingFromSockets.has(id) && !socketToRoom.has(id)
    );
    if (waitingInQueue.length > 0) {
      waitingInQueue.sort((a, b) => a[1].joinedAt - b[1].joinedAt);
      const sameRegion = waitingInQueue.filter(([, u]) => u.region === entry.region);
      const pool = sameRegion.length > 0 ? sameRegion : waitingInQueue;
      const [waitingId, waitingUser] = pool[0];
      const waitingSocket = io.sockets.sockets.get(waitingId);
      if (waitingSocket) {
        console.log(`[standby] ⚡ ${entry.nick} joined standby → triggering match for waiting ${waitingUser.nick}`);
        requestToStandby(waitingSocket, waitingUser);
      }
    }
  });

  // ── leave_standby ────────────────────────────────────────────────
  socket.on('leave_standby', () => {
    if (standby.delete(socket.id))
      console.log(`[standby] -${socket.id}  standby=${standby.size}`);
    // 보낸 pending 요청도 취소
    for (const [rid, pm] of pendingMatches.entries()) {
      if (pm.fromSocketId === socket.id) {
        clearTimeout(pm.timer);
        pendingMatches.delete(rid);
        pendingFromSockets.delete(socket.id);
        if (pm.toUser) standby.set(pm.toSocketId, { ...pm.toUser, joinedAt: Date.now() });
      }
    }
  });

  // ── accept_match ─────────────────────────────────────────────────
  socket.on('accept_match', ({ requestId } = {}) => {
    const pm = pendingMatches.get(requestId);
    if (!pm) return;

    clearTimeout(pm.timer);
    pendingMatches.delete(requestId);
    pendingFromSockets.delete(pm.fromSocketId);

    const fromSocket = io.sockets.sockets.get(pm.fromSocketId);
    if (!fromSocket) {
      // 요청자가 연결 끊김 → 수락자 원래 풀로 복구
      if (pm.toFromQueue) {
        queue.set(socket.id, { ...pm.toUser, joinedAt: Date.now() });
      } else {
        standby.set(socket.id, { ...pm.toUser, joinedAt: Date.now() });
      }
      return;
    }

    queue.delete(pm.fromSocketId);
    standby.delete(pm.toSocketId);
    queue.delete(pm.toSocketId);   // queue 출신이면 여기서도 제거

    if (pm.fromPassive) {
      // standby→standby: 둘 다 passive_match_found
      createRoom(fromSocket, pm.fromUser, socket.id, pm.toUser,
                 'passive_match_found', 'passive_match_found');
    } else if (pm.toFromQueue) {
      // queue→queue: 둘 다 match_found
      createRoom(fromSocket, pm.fromUser, socket.id, pm.toUser,
                 'match_found', 'match_found');
    } else {
      // queue→standby: 능동 사용자는 match_found, 수락자는 passive_match_found
      createRoom(fromSocket, pm.fromUser, socket.id, pm.toUser,
                 'match_found', 'passive_match_found');
    }
  });

  // ── decline_match ────────────────────────────────────────────────
  socket.on('decline_match', ({ requestId } = {}) => {
    const pm = pendingMatches.get(requestId);
    if (!pm) return;

    clearTimeout(pm.timer);
    pendingMatches.delete(requestId);
    pendingFromSockets.delete(pm.fromSocketId);

    if (pm.toFromQueue) {
      // queue↔queue: 거절 시 둘 다 큐로 복귀 (재매칭 가능)
      if (!socketToRoom.has(pm.toSocketId))
        queue.set(pm.toSocketId,   { ...pm.toUser,   joinedAt: Date.now() });
      if (!socketToRoom.has(pm.fromSocketId))
        queue.set(pm.fromSocketId, { ...pm.fromUser, joinedAt: Date.now() });
      console.log(`[queue] ❌ ${pm.toUser.nick} declined ${pm.fromUser.nick}, both returned to queue`);
    } else {
      // queue→standby: 거절자 standby 복구
      standby.set(pm.toSocketId, { ...pm.toUser, joinedAt: Date.now() });
      console.log(`[standby] ❌ ${pm.toUser.nick} declined ${pm.fromUser.nick}`);
    }
  });

  // ── send_message ─────────────────────────────────────────────────
  socket.on('send_message', ({ roomId, text }) => {
    if (!roomId || !text || typeof text !== 'string') return;
    if (text.length > 500) return;

    const room = rooms.get(roomId);
    if (!room || !room.sockets.includes(socket.id)) return;

    const senderIdx  = room.sockets.indexOf(socket.id);
    const otherIdx   = senderIdx === 0 ? 1 : 0;
    const senderUser = room.users[senderIdx];
    const otherUser  = room.users[otherIdx];

    const msgId   = uuidv4();
    const msgTime = koreanTime();

    io.to(roomId).except(socket.id).emit('receive_message', {
      id  : msgId,
      text: text.trim(),
      time: msgTime,
    });

    // 프리미엄 채팅 저장
    if (chatLogs.has(roomId)) {
      const log = chatLogs.get(roomId);
      log.push({
        id      : msgId,
        senderNick: senderUser?.nick || '?',
        text    : text.trim(),
        time    : msgTime,
        savedAt : Date.now(),
      });
      if (log.length > MAX_CHAT_LOG) log.shift(); // 최대 200개
    }

    if (otherUser?.nick) {
      sendPushToNick(otherUser.nick, senderUser?.nick || '이웃', text.trim());
    }
  });

  // ── get_chat_history (프리미엄 전용) ────────────────────────────
  socket.on('get_chat_history', ({ roomId } = {}) => {
    const room = rooms.get(roomId);
    if (!room || !room.sockets.includes(socket.id)) return;

    const senderIdx = room.sockets.indexOf(socket.id);
    const user      = room.users[senderIdx];

    // 프리미엄 유저만 이전 대화 조회 가능
    if (!user?.isPremium) {
      socket.emit('chat_history_error', { message: '프리미엄 전용 기능이에요' });
      return;
    }

    const log = chatLogs.get(roomId) || [];
    socket.emit('chat_history', { messages: log });
    console.log(`[chat] 📜 ${user.nick} 히스토리 조회 (${log.length}개) room=${roomId}`);
  });

  // ── leave_room ───────────────────────────────────────────────────
  socket.on('leave_room', ({ roomId } = {}) => {
    const rid = roomId || socketToRoom.get(socket.id);
    if (!rid) return;

    const room = rooms.get(rid);
    if (room) {
      // 방 존재 → 풀 클린업 (상대방에게 peer_left 전송)
      cleanupRoom(rid, socket.id);
    } else {
      // 방이 이미 삭제됨 (상대가 먼저 나간 경우) → 자신의 socketToRoom 만 정리
      socketToRoom.delete(socket.id);
      io.sockets.sockets.get(socket.id)?.leave(rid);
      console.log(`[room] leave_room (after peer_left) ${socket.id}  rid=${rid}`);
    }
  });

  // ── rejoin_room (Feature 5) ──────────────────────────────────────
  // nick + roomId 기반으로 매칭 → 소켓 ID 가 바뀌어도 복구 가능
  socket.on('rejoin_room', ({ roomId, nick } = {}) => {
    const room = rooms.get(roomId);
    if (!room) {
      // 방이 삭제됨 → 스테일 socketToRoom 정리 후 peer_left 전달
      socketToRoom.delete(socket.id);
      socket.emit('peer_left');
      return;
    }

    // 방에 있는 유저 중 nick 일치하는 인덱스 찾기
    const userIdx = room.users.findIndex(u => u.nick === nick);
    if (userIdx === -1) { socket.emit('peer_left'); return; }

    const oldSocketId = room.sockets[userIdx];

    // grace period 타이머 취소 (구 소켓 ID 기준)
    const timerEntry = reconnectTimers.get(oldSocketId);
    if (timerEntry) {
      clearTimeout(timerEntry.timer);
      reconnectTimers.delete(oldSocketId);
    }

    // 소켓 ID 갱신
    room.sockets[userIdx] = socket.id;
    room.users[userIdx].socketId = socket.id;
    socketToRoom.delete(oldSocketId);
    socketToRoom.set(socket.id, roomId);

    socket.join(roomId);

    // 상대방에게 재연결 알림
    const otherId = room.sockets.find(id => id !== socket.id);
    if (otherId) io.to(otherId).emit('peer_reconnected');

    console.log(`[room] 🔄 ${nick} rejoined ${roomId} (${oldSocketId} → ${socket.id})`);
  });

  // ── join_region (동네 피드) ──────────────────────────────────────
  socket.on('join_region', ({ region } = {}) => {
    if (!region || typeof region !== 'string') return;
    // 기존 region 룸 나가기
    [...socket.rooms]
      .filter(r => r.startsWith('region:'))
      .forEach(r => socket.leave(r));
    socket.join(`region:${region}`);
    console.log(`[region] ${socket.id} → region:${region}`);

    // 접속자에게 피드 히스토리 전송 (최신 50개)
    const history = regionFeeds.get(region) || [];
    if (history.length > 0) {
      socket.emit('feed_history', history);
    }
  });

  // ── post_feed (동네 피드 브로드캐스트 + 저장) ───────────────────
  socket.on('post_feed', ({ text, nick, interest, region } = {}) => {
    if (!text || !nick || !region) return;
    if (typeof text !== 'string' || text.length > 100) return;
    const item = {
      id      : uuidv4(),
      nick,
      interest: interest || 'none',
      time    : koreanTime(),
      msg     : text.trim(),
    };
    // 인메모리 저장 (최신순, 최대 100개) + 파일 영속화
    const feed = regionFeeds.get(region) || [];
    feed.unshift(item);
    if (feed.length > 100) feed.pop();
    regionFeeds.set(region, feed);
    saveData();

    // 같은 동네 다른 유저에게 브로드캐스트
    io.to(`region:${region}`).except(socket.id).emit('new_feed_post', item);
    console.log(`[feed] ${nick} → region:${region} : ${text.substring(0, 30)}`);
  });

  // ── check_pending_match ──────────────────────────────────────────
  // 앱 재시작 / 재연결 시 놓친 match_request 재발송
  socket.on('check_pending_match', ({ nick } = {}) => {
    if (!nick) return;
    for (const [, pm] of pendingMatches.entries()) {
      if (pm.toUser.nick === nick) {
        // 재연결된 소켓 ID 로 업데이트
        pm.toSocketId = socket.id;
        socket.emit('match_request', {
          requestId   : pm.requestId,
          fromNick    : pm.fromUser.nick,
          fromInterest: pm.fromUser.interests?.[0] || '',
          fromRegion  : pm.fromUser.region,
        });
        console.log(`[standby] 🔄 resent match_request to ${nick}`);
        break;
      }
    }
  });

  // ── register_push_token (Feature 3) ─────────────────────────────
  socket.on('register_push_token', ({ token, nick } = {}) => {
    if (token && nick && typeof token === 'string') {
      pushTokensByNick.set(nick, token);
      saveData(); // 서버 재시작 후에도 토큰 유지
      console.log(`[push] 🔑 token registered for ${nick}`);
    }
  });

  // ── report_user ──────────────────────────────────────────────────
  socket.on('report_user', ({ reportedNick, roomId, reason, reporterNick } = {}) => {
    if (!reportedNick || !reason) return;
    console.log(`[report] 🚨 ${reporterNick} → ${reportedNick}  reason="${reason}"  room=${roomId}`);

    // TODO: DB 연동 시 신고 내역 저장
    // 현재는 로그 기록 + 향후 자동 제재 기준 데이터
    const reportKey = `${reportedNick}`;
    if (!reportCounts.has(reportKey)) reportCounts.set(reportKey, 0);
    reportCounts.set(reportKey, reportCounts.get(reportKey) + 1);

    const count = reportCounts.get(reportKey);
    console.log(`[report] ${reportedNick} 누적 신고 ${count}회`);

    // 5회 이상 신고 시 자동 경고
    if (count >= 5) {
      console.warn(`[report] ⚠️  ${reportedNick} 신고 누적 5회 이상 — 검토 필요`);
    }
  });

  // ── disconnect ───────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] ${socket.id}  reason=${reason}`);

    queue.delete(socket.id);
    standby.delete(socket.id);

    for (const [rid, pm] of pendingMatches.entries()) {
      if (pm.fromSocketId === socket.id || pm.toSocketId === socket.id) {
        clearTimeout(pm.timer);
        pendingMatches.delete(rid);
        pendingFromSockets.delete(pm.fromSocketId);

        if (pm.fromSocketId === socket.id) {
          // 요청자(from) disconnect → 수락 대기자(to) 원래 풀로 복구
          if (pm.toUser) {
            if (pm.toFromQueue) {
              if (!socketToRoom.has(pm.toSocketId))
                queue.set(pm.toSocketId, { ...pm.toUser, joinedAt: Date.now() });
            } else {
              standby.set(pm.toSocketId, { ...pm.toUser, joinedAt: Date.now() });
            }
          }
        } else {
          // 수락 대기자(to) disconnect → 요청자(from) 원래 풀로 복구
          if (pm.fromUser && !socketToRoom.has(pm.fromSocketId)) {
            if (pm.fromPassive) {
              // standby→standby: from 은 standby 로
              standby.set(pm.fromSocketId, { ...pm.fromUser, joinedAt: Date.now() });
            } else {
              // queue→queue 또는 queue→standby: from 은 queue 로
              queue.set(pm.fromSocketId, { ...pm.fromUser, joinedAt: Date.now() });
            }
          }
        }
      }
    }

    // Feature 5: grace period
    if (socketToRoom.has(socket.id)) handleDisconnectFromRoom(socket.id);

    // ⚠️ 푸시 토큰은 nick 기준 저장이므로 소켓 끊김에 영향 없음
  });
});

// ─── Start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🟢 Locotalk server  http://localhost:${PORT}`);
  console.log(`   Health check     http://localhost:${PORT}/health\n`);
});
