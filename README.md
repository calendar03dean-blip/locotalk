# SPOTA — iOS 26 Style Package

iOS 26 디자인 시스템(Liquid Glass)을 SPOTA 앱에 적용하기 위한 코드 패키지.

## 📦 포함 파일

```
spota-style-export/
└── src/
    ├── constants/
    │   ├── theme.ts                 ← 디자인 토큰 (덮어쓰기)
    │   └── regions.ts               ← 지역 모노그램·로마자·매핑 (신규)
    └── components/
        ├── InterestIcon.tsx         ← 관심사 라인 아이콘 (이모지 대체)
        ├── ActivityRing.tsx         ← 활동지수 링 게이지 (홈 화면용)
        ├── RegionIcon.tsx           ← 컴팩트 모노그램 타일 (칩·인라인) 🆕
        └── RegionBadge.tsx          ← 큰 모노그램 + 영문명 배지 (갤러리) 🆕
```

## 🚀 적용 방법

### 1. 의존성 (한 번만)

```bash
cd spota-app
npx expo install react-native-svg
```

### 2. 파일 복사

```bash
# 신규: 지역 데이터
cp spota-style-export/src/constants/regions.ts \
   spota-app/src/constants/regions.ts

# 신규: 지역 컴포넌트
cp spota-style-export/src/components/RegionIcon.tsx \
   spota-app/src/components/RegionIcon.tsx
cp spota-style-export/src/components/RegionBadge.tsx \
   spota-app/src/components/RegionBadge.tsx

# (이미 적용 안 했다면)
cp spota-style-export/src/constants/theme.ts \
   spota-app/src/constants/theme.ts
cp spota-style-export/src/components/InterestIcon.tsx \
   spota-app/src/components/InterestIcon.tsx
cp spota-style-export/src/components/ActivityRing.tsx \
   spota-app/src/components/ActivityRing.tsx
```

## 🎨 RegionIcon 적용 가이드

### HomeScreen.tsx (브레드크럼·상단바)

```tsx
import RegionIcon from '../components/RegionIcon';
import { regionIconId } from '../constants/regions';

// 1) 닉네임 옆 위치 표시 (현재는 이모지 📍)
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
  <RegionIcon id={regionIconId(user.regionGu)} size={12} color={Colors.g4} />
  <Text style={styles.locText}>{getRegionLabel()}</Text>
</View>

// 2) 시/구/동 브레드크럼 칩 — 각 칩에 모노그램 추가
{REGION_LEVELS.map(({ key, label }, i) => {
  const name = key === 'si' ? currentSido
              : key === 'gu' ? currentGu
              : '동네';
  const isOn = selectedRegionLevel === key;
  const tint = key === 'si' ? '#5B21B6'
              : key === 'gu' ? Colors.warning
              : Colors.primaryD;
  return (
    <React.Fragment key={key}>
      <TouchableOpacity
        style={[styles.rcChip, isOn && styles[`rcOn${cap(key)}`]]}
        onPress={() => setRegionLevel(key)}
      >
        <RegionIcon id={regionIconId(name)} size={14} color={isOn ? tint : Colors.g3} />
        <Text style={[styles.rcText, isOn && styles[`rcText${cap(key)}`]]}>{name}</Text>
      </TouchableOpacity>
      …
    </React.Fragment>
  );
})}

// rcChip에 flexDirection: 'row', alignItems: 'center', gap: 4 추가
```

### HomeScreen.tsx (지역 카드 — `loc.icon` 이모지 교체)

```tsx
// 기존: <Text style={styles.rcIconText}>{loc.icon}</Text>
// 변경: RegionIcon으로
<RegionIcon
  id={regionIconId(loc.name)}
  size={38}
  color={loc.color}
/>
```

`styles.rcIconWrap` 자체는 제거하거나 padding만 남기세요 — RegionIcon이 background까지 그려요.

### ChatScreen.tsx (상대 정보)

```tsx
<View style={styles.peerInfo}>
  <Text style={styles.peerName}>{peer?.nick}</Text>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <RegionIcon id={regionIconId(peer.region)} size={11} color={Colors.g3} />
    <Text style={styles.peerSub}>{peer?.region} · 익명</Text>
  </View>
</View>
```

### BoardScreen.tsx (포스트 헤더)

```tsx
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
  <RegionIcon id={regionIconId(item.region)} size={11} color={Colors.g3} />
  <Text style={styles.postMeta}>{item.region} · {item.time}</Text>
</View>
```

### MyInfoScreen.tsx (프로필 위치)

```tsx
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
  <RegionIcon id={regionIconId(user.regionGu)} size={13} color={Colors.g4} />
  <Text style={styles.profLoc}>{user?.regionGu || '마포구'} {user?.regionDong || ''}</Text>
</View>
```

## 🎨 RegionBadge 적용 가이드

지역 선택 화면(시/구/동 픽커)이나 큰 헤더에 사용:

```tsx
// 가로 4열 그리드 — 지역 선택 모달
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
  {ALL_SIDO.map(sido => (
    <TouchableOpacity
      key={sido.name}
      style={{ alignItems: 'center', width: '23%' }}
      onPress={() => setSido(sido)}
    >
      <RegionBadge id={regionIconId(sido.short)} size={64} color={sido.color} />
      <Text style={{ fontSize: 12, marginTop: 6 }}>{sido.short}</Text>
    </TouchableOpacity>
  ))}
</View>
```

## 🔄 마이그레이션 노트

### data.ts의 `icon` 필드는 더 이상 사용 안 함

`SidoItem.icon`, `GuItem.icon`, `DongItem.icon`의 이모지 값은 이제 무시해도 됩니다.
`regionIconId(name)` 헬퍼가 이름 → 모노그램 ID 매핑을 자동 처리합니다.

`color`와 `bg`는 그대로 유지 — RegionIcon에 `color={loc.color}`로 넘기면 자동 tinted 처리됩니다.

### 새 지역 추가 시

새 시/도/구를 추가하려면 `src/constants/regions.ts`의 4개 테이블을 모두 업데이트:

```tsx
// regions.ts에 추가
KOREAN_MONOGRAM.새지역id = '약자',           // 한글 2글자
ENGLISH_NAME.새지역id = 'ROMAJI',            // 영문 대문자
ENGLISH_SYLLABLES.새지역id = ['ROMA', 'JI'], // 음절 분리
REGION_ICON_MAP['새지역명'] = '새지역id'     // 한글명 → ID 매핑
```

## ✅ 적용 체크리스트

- [ ] `regions.ts` 추가
- [ ] `RegionIcon.tsx`, `RegionBadge.tsx` 추가
- [ ] HomeScreen 브레드크럼에 RegionIcon
- [ ] HomeScreen 지역 카드 그리드에 RegionIcon (loc.icon 교체)
- [ ] ChatScreen 상대 정보에 RegionIcon
- [ ] BoardScreen 포스트 헤더에 RegionIcon
- [ ] MyInfoScreen 프로필 위치에 RegionIcon
- [ ] 지역 선택 모달이 있다면 RegionBadge로 grid 구성
- [ ] `npx expo start --clear` 로 캐시 초기화 후 확인
