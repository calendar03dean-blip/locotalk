// server/feeds.js
// ─────────────────────────────────────────────────────────────────────────────
// Locotalk — 동네 피드(regionFeeds) 영속화(PostgreSQL)
//
// 배경: data.json 제거 후 regionFeeds 가 인메모리만 → 서버/배포 재시작 시 피드 전부 유실.
//   region_feeds 테이블에 저장하고, 부팅 시 region별 최신 100개로 인메모리 캐시를 워밍한다.
//
// 원칙(chat.js 동일): DB가 source of truth, 인메모리는 캐시. 쓰기는 best-effort —
//   실패해도 기존 피드 흐름(브로드캐스트/표시)을 막지 않는다. 기존 소켓 계약 동일.
//
// 연동(server/index.js):
//   initDB()    → feeds.initFeedSchema(db); 워밍 feeds.loadAllForWarming(db)
//   post_feed   → feeds.insertFeed(db, {...}) + feeds.pruneRegion(db, region)
//   join_region → feeds.loadRegion(db, region) (없으면 인메모리 캐시 폴백)
//   admin 삭제  → feeds.deleteFeed(db, region, id)
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const PER_REGION_MAX = 100;

async function initFeedSchema(db) {
  if (!db) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS region_feeds (
        id         TEXT PRIMARY KEY,        -- FeedItem.id(uuid) — admin 삭제·중복방지 키
        region     TEXT NOT NULL,
        nick       TEXT,
        payload    TEXT NOT NULL,           -- JSON.stringify(FeedItem)
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_region_feeds_region ON region_feeds(region, created_at DESC);`);
    console.log('[feed] ✅ region_feeds 스키마 준비 완료');
  } catch (e) {
    console.error('[feed] initFeedSchema 실패:', e.message);
  }
}

/** 피드 1건 저장 (best-effort). item = { id, nick, interest, time, msg } */
async function insertFeed(db, { id, region, nick, item } = {}) {
  if (!db || !id || !region) return false;
  try {
    await db.query(
      `INSERT INTO region_feeds (id, region, nick, payload) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [id, region, nick || null, JSON.stringify(item || {})]
    );
    return true;
  } catch (e) {
    console.warn('[feed] insertFeed failed (best-effort):', e.message);
    return false;
  }
}

/** region당 keep 개 초과분 파기(최신순 보존) */
async function pruneRegion(db, region, keep = PER_REGION_MAX) {
  if (!db || !region) return;
  try {
    await db.query(
      `DELETE FROM region_feeds WHERE region = $1 AND id NOT IN (
         SELECT id FROM region_feeds WHERE region = $1 ORDER BY created_at DESC LIMIT $2
       )`,
      [region, keep]
    );
  } catch (e) {
    console.warn('[feed] pruneRegion failed:', e.message);
  }
}

/** admin 삭제 시 DB 동기화 */
async function deleteFeed(db, region, id) {
  if (!db || !id) return;
  try { await db.query('DELETE FROM region_feeds WHERE region = $1 AND id = $2', [region, id]); }
  catch (e) { console.warn('[feed] deleteFeed failed:', e.message); }
}

/** 부팅 워밍: region별 최신 perRegion 개 → Map(region → FeedItem[] 최신순) */
async function loadAllForWarming(db, perRegion = PER_REGION_MAX) {
  const map = new Map();
  if (!db) return map;
  try {
    const { rows } = await db.query(
      `SELECT region, payload, created_at FROM (
         SELECT region, payload, created_at,
                ROW_NUMBER() OVER (PARTITION BY region ORDER BY created_at DESC) AS rn
           FROM region_feeds
       ) t WHERE rn <= $1 ORDER BY region, created_at DESC`,
      [perRegion]
    );
    for (const r of rows) {
      let item; try { item = JSON.parse(r.payload); } catch { continue; }
      if (!map.has(r.region)) map.set(r.region, []);
      map.get(r.region).push(item);  // created_at DESC = 최신순(기존 unshift 캐시와 동일 순서)
    }
  } catch (e) {
    console.warn('[feed] loadAllForWarming failed:', e.message);
  }
  return map;
}

/** region 단건 조회(최신순 limit). 실패/없음 시 null → 호출부가 인메모리 폴백 */
async function loadRegion(db, region, limit = PER_REGION_MAX) {
  if (!db || !region) return null;
  try {
    const { rows } = await db.query(
      `SELECT payload FROM region_feeds WHERE region = $1 ORDER BY created_at DESC LIMIT $2`,
      [region, limit]
    );
    const out = [];
    for (const r of rows) { try { out.push(JSON.parse(r.payload)); } catch {} }
    return out;
  } catch (e) {
    console.warn('[feed] loadRegion failed:', e.message);
    return null;
  }
}

async function statsFeeds(db) {
  if (!db) return { count: 0, regions: 0 };
  try {
    const c = await db.query('SELECT COUNT(*)::int n, COUNT(DISTINCT region)::int r FROM region_feeds');
    return { count: c.rows[0].n, regions: c.rows[0].r };
  } catch (e) {
    return { count: 0, regions: 0, error: e.message };
  }
}

module.exports = {
  PER_REGION_MAX, initFeedSchema, insertFeed, pruneRegion, deleteFeed,
  loadAllForWarming, loadRegion, statsFeeds,
};
