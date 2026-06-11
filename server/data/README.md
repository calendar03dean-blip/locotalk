# 행정구역 경계 데이터 (매칭 region 서버 권위화 — 옵션 A)

`server/regionResolver.js` 가 좌표→행정구역(구/동)을 **오프라인 point-in-polygon**으로 역산해
무료 매칭 region 을 서버가 산출한다(클라 region 문자열 미신뢰). **외부 네트워크 호출 0 = 좌표 egress 0.**

## 파일
- `admin-boundaries.geojson` — **운영 데이터(미커밋, 배치 필요)**. 이 파일이 있어야 region 서버산출이 **활성**된다.
  없으면 `regionResolver.isLoaded()=false` → 호출부가 기존 **클라 region 폴백**(무회귀).
- `admin-boundaries.sample.geojson` — **테스트 fixture(가짜 경계)**. 운영에서 로드되지 않음(기본 경로 아님).

## 형식 (GeoJSON FeatureCollection)
```json
{ "type":"FeatureCollection", "features": [
  { "type":"Feature",
    "properties": { "gu":"강남구", "dong":"역삼동", "label":"강남구 · 역삼동" },
    "geometry": { "type":"Polygon"|"MultiPolygon", "coordinates": [...] } }  // 좌표 [lng, lat]
] }
```
- `properties.gu` 가 매칭 판정 키(같은 구 +20 / region 폴백). `SIG_KOR_NM`/`adm_nm` 등도 자동 인식.
- 좌표는 **[경도, 위도]** (GeoJSON 표준).

## 운영 적용
1. 공개 행정동 경계 GeoJSON 확보(라이선스 확인). 예: 통계청 SGIS / data.go.kr 행정구역 경계.
2. **용량관리**: 좌표 단순화(simplify, 예: mapshaper `-simplify 5%`)로 수 MB 이하 권장.
   regionResolver 는 bbox 사전필터로 조회를 가속(추가 인덱스 불필요).
3. `server/data/admin-boundaries.geojson` 로 배치(또는 `ADMIN_BOUNDARY_GEOJSON` env 로 경로 지정).
4. 재시작 → 부팅 로그 `[region] ✅ 경계 로드 — features=N` 확인. `/debug/region` 으로 상태/산출 점검.

## 서비스 대상 지역(번들 크기 결정 — PO 확인)
- 전국 vs 특정 시/도. 전국 행정동(~3,500개) simplify 시 수 MB. 구 단위면 더 작음.

## 출처 / 라이선스 (운영 데이터 `admin-boundaries.geojson`)
- **출처**: [southkorea/southkorea-maps](https://github.com/southkorea/southkorea-maps)
  `kostat/2013/json/skorea_municipalities_geo_simple.json` (통계청 KOSTAT 기반, simplify 적용).
- **단위**: 전국 시군구(구/시/군) **251 features**, ~370KB, GeoJSON `[lng, lat]` (WGS84/EPSG:4326).
- **base_year**: 2013 (각 feature `properties.base_year`). 2013 기준이라 일부 후속 행정개편(예: 군위군 대구 편입)은 미반영
  — 매칭 키가 **구 단위**라 도심 구 매칭에 실질 영향 없음.
- **properties**: `name`(한글 구명, 매칭 키), `name_eng`, `code`, `base_year`.
  regionResolver 의 gu 매핑은 `pr.gu || pr.SIG_KOR_NM || pr.adm_nm || pr.name` 로 `name` 을 인식.
- **라이선스**: 상업적 이용 가능(출처 표기 조건). 앱 내 오픈소스 고지 위치는 후속 결정.
