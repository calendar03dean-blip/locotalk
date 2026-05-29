const { CARD_CATALOG, CATEGORIES: CATS_M, BENEFIT_TYPE_LABEL: BTL } = window.CardBData;

/* ─── 카드 검색 등록 시트 ───────────────────────────────────────────────── */
function CardSearchSheet({ open, onClose, userCards, setUserCards }) {
  const [q, setQ] = React.useState('');
  const registeredIds = React.useMemo(() => new Set(userCards.map(c => c.id)), [userCards]);

  React.useEffect(() => { if (!open) setQ(''); }, [open]);

  const results = React.useMemo(() => {
    const lq = q.toLowerCase().trim();
    if (!lq) return CARD_CATALOG;
    return CARD_CATALOG.filter(c =>
      c.issuer.toLowerCase().includes(lq) ||
      c.name.toLowerCase().includes(lq)   ||
      (c.tags    || []).some(t => t.toLowerCase().includes(lq)) ||
      (c.aliases || []).some(a => a.toLowerCase().includes(lq))
    );
  }, [q]);

  /* 발급사별로 그룹핑 (검색 중일 때는 그냥 flat) */
  const grouped = React.useMemo(() => {
    if (q.trim()) return [{ issuer: null, cards: results }];
    const map = {};
    results.forEach(c => {
      if (!map[c.issuer]) map[c.issuer] = [];
      map[c.issuer].push(c);
    });
    return Object.entries(map).map(([issuer, cards]) => ({ issuer, cards }));
  }, [results, q]);

  const addCard = (card) => {
    if (registeredIds.has(card.id)) return;
    const maxCap = Object.values(card.benefits || {})
      .reduce((m, b) => Math.max(m, b.cap || 0), 0);
    setUserCards(prev => [...prev, { ...card, spent: 0, capTotal: maxCap || 30000 }]);
  };

  const topTags = (card) => (card.tags || []).slice(0, 2);

  return (
    <Sheet open={open} onClose={onClose} title="카드 검색 · 등록" height="92%">
      {/* 검색 입력창 */}
      <div className="px-5 pb-3">
        <div
          className="flex items-center gap-3 ring-accent"
          style={{ height: 52, borderRadius: 14, background: 'var(--surface-2)', padding: '0 14px' }}
        >
          <Icon name="search" size={20} className="text-ink-2" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="카드 이름 · 카드사 · 혜택 검색"
            className="flex-1 bg-transparent outline-none t-body text-ink"
            style={{ color: 'var(--ink)' }}
          />
          {q && (
            <button className="press text-ink-3" onClick={() => setQ('')} style={{ padding: 4 }}>
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
        <div className="t-caption text-ink-3 mt-2">
          {q ? `${results.length}개 카드 검색됨` : `전체 ${CARD_CATALOG.length}개 카드 · 14개 카드사`}
        </div>
      </div>

      {/* 결과 목록 */}
      <div className="overflow-y-auto no-scrollbar pb-8" style={{ height: 'calc(100% - 108px)' }}>
        {results.length === 0 && (
          <div className="text-center text-ink-3 t-body py-16">검색 결과가 없어요</div>
        )}
        {grouped.map(({ issuer, cards }) => (
          <div key={issuer || '_search'}>
            {issuer && (
              <div className="px-5 pt-5 pb-2 t-caption"
                style={{ color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '.04em' }}>
                {issuer}
              </div>
            )}
            <div className="px-3 flex flex-col gap-1">
              {cards.map(card => {
                const already = registeredIds.has(card.id);
                return (
                  <button
                    key={card.id}
                    onClick={() => addCard(card)}
                    disabled={already}
                    className="press w-full flex items-center gap-3"
                    style={{
                      padding: '12px 14px', borderRadius: 16, textAlign: 'left',
                      background: already ? 'transparent' : 'var(--surface)',
                      opacity: already ? 0.55 : 1,
                      border: already ? '1px solid var(--line)' : '1px solid transparent',
                      boxShadow: already ? 'none' : 'var(--shadow-card)',
                      transition: 'opacity 200ms ease',
                    }}
                  >
                    <CardArt brand={card.brand} short={card.short} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="t-body-s text-ink truncate">{card.name}</span>
                        {card.annual === 0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                            background: 'var(--success-soft)', color: 'var(--success)',
                          }}>연회비 없음</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {topTags(card).map(t => (
                          <span key={t} style={{
                            fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                            background: 'var(--accent-soft)', color: 'var(--accent)',
                          }}>{t}</span>
                        ))}
                        {card.annual > 0 && (
                          <span style={{
                            fontSize: 11, fontWeight: 500, color: 'var(--ink-3)',
                          }}>연회비 {formatKRW(card.annual)}원</span>
                        )}
                      </div>
                    </div>
                    {already ? (
                      <div style={{
                        width: 32, height: 32, borderRadius: 999, flexShrink: 0,
                        background: 'var(--success-soft)', color: 'var(--success)',
                        display: 'grid', placeItems: 'center',
                      }}>
                        <Icon name="check" size={16} stroke={2.4} />
                      </div>
                    ) : (
                      <div style={{
                        width: 32, height: 32, borderRadius: 999, flexShrink: 0,
                        background: 'var(--surface-2)', color: 'var(--ink-2)',
                        display: 'grid', placeItems: 'center',
                      }}>
                        <Icon name="plus" size={18} stroke={2.2} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/* ─── 내 카드 메인 화면 ─────────────────────────────────────────────────── */
function MyCardsScreen({ userCards, setUserCards }) {
  const [addOpen, setAddOpen]         = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState(null);

  const totalEarned = userCards.reduce((s, c) => s + (c.spent || 0), 0);
  const totalCap    = userCards.reduce((s, c) => s + (c.capTotal || 0), 0);

  const removeCard = (id) => {
    setUserCards(prev => prev.filter(c => c.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="px-5 pt-4 pb-1 flex items-center justify-between">
        <h1 className="t-h1 text-ink">내 카드</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="press flex items-center gap-1"
          style={{
            height: 34, padding: '0 14px', borderRadius: 999,
            background: 'var(--ink)', color: 'var(--bg)',
            fontSize: 13, fontWeight: 700,
          }}
        >
          <Icon name="plus" size={15} stroke={2.4} />
          <span>카드 추가</span>
        </button>
      </div>

      {/* 이번 달 요약 */}
      {userCards.length > 0 && (
        <div className="px-5 pt-2">
          <div className="t-caption text-ink-2">이번 달 받은 혜택</div>
          <div className="flex items-baseline gap-2">
            <span className="t-num-hero tnum text-ink">
              <CountUp to={totalEarned} />
            </span>
            <span className="t-num-md text-ink-2">원</span>
          </div>
          {totalCap > 0 && (
            <div className="t-caption text-ink-3 mt-1 tnum">
              전체 한도 {formatKRW(totalCap)}원 중 {Math.round((totalEarned / totalCap) * 100)}% 사용
            </div>
          )}
        </div>
      )}

      {/* 카드 목록 */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-5 pb-6">
        {userCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'var(--surface-2)', color: 'var(--ink-3)',
              display: 'grid', placeItems: 'center', marginBottom: 16,
            }}>
              <Icon name="card" size={28} />
            </div>
            <div className="t-h2 text-ink mb-2">등록된 카드가 없어요</div>
            <div className="t-body text-ink-2 mb-6">카드를 추가하면 결제마다 최적 혜택을 알려드려요.</div>
            <button
              onClick={() => setAddOpen(true)}
              className="press"
              style={{
                height: 48, padding: '0 28px', borderRadius: 14,
                background: 'var(--ink)', color: 'var(--bg)',
                fontWeight: 700, fontSize: 15,
              }}
            >카드 검색해서 추가하기</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {userCards.map((c, idx) => {
              const ratio = c.capTotal > 0 ? (c.spent || 0) / c.capTotal : 0;
              const tone  = ratio >= .9 ? 'danger' : ratio >= .7 ? 'accent' : 'success';
              const main  = Object.entries(c.benefits || {})
                .filter(([k, v]) => v.rate && k !== 'general')
                .slice(0, 2)
                .map(([k]) => CATS_M[k]?.label || k);

              return (
                <div
                  key={c.id}
                  className="bg-surface shadow-card"
                  style={{ borderRadius: 20, padding: 18, animation: `slide-in-right 360ms cubic-bezier(.22,.61,.36,1) ${idx * 50}ms both` }}
                >
                  <div className="flex items-start gap-3">
                    <CardArt brand={c.brand} short={c.short} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="t-caption text-ink-3">{c.issuer}</div>
                      <div className="t-body-s text-ink truncate">{c.name}</div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {main.length === 0 && <Pill tone="neutral">전 가맹점</Pill>}
                        {main.map(m => <Pill key={m} tone="neutral">{m}</Pill>)}
                      </div>
                    </div>
                    {/* 삭제 버튼 */}
                    {deleteConfirm === c.id ? (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => removeCard(c.id)}
                          className="press"
                          style={{
                            height: 28, padding: '0 10px', borderRadius: 8,
                            background: 'var(--danger)', color: '#fff',
                            fontSize: 11, fontWeight: 700,
                          }}
                        >삭제</button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="press"
                          style={{
                            height: 28, padding: '0 8px', borderRadius: 8,
                            background: 'var(--surface-2)', color: 'var(--ink-2)',
                            fontSize: 11, fontWeight: 600,
                          }}
                        >취소</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(c.id)}
                        className="press text-ink-3"
                        style={{ padding: 6, flexShrink: 0 }}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    )}
                  </div>

                  {c.capTotal > 0 && (
                    <>
                      <div className="mt-4 flex items-baseline justify-between">
                        <div>
                          <div className="t-caption text-ink-2">이번 달 받음</div>
                          <div className="flex items-baseline gap-1">
                            <span className="t-num-lg tnum text-ink">{formatKRW(c.spent || 0)}</span>
                            <span className="t-caption text-ink-2">원</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="t-caption text-ink-3">한도</div>
                          <div className="t-body-s tnum text-ink-2">{formatKRW(c.capTotal)}원</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Progress value={c.spent || 0} max={c.capTotal} tone={tone} />
                        <div className="flex justify-between mt-2">
                          <span className="t-caption" style={{
                            color: `var(--${tone === 'success' ? 'success' : tone === 'danger' ? 'danger' : 'accent'})`,
                          }}>
                            {tone === 'danger' ? '한도 임박' : tone === 'accent' ? '한도 70% 도달' : '여유 있음'}
                          </span>
                          <span className="t-caption text-ink-3 tnum">
                            {formatKRW(c.capTotal - (c.spent || 0))}원 남음
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* 추가 버튼 (목록 하단) */}
            <button
              onClick={() => setAddOpen(true)}
              className="press flex items-center justify-center gap-2"
              style={{
                height: 64, borderRadius: 20,
                background: 'transparent',
                border: '1.5px dashed var(--line)',
                color: 'var(--ink-2)', fontWeight: 600, fontSize: 15,
              }}
            >
              <Icon name="search" size={18} stroke={2} />
              <span>카드 검색해서 추가</span>
            </button>
          </div>
        )}
      </div>

      {/* 카드 검색 시트 */}
      <CardSearchSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        userCards={userCards}
        setUserCards={setUserCards}
      />
    </div>
  );
}

window.CardSearchSheet = CardSearchSheet;
window.MyCardsScreen = MyCardsScreen;
