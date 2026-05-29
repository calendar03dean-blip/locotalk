const { CATEGORIES: CATS_R, calcBenefit } = window.CardBData;

function ResultScreen({ amount, store, userCards, onBack, onReset }) {
  const category = store ? store.category : 'general';
  const ranked = React.useMemo(() => {
    return (userCards || [])
      .map(c => ({ card: c, ...calcBenefit(c, category, amount) }))
      .sort((a, b) => b.value - a.value);
  }, [amount, category, userCards]);

  const best   = ranked[0];
  const others = ranked.slice(1);
  const cat    = CATS_R[category];

  if (!best) return (
    <div className="h-full flex flex-col items-center justify-center px-8 text-center">
      <div className="t-h2 text-ink mb-2">등록된 카드가 없어요</div>
      <div className="t-body text-ink-2 mb-8">내 카드 탭에서 카드를 먼저 등록해주세요.</div>
      <button onClick={onBack} className="press text-accent t-body-s">← 돌아가기</button>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <button className="press text-ink-2" style={{ padding: 8 }} onClick={onBack} aria-label="뒤로">
          <Icon name="arrow-left" size={24} />
        </button>
        <button className="press text-ink-2 t-caption" style={{ padding: 8 }} onClick={onReset}>
          다시 검색
        </button>
      </div>

      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 text-ink-2 t-caption mb-2">
          <Icon name={cat.icon} size={14} />
          <span>{store ? store.name : '일반 결제'}</span>
          <span className="text-ink-3">·</span>
          <span className="tnum">{formatKRW(amount)}원</span>
        </div>
        <h1 className="t-h1 text-ink" style={{ textWrap: 'pretty' }}>
          이 카드로 결제하면<br />
          <span className="text-accent tnum">{formatKRW(best.value)}원</span> 돌려받아요
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6">
        <div className="pop-in" style={{
          background: 'var(--accent-soft)', borderRadius: 24, padding: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 16, bottom: 16, width: 4,
            background: 'var(--accent)', borderRadius: 4,
          }} />
          <div className="flex items-center justify-between">
            <Pill tone="accent">최적</Pill>
            <span className="t-caption text-ink-2">
              {best.rate > 0 ? `${Math.round(best.rate * 1000) / 10}% 혜택` : ''}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <CardArt brand={best.card.brand} short={best.card.short} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="t-caption text-ink-2">{best.card.issuer}</div>
              <div className="t-h2 text-ink truncate">{best.card.name}</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="t-caption text-ink-2 mb-1">즉시 혜택</div>
            <div className="flex items-baseline gap-2">
              <span className="t-num-hero tnum" style={{ color: 'var(--accent)' }}>
                <CountUp to={best.value} />
              </span>
              <span className="t-num-md text-ink-2">원</span>
            </div>
            <div className="t-caption text-ink-2 mt-1">{best.label}</div>
            {best.capped && (
              <div className="mt-3 flex items-center gap-2" style={{
                background: 'var(--danger-soft)', color: 'var(--danger)',
                padding: '8px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600,
              }}>
                <Icon name="flame" size={16} />
                이번 결제로 월 한도 도달
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 mb-2 px-1 flex items-center justify-between">
          <span className="t-h2 text-ink">다른 카드와 비교</span>
          <span className="t-caption text-ink-3">총 {ranked.length}장</span>
        </div>

        <div className="flex flex-col gap-2">
          {others.map((row, i) => {
            const diff = best.value - row.value;
            return (
              <div key={row.card.id} className="bg-surface shadow-card" style={{ borderRadius: 20, padding: 16 }}>
                <div className="flex items-center gap-3">
                  <div className="text-ink-3 t-caption tnum" style={{ width: 16 }}>{i + 2}</div>
                  <CardArt brand={row.card.brand} short={row.card.short} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="t-caption text-ink-3 truncate">{row.card.issuer}</div>
                    <div className="t-body-s text-ink truncate">{row.card.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="t-num-lg tnum text-ink">{formatKRW(row.value)}</div>
                    <div className="t-caption text-ink-3">
                      {diff > 0 ? `-${formatKRW(diff)}원` : '동일'}
                    </div>
                  </div>
                </div>
                {row.label && (
                  <div className="t-caption text-ink-2 mt-2" style={{ paddingLeft: 16 + 64 + 12 }}>
                    {row.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.ResultScreen = ResultScreen;
