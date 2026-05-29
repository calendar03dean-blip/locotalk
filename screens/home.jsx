const { useState: useStateH, useEffect: useEffectH, useMemo: useMemoH } = React;
const { STORES, CATEGORIES, CARDS: CARDS_H, CARD_CATALOG, calcBenefit: calcBenefitH, BENEFIT_TYPE_LABEL: TYPE_LBL } = window.CardBData;

function TypeTag({ type }) {
  if (!type) return null;
  const tone = type === 'cashback' ? { bg: 'var(--success-soft)', fg: 'var(--success)' }
            : type === 'point'    ? { bg: 'var(--accent-soft)',  fg: 'var(--accent)'  }
            :                        { bg: 'var(--surface-2)',   fg: 'var(--ink-2)'   };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '.02em',
      padding: '2px 6px', borderRadius: 4,
      background: tone.bg, color: tone.fg,
      flexShrink: 0, lineHeight: 1.2,
    }}>{TYPE_LBL[type]}</span>
  );
}

function BenefitPreview({ amount, category, userCards }) {
  const ranked = useMemoH(() => {
    const pool = userCards && userCards.length > 0 ? userCards : CARD_CATALOG;
    return pool
      .map((c) => ({ card: c, ...calcBenefitH(c, category, amount) }))
      .sort((a, b) => b.value - a.value);
  }, [amount, category, userCards]);
  const top = ranked.slice(0, 3);
  const bestVal = top[0]?.value || 0;
  return (
    <div key={category} className="mt-3 subtle-in">
      <div className="t-caption text-ink-3 mb-2" style={{ fontWeight: 600 }}>이 금액 예상 혜택</div>
      <div className="flex flex-col gap-2">
        {top.map((row, i) => {
          const isBest = row.value > 0 && row.value === bestVal && i === 0;
          return (
            <div key={row.card.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <TypeTag type={row.type} />
                <span
                  className="t-caption truncate"
                  style={{
                    color: isBest ? 'var(--ink)' : 'var(--ink-2)',
                    fontWeight: isBest ? 700 : 500
                  }}>
                  {row.card.issuer} {row.card.name}
                </span>
              </div>
              <span
                className="t-caption tnum"
                style={{
                  color: isBest ? 'var(--accent)' : 'var(--ink-3)',
                  fontWeight: isBest ? 800 : 600,
                  transition: 'color 200ms ease',
                  flexShrink: 0
                }}>
                {row.value > 0 ? `+${formatKRW(row.value)}원` : '·'}
              </span>
            </div>);

        })}
      </div>
    </div>);

}

function HomeScreen({ amount, setAmount, store, setStore, onSubmit, userCards }) {
  const [searchOpen, setSearchOpen] = useStateH(false);
  const [q, setQ] = useStateH('');

  const pressKey = (k) => {
    if (k === 'back') {
      setAmount((prev) => prev.slice(0, -1));
      return;
    }
    if (k === '00') {
      if (amount === '' || amount === '0') return;
      const next = (amount + '00').slice(0, 10);
      setAmount(next);
      return;
    }
    if (amount === '0') {setAmount(k);return;}
    if (amount.length >= 9) return;
    setAmount(amount + k);
  };

  const filtered = useMemoH(() => {
    if (!q) return STORES;
    return STORES.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  }, [q]);

  const amt = Number(amount || 0);
  const ready = amt > 0;

  return (
    <div className="h-full flex flex-col">
      {/* top brand bar */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--ink)', color: 'var(--bg)',
            display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14
          }}>C</div>
          <span className="t-body-s text-ink">CardB</span>
        </div>
        <button className="press text-ink-2" style={{ padding: 6 }} aria-label="알림">
          <Icon name="bell" size={22} />
        </button>
      </div>

      {/* amount input */}
      <div className="px-5 pt-2">
        <div className="flex items-center justify-between mb-2">
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.01em' }}>결제할 금액</div>
          <button
            onClick={() => setAmount('')}
            className="press flex items-center gap-1"
            style={{
              height: 28, padding: '0 10px', borderRadius: 999,
              background: 'var(--surface-2)', color: 'var(--ink-2)',
              fontSize: 12, fontWeight: 600,
              opacity: ready ? 1 : 0,
              pointerEvents: ready ? 'auto' : 'none',
              transition: 'opacity 200ms ease'
            }}>
            <Icon name="x" size={14} stroke={2.2} />
            <span>지우기</span>
          </button>
        </div>
        <div className="flex items-baseline gap-2 justify-end" style={{ textAlign: "right" }}>
          <span
            className="t-num-hero tnum"
            style={{ color: ready ? 'var(--ink)' : 'var(--ink-3)', transition: 'color 200ms ease' }}>
            {formatKRW(amt)}</span>
          <span className="t-num-md text-ink-2" style={{ fontWeight: 700 }}>원</span>
        </div>
      </div>

      {/* store search */}
      <div className="px-5 mt-5">
        <button
          onClick={() => setSearchOpen(true)}
          className="press w-full flex items-center gap-3"
          style={{
            height: 56, borderRadius: 16, padding: '0 16px',
            background: 'var(--surface-2)', color: store ? 'var(--ink)' : 'var(--ink-3)',
            transition: 'background 200ms ease'
          }}>
          
          <Icon name="search" size={20} className="text-ink-2" />
          <span className="t-body-s text-left flex-1" style={{ color: store ? 'var(--ink)' : 'var(--ink-3)' }}>
            {store ? store.name : '가게 이름 검색 (선택)'}
          </span>
          {store &&
          <span
            onClick={(e) => {e.stopPropagation();setStore(null);}}
            className="press text-ink-2"
            style={{ padding: 4 }}>
            <Icon name="x" size={18} /></span>
          }
        </button>
        {store &&
        <div className="mt-2 flex items-center gap-1 text-ink-2 t-caption pop-in">
            <Icon name={CATEGORIES[store.category].icon} size={14} />
            <span>{CATEGORIES[store.category].label} 카테고리로 자동 인식</span>
          </div>
        }
        {ready && amt >= 1000 &&
        <BenefitPreview amount={amt} category={store ? store.category : 'general'} userCards={userCards} />
        }
      </div>

      <div className="flex-1" style={{ minHeight: 8 }} />

      {/* keypad */}
      <div className="px-3 pb-3">
        <div className="grid grid-cols-3" style={{ gap: 6 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'].map((k) =>
          <button
            key={k}
            onClick={() => pressKey(k)}
            className="press"
            style={{
              height: 60, borderRadius: 18,
              background: 'transparent', color: 'var(--ink)',
              fontSize: 24, fontWeight: 600,
              display: 'grid', placeItems: 'center'
            }}>
            
              {k === 'back' ? <Icon name="backspace" size={24} stroke={2} className="text-ink-2" /> : k}
            </button>
          )}
        </div>

        <div className="px-2 pt-3">
          <PrimaryButton onClick={onSubmit} disabled={!ready} icon="arrow-right">
            {ready ? `${formatKRW(amt)}원 추천받기` : '금액을 입력하세요'}
          </PrimaryButton>
        </div>
      </div>

      <Sheet open={searchOpen} onClose={() => setSearchOpen(false)} title="가게 검색">
        <div className="px-5 pt-1 pb-3">
          <div
            className="flex items-center gap-3 ring-accent"
            style={{ height: 52, borderRadius: 14, background: 'var(--surface-2)', padding: '0 14px' }}>
            
            <Icon name="search" size={20} className="text-ink-2" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="예: 스타벅스, 이마트24"
              className="flex-1 bg-transparent outline-none t-body text-ink"
              style={{ color: 'var(--ink)' }} />
            
          </div>
        </div>
        <div className="px-2 pb-6">
          {filtered.length === 0 && q.trim() && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="t-body text-ink-3">'{q}' 가게를 찾을 수 없어요</div>
              <div className="t-caption text-ink-3">직접 카테고리를 선택해서 추천받으세요</div>
              <div className="flex flex-col gap-1 w-full px-2 mt-2">
                {Object.entries(CATEGORIES).filter(([k]) => k !== 'general').map(([k, cat]) => (
                  <button
                    key={k}
                    onClick={() => { setStore({ name: q.trim(), category: k, sub: cat.label }); setSearchOpen(false); setQ(''); }}
                    className="press w-full flex items-center gap-3"
                    style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--surface-2)' }}
                  >
                    <Icon name={cat.icon} size={18} className="text-ink-2" />
                    <span className="t-body text-ink">{cat.label}으로 검색</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {filtered.map((s) => {
            const cat = CATEGORIES[s.category];
            return (
              <button
                key={s.name}
                onClick={() => {setStore(s);setSearchOpen(false);setQ('');}}
                className="press w-full flex items-center gap-3"
                style={{ padding: '14px 16px', borderRadius: 12 }}>

                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'var(--surface-2)', color: 'var(--ink-2)',
                  display: 'grid', placeItems: 'center'
                }}>
                  <Icon name={cat.icon} size={20} />
                </div>
                <div className="flex-1 text-left">
                  <div className="t-body-s text-ink">{s.name}</div>
                  <div className="t-caption text-ink-3">{s.sub}</div>
                </div>
              </button>);

          })}
        </div>
      </Sheet>
    </div>);

}

window.HomeScreen = HomeScreen;