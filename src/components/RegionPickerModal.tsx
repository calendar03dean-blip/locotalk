/**
 * RegionPickerModal — 프리미엄 전용 지역 선택 모달
 */
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  FlatList, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { CITIES, getDistricts, type District } from '../constants/districts';
import { Colors, Radius, Typography, Spacing } from '../constants/theme';

function IcoSearch({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"
        stroke={Colors.g3} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IcoClose({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={Colors.dark} strokeWidth={2}
        strokeLinecap="round" />
    </Svg>
  );
}

interface Props {
  visible      : boolean;
  currentGu    : string;
  onSelect     : (gu: string, label: string) => void;
  onClose      : () => void;
}

export default function RegionPickerModal({ visible, currentGu, onSelect, onClose }: Props) {
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [search,       setSearch]       = useState('');

  const districts = getDistricts(selectedCity);
  const filtered  = search.trim()
    ? districts.filter(d => d.gu.includes(search.trim()))
    : districts;

  const handleSelect = (d: District) => {
    onSelect(d.gu, d.label);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

        {/* 헤더 */}
        <View style={s.header}>
          <Text style={s.title}>매칭 지역 설정</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <IcoClose size={20} />
          </TouchableOpacity>
        </View>

        {/* 검색 */}
        <View style={s.searchRow}>
          <IcoSearch size={16} />
          <TextInput
            style={s.searchInput}
            placeholder="구/군 검색..."
            placeholderTextColor={Colors.g3}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* 도시 탭 */}
        <FlatList
          horizontal
          data={CITIES}
          keyExtractor={c => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.cityRow}
          renderItem={({ item: city }) => (
            <TouchableOpacity
              style={[s.cityTab, selectedCity === city && s.cityTabSel]}
              onPress={() => { setSelectedCity(city); setSearch(''); }}
              activeOpacity={0.7}
            >
              <Text style={[s.cityTxt, selectedCity === city && s.cityTxtSel]}>
                {city}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* 구 목록 */}
        <FlatList
          data={filtered}
          keyExtractor={d => d.label}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item: d }) => {
            const isSelected = d.gu === currentGu;
            return (
              <TouchableOpacity
                style={[s.distRow, isSelected && s.distRowSel]}
                onPress={() => handleSelect(d)}
                activeOpacity={0.7}
              >
                <Text style={[s.distTxt, isSelected && s.distTxtSel]}>
                  {d.gu}
                </Text>
                {isSelected && (
                  <View style={s.checkBadge}>
                    <Text style={s.checkTxt}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={s.emptyTxt}>검색 결과가 없어요</Text>
          }
        />

      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#fff' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.g2 },
  title:       { fontSize: 17, fontWeight: '700', color: Colors.dark },
  closeBtn:    { padding: 4 },

  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginVertical: 12, backgroundColor: Colors.g1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.dark, padding: 0 },

  cityRow:     { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  cityTab:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.g1 },
  cityTabSel:  { backgroundColor: '#034A93' },
  cityTxt:     { fontSize: 13, color: Colors.g4, fontWeight: '500' },
  cityTxtSel:  { color: '#fff', fontWeight: '700' },

  distRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.g1 },
  distRowSel:  { backgroundColor: '#F0F5FF' },
  distTxt:     { fontSize: 15, color: Colors.dark },
  distTxtSel:  { color: '#034A93', fontWeight: '600' },
  checkBadge:  { width: 24, height: 24, borderRadius: 12, backgroundColor: '#034A93', alignItems: 'center', justifyContent: 'center' },
  checkTxt:    { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyTxt:    { textAlign: 'center', color: Colors.g3, marginTop: 40 },
});
