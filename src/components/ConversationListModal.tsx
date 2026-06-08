/**
 * ConversationListModal — "회원 활동 내역"(대화 목록)
 * 서버 list_conversations(socket.userId 인증) → 'conversations' 수신.
 * 행: 상대 표시명(peer_nick) · 마지막 메시지 미리보기(preview) · 시간.
 * 탭 → onOpen(conv): 부모(MyInfoScreen)가 setPeer + 채팅 탭 이동 → ChatScreen이 히스토리 복원.
 * 보관: 무료 7일 / 프리미엄 90일(서버 차등). persist 미사용 — 열 때마다 서버 즉시 조회.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSocket } from '../services/socket';
import NickAvatar from './NickAvatar';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';

export interface ConversationItem {
  id: string;            // roomId
  peer_nick: string;
  preview?: string;
  last_kind?: string;
  last_msg_at?: string;  // ISO
  status?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpen: (conv: ConversationItem) => void;
}

function fmtWhen(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch { return ''; }
}

export default function ConversationListModal({ visible, onClose, onOpen }: Props) {
  const [items, setItems]     = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const socket = getSocket();
    if (!socket) { setItems([]); return; }
    const onConvs = ({ items: list }: { items: ConversationItem[] }) => {
      setItems(Array.isArray(list) ? list : []);
      setLoading(false);
    };
    socket.on('conversations', onConvs);
    setLoading(true);
    socket.emit('list_conversations');
    const t = setTimeout(() => setLoading(false), 4000); // 무응답 graceful
    return () => { socket.off('conversations', onConvs); clearTimeout(t); };
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>대화 내역</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.close}>닫기</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.center}><ActivityIndicator color={Colors.primary} /></View>
        ) : items.length === 0 ? (
          <View style={s.center}>
            <Text style={s.emptyTitle}>아직 대화 내역이 없어요</Text>
            <Text style={s.emptyDesc}>대화는 무료 7일 · 프리미엄 90일 보관돼요</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ paddingVertical: 4 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={() => onOpen(item)}>
                <NickAvatar nick={item.peer_nick || '?'} size={44} />
                <View style={s.rowMid}>
                  <Text style={s.peer} numberOfLines={1}>{item.peer_nick || '상대'}</Text>
                  <Text style={s.preview} numberOfLines={1}>
                    {item.last_kind === 'image' ? '📷 사진' : (item.preview || '')}
                  </Text>
                </View>
                <Text style={s.when}>{fmtWhen(item.last_msg_at)}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.sf },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
             paddingHorizontal: Spacing.md, paddingVertical: 14,
             borderBottomWidth: 0.5, borderBottomColor: Colors.separator },
  title:   { fontSize: Typography.headline, fontWeight: '800', color: Colors.dark },
  close:   { fontSize: Typography.body, color: Colors.primary, fontWeight: '700' },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyTitle: { fontSize: Typography.body, fontWeight: '700', color: Colors.dark },
  emptyDesc:  { fontSize: Typography.footnote, color: Colors.g3 },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 12,
             paddingHorizontal: Spacing.md, paddingVertical: 12,
             borderBottomWidth: 0.5, borderBottomColor: Colors.separator },
  rowMid:  { flex: 1, gap: 3 },
  peer:    { fontSize: Typography.body, fontWeight: '700', color: Colors.dark },
  preview: { fontSize: Typography.footnote, color: Colors.g4 },
  when:    { fontSize: Typography.caption1, color: Colors.g3 },
});
