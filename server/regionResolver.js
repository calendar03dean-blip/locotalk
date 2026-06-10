// server/regionResolver.js
// ─────────────────────────────────────────────────────────────────────────────
// Locotalk — 좌표 → 행정구역(구/동) 오프라인 역산 (매칭 region 서버 권위화, 옵션 A)
//
// 목적: 무료 매칭의 region 을 클라 문자열 대신 '서버가 join_queue transient 좌표로 산출'.
//   region 문자열 독립 스푸핑 제거 + region↔좌표 일관성 강제.
//
// 프라이버시(불변): 외부 네트워크 호출 0 = 좌표 egress 0. 로컬 GeoJSON 파일만 읽어
//   point-in-polygon(ray casting, 내장 — 외부 라이브러리 없음). 좌표는 산출에만 쓰고 영속 0.
//
// 데이터셋: GeoJSON FeatureCollection. 각 Feature.properties = { gu, dong?, label? },
//   geometry = Polygon | MultiPolygon (좌표는 [lng, lat]).
//   경로: env ADMIN_BOUNDARY_GEOJSON 또는 기본 server/data/admin-boundaries.geojson.
//   ⚠️ 기본 경로에 파일이 '없으면' 비활성(isLoaded=false) → 호출부가 기존 클라 region 폴백(무회귀).
//      운영 활성화 = 공개 행정동 GeoJSON(라이선스 확인)을 위 경로에 배치(+ 필요시 env).
//      ⚠️ 기본 경로에 테스트 fixture(가짜 경계)를 두지 말 것 — 잘못된 region 산출 위험.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');
const path = require('path');

let _index = null;   // [{ gu, dong, label, bbox:[minX,minY,maxX,maxY], polys:[[ring,...]] }]
let _loaded = false;

function _defaultPath() {
  return process.env.ADMIN_BOUNDARY_GEOJSON || path.join(__dirname, 'data', 'admin-boundaries.geojson');
}

// geometry → polys: 각 폴리곤 = [outerRing, hole1, ...], ring = [[lng,lat], ...]
function _toPolys(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}
function _bboxOf(polys) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polys) for (const ring of poly) for (const [x, y] of ring) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/** GeoJSON 로드 + bbox 인덱스 구축. 실패/부재 시 비활성(폴백). */
function load(filePath) {
  const p = filePath || _defaultPath();
  try {
    if (!fs.existsSync(p)) {
      _loaded = false; _index = [];
      console.log(`[region] 경계 데이터 없음(${p}) — region 서버산출 비활성(클라 region 폴백)`);
      return false;
    }
    const fc = JSON.parse(fs.readFileSync(p, 'utf8'));
    const feats = (fc && fc.features) || [];
    _index = [];
    for (const f of feats) {
      const polys = _toPolys(f.geometry);
      if (!polys.length) continue;
      const pr = f.properties || {};
      _index.push({
        gu: pr.gu || pr.SIG_KOR_NM || pr.adm_nm || null,
        dong: pr.dong || pr.EMD_KOR_NM || null,
        label: pr.label || [pr.gu, pr.dong].filter(Boolean).join(' · ') || null,
        bbox: _bboxOf(polys),
        polys,
      });
    }
    _loaded = _index.length > 0;
    console.log(`[region] ${_loaded ? '✅' : '⚠️'} 경계 로드 — features=${_index.length} (${p})`);
    return _loaded;
  } catch (e) {
    _loaded = false; _index = [];
    console.error('[region] 경계 로드 실패:', e.message);
    return false;
  }
}

// ray casting: 점(x,y)이 ring 내부인지
function _pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
// 폴리곤: outer 내부 AND 어떤 hole 에도 미포함
function _pointInPoly(x, y, poly) {
  if (!poly.length || !_pointInRing(x, y, poly[0])) return false;
  for (let h = 1; h < poly.length; h++) if (_pointInRing(x, y, poly[h])) return false;
  return true;
}

/**
 * 좌표 → { gu, dong, label } | null. bbox 사전필터 후 point-in-polygon.
 * 비활성(데이터 없음)/좌표 무효 → null (호출부 폴백).
 */
function resolveRegion(lat, lng) {
  if (!_loaded || typeof lat !== 'number' || typeof lng !== 'number') return null;
  const x = lng, y = lat;   // GeoJSON 좌표는 [lng, lat]
  for (const f of _index) {
    const b = f.bbox;
    if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;   // bbox 사전필터
    for (const poly of f.polys) {
      if (_pointInPoly(x, y, poly)) return { gu: f.gu, dong: f.dong, label: f.label };
    }
  }
  return null;
}

function isLoaded() { return _loaded; }
function stats() { return { loaded: _loaded, features: _index ? _index.length : 0 }; }

load();   // 부팅 시 1회 로드(없으면 비활성)

module.exports = { load, resolveRegion, isLoaded, stats };
