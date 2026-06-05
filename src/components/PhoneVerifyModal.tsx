import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  onClose: () => void;
  onVerified: (phone: string, name: string, birthDate: string, gender: 'male' | 'female') => void;
  userId: string;
}

export default function PhoneVerifyModal({ visible, onClose, onVerified, userId }: Props) {
  const BASE = 'https://locotalk-production.up.railway.app';
  const [step, setStep] = useState<'phone'|'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male'|'female'|null>(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(180);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 타이머
  useEffect(() => {
    if (step === 'otp') {
      setTimer(180);
      timerRef.current = setInterval(() => {
        setTimer(t => { if (t <= 1) { clearInterval(timerRef.current!); return 0; } return t - 1; });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!visible) {
      setStep('phone');
      setPhone('');
      setName('');
      setBirthDate('');
      setGender(null);
      setOtp('');
      setLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [visible]);

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 7) return d.slice(0, 3) + '-' + d.slice(3);
    return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
  };

  const sendOtp = async () => {
    if (!name.trim()) { Alert.alert('성명을 입력해주세요'); return; }
    if (birthDate.length !== 8) { Alert.alert('생년월일 8자리를 입력해주세요 (예: 19950315)'); return; }
    if (!gender) { Alert.alert('성별을 선택해주세요'); return; }
    const raw = phone.replace(/\D/g, '');
    if (raw.length < 10) { Alert.alert('올바른 전화번호를 입력해주세요'); return; }
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/auth/send-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: raw, userId }),
      });
      const d = await r.json();
      if (d.success) { setStep('otp'); }
      else { Alert.alert('발송 실패', d.error || '잠시 후 다시 시도해주세요'); }
    } catch { Alert.alert('네트워크 오류'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { Alert.alert('인증번호 6자리를 입력해주세요'); return; }
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/auth/verify-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ''), code: otp, userId }),
      });
      const d = await r.json();
      if (d.success) { onVerified(phone, name.trim(), birthDate, gender!); }
      else { Alert.alert('인증 실패', d.error || '코드가 맞지 않습니다'); }
    } catch { Alert.alert('네트워크 오류'); }
    finally { setLoading(false); }
  };

  const mm = String(Math.floor(timer / 60)).padStart(2, '0');
  const ss = String(timer % 60).padStart(2, '0');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={st.safe}>
        <View style={st.header}>
          <TouchableOpacity onPress={onClose}><Text style={st.close}>✕</Text></TouchableOpacity>
          <Text style={st.title}>통신사 본인인증</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={st.body}>
          {step === 'phone' ? (
            <>
              <Text style={st.label}>본인 정보를 입력해주세요</Text>
              <Text style={st.sub}>인증번호가 문자로 전송됩니다</Text>
              <TextInput
                style={st.input}
                value={name}
                onChangeText={setName}
                placeholder="성명"
                placeholderTextColor="#aaa"
              />
              <TextInput
                style={st.input}
                value={birthDate}
                onChangeText={v => setBirthDate(v.replace(/\D/g, '').slice(0, 8))}
                placeholder="생년월일 (예: 19950315)"
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
                maxLength={8}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  style={[st.genderBtn, gender === 'male' && st.genderBtnSel]}
                  onPress={() => setGender('male')}
                >
                  <Text style={[st.genderTxt, gender === 'male' && st.genderTxtSel]}>남성</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.genderBtn, gender === 'female' && st.genderBtnSel]}
                  onPress={() => setGender('female')}
                >
                  <Text style={[st.genderTxt, gender === 'female' && st.genderTxtSel]}>여성</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={st.input}
                value={phone}
                onChangeText={v => setPhone(formatPhone(v))}
                placeholder="010-0000-0000"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
                maxLength={13}
              />
              <TouchableOpacity
                style={[st.btn, phone.replace(/\D/g, '').length < 10 && st.btnOff]}
                onPress={sendOtp}
                disabled={loading || phone.replace(/\D/g, '').length < 10}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={st.btnTxt}>인증번호 발송</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={st.label}>{phone}으로{'\n'}인증번호를 발송했습니다</Text>
              <Text style={st.sub}>3분 내로 입력해주세요</Text>
              <View style={st.otpRow}>
                <TextInput
                  style={[st.input, st.otpInput]}
                  value={otp}
                  onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6자리 입력"
                  placeholderTextColor="#aaa"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                <Text style={[st.timer, timer < 30 && st.timerRed]}>{mm}:{ss}</Text>
              </View>
              <TouchableOpacity
                style={[st.btn, otp.length < 6 && st.btnOff]}
                onPress={verifyOtp}
                disabled={loading || otp.length < 6}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={st.btnTxt}>인증 확인</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={st.resend} onPress={() => { setStep('phone'); setOtp(''); }}>
                <Text style={st.resendTxt}>번호 변경 / 재발송</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const st = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#fff' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  close:       { fontSize: 18, color: '#666', width: 32, textAlign: 'center' },
  title:       { fontSize: 17, fontWeight: '700', color: '#111' },
  body:        { flex: 1, padding: 24 },
  label:       { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 8, lineHeight: 28 },
  sub:         { fontSize: 14, color: '#888', marginBottom: 28 },
  input:       { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, color: '#111', backgroundColor: '#fafafa', marginBottom: 16 },
  otpRow:      { position: 'relative', marginBottom: 16 },
  otpInput:    { marginBottom: 0, paddingRight: 70, letterSpacing: 6, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  timer:       { position: 'absolute', right: 16, top: 0, bottom: 0, lineHeight: 52, fontSize: 15, fontWeight: '700', color: '#40D3B6' },
  timerRed:    { color: '#ef4444' },
  btn:         { backgroundColor: '#034A93', borderRadius: 100, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnOff:      { opacity: 0.35 },
  btnTxt:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  resend:      { marginTop: 16, alignItems: 'center' },
  resendTxt:   { color: '#40D3B6', fontSize: 14, fontWeight: '600' },
  genderBtn:   { flex: 1, height: 48, borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  genderBtnSel:{ borderColor: '#034A93', backgroundColor: '#EFF6FF' },
  genderTxt:   { fontSize: 15, fontWeight: '600', color: '#888' },
  genderTxtSel:{ color: '#034A93' },
});
