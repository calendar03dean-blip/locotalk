/**
 * IdentityVerifyModal — 본인인증 (선택)
 * 성별 + 생년월일 입력 → 인증 완료 → DB 저장 + 인증 뱃지
 */
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors, Radius, Spacing } from '../constants/theme';
import { useStore } from '../store';
import { verifyIdentity } from '../services/userApi';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function IcoClose() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={Colors.g4} strokeWidth={2} strokeLinecap="round"/>
    </Svg>
  );
}

function IcoShield({ color = '#034A93' }: { color?: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

export default function IdentityVerifyModal({ visible, onClose }: Props) {
  const { user, authUserId, setVerified } = useStore(s => ({
    user: s.user, authUserId: s.authUserId, setVerified: s.setVerified
  }));

  const [gender,    setGender]    = useState<'male'|'female'|null>(user?.gender ?? null);
  const [birthYear, setBirthYear] = useState(user?.birthYear?.toString() ?? '');
  const [loading,   setLoading]   = useState(false);

  const handleVerify = async () => {
    if (!gender) { Alert.alert('성별을 선택해주세요'); return; }
    const year = parseInt(birthYear, 10);
    const curYear = new Date().getFullYear();
    if (!year || year < 1900 || year > curYear - 5) {
      Alert.alert('올바른 생년을 입력해주세요\n(예: 1995)'); return;
    }

    setLoading(true);
    const userId = authUserId || user?.id || '';
    const ok = await verifyIdentity(userId, gender, year);
    setLoading(false);

    if (ok || !userId) {
      // 스토어 업데이트
      setVerified(gender, year);
      Alert.alert('✅ 본인인증 완료', '인증 뱃지가 프로필에 표시됩니다.', [
        { text: '확인', onPress: onClose }
      ]);
    } else {
      Alert.alert('인증 실패', '다시 시도해주세요.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <IcoClose />
          </TouchableOpacity>

          <View style={s.header}>
            <IcoShield />
            <Text style={s.title}>본인인증</Text>
            <Text style={s.sub}>{'인증 완료 시 프로필에 ✓ 뱃지가 표시됩니다\n선택 사항이며 언제든 진행할 수 있어요'}</Text>
          </View>

          {/* 성별 */}
          <View style={s.field}>
            <Text style={s.label}>성별</Text>
            <View style={s.genderRow}>
              {(['male', 'female'] as const).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[s.genderBtn, gender === g && s.genderBtnSel]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.genderTxt, gender === g && s.genderTxtSel]}>
                    {g === 'male' ? '남성' : '여성'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 생년 */}
          <View style={s.field}>
            <Text style={s.label}>생년 (4자리)</Text>
            <TextInput
              style={s.input}
              placeholder="예: 1995"
              placeholderTextColor={Colors.g3}
              value={birthYear}
              onChangeText={v => setBirthYear(v.replace(/\D/g,'').slice(0,4))}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          <View style={s.notice}>
            <Text style={s.noticeTxt}>
              {'• 입력한 정보는 암호화되어 저장됩니다\n• 성별·생년은 프리미엄 회원에게만 공개됩니다\n• 일반 회원은 인증 여부만 확인 가능합니다'}
            </Text>
          </View>

          <TouchableOpacity
            style={[s.btn, (!gender || birthYear.length < 4) && s.btnOff, loading && s.btnOff]}
            onPress={handleVerify}
            disabled={!gender || birthYear.length < 4 || loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size={18} />
              : <Text style={s.btnTxt}>인증 완료</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:      { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  sheet:        { backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:40 },
  closeBtn:     { alignSelf:'flex-end', width:32, height:32, borderRadius:16, backgroundColor:Colors.g1, alignItems:'center', justifyContent:'center', marginBottom:4 },
  header:       { alignItems:'center', gap:8, marginBottom:24 },
  title:        { fontSize:20, fontWeight:'800', color:Colors.dark },
  sub:          { fontSize:13, color:Colors.g4, textAlign:'center', lineHeight:20 },
  field:        { marginBottom:18 },
  label:        { fontSize:13, fontWeight:'600', color:Colors.g4, marginBottom:8 },
  input:        { height:48, borderWidth:1.5, borderColor:Colors.g2, borderRadius:Radius.md, paddingHorizontal:14, fontSize:16, color:Colors.dark, backgroundColor:Colors.g1 },
  genderRow:    { flexDirection:'row', gap:10 },
  genderBtn:    { flex:1, height:48, borderWidth:1.5, borderColor:Colors.g2, borderRadius:Radius.md, alignItems:'center', justifyContent:'center', backgroundColor:Colors.g1 },
  genderBtnSel: { borderColor:'#034A93', backgroundColor:'#EFF6FF' },
  genderTxt:    { fontSize:15, fontWeight:'600', color:Colors.g4 },
  genderTxtSel: { color:'#034A93' },
  notice:       { backgroundColor:Colors.g1, borderRadius:12, padding:14, marginBottom:20 },
  noticeTxt:    { fontSize:12, color:Colors.g4, lineHeight:20 },
  btn:          { height:52, backgroundColor:'#034A93', borderRadius:Radius.pill, alignItems:'center', justifyContent:'center' },
  btnOff:       { opacity:0.4 },
  btnTxt:       { color:'#fff', fontSize:16, fontWeight:'700' },
});
